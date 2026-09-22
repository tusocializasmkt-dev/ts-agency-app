export type AccessKind = 'admin' | 'team' | 'client';
export type AccessAction = 'list' | 'get' | 'create' | 'update' | 'password' | 'status' | 'remove';
export interface AccessCommand { kind: AccessKind; action: AccessAction; uid?: string; email?: string; displayName?: string; password?: string; active?: boolean }
export interface AccessProfile { uid: string; email: string; displayName: string; active: boolean; exists: boolean }
export interface AccessManagementDependencies {
  authorize(actor: string): Promise<void>;
  listAdmins(): Promise<AccessProfile[]>;
  profile(kind: AccessKind, uid: string): Promise<AccessProfile>;
  createAdmin(email: string, displayName: string, password: string): Promise<string>;
  updateAuth(uid: string, data: { email?: string; displayName?: string; password?: string; disabled?: boolean }): Promise<void>;
  writeProfile(kind: AccessKind, uid: string, data: Record<string, unknown>): Promise<void>;
  block(kind: AccessKind, uid: string, actor: string): Promise<void>;
  removeAuth(uid: string): Promise<void>;
  removeProfile(kind: AccessKind, uid: string): Promise<void>;
  revoke(uid: string): Promise<void>;
  claims(kind: AccessKind, uid: string, active: boolean): Promise<void>;
}
export async function manageAccess(actor: string, command: AccessCommand, deps: AccessManagementDependencies) {
  await deps.authorize(actor);
  if (!command || typeof command !== 'object') throw new Error('invalid-access-command');
  const { kind, action } = command;
  if (!['admin', 'team', 'client'].includes(kind) || !['list', 'get', 'create', 'update', 'password', 'status', 'remove'].includes(action)) throw new Error('invalid-access-command');
  if (action === 'list') { if (kind !== 'admin') throw new Error('invalid-access-command'); return { profiles: await deps.listAdmins() }; }
  const email = typeof command.email === 'string' ? command.email.trim().toLowerCase() : undefined;
  const displayName = typeof command.displayName === 'string' ? command.displayName.trim() : undefined;
  if (action === 'create' || action === 'update') {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !displayName || displayName.length > 100) throw new Error('invalid-access-command');
  }
  if (action === 'create' || action === 'password') if (typeof command.password !== 'string' || command.password.length < 10 || command.password.length > 128) throw new Error('invalid-access-password');
  if (action === 'create') {
    if (kind !== 'admin') throw new Error('invalid-access-command');
    return { uid: await deps.createAdmin(email!, displayName!, command.password!) };
  }
  const uid = command.uid;
  if (typeof uid !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid)) throw new Error('invalid-access-command');
  const profile = await deps.profile(kind, uid);
  if (action === 'get') return { profile };
  if (!profile.exists && action !== 'remove') throw new Error('access-not-found');
  if (action === 'remove' || (action === 'status' && command.active === false)) {
    if (uid === actor) throw new Error('self-access-removal');
    // Block in Firestore first: a partial failure must never reopen access.
    await deps.block(kind, uid, actor);
    if (profile.exists) {
      await deps.updateAuth(uid, { disabled: true });
      await deps.claims(kind, uid, false);
      await deps.revoke(uid);
      if (action === 'remove') await deps.removeAuth(uid);
    }
    if (action === 'remove') await deps.removeProfile(kind, uid);
    return { updated: true };
  }
  if (action === 'status') {
    if (command.active !== true) throw new Error('invalid-access-command');
    await deps.updateAuth(uid, { disabled: false });
    await deps.claims(kind, uid, true);
    await deps.writeProfile(kind, uid, kind === 'client' ? { accessEnabled: true } : { active: true });
  } else if (action === 'password') {
    await deps.updateAuth(uid, { password: command.password });
    await deps.revoke(uid);
  } else if (action === 'update') {
    await deps.updateAuth(uid, { email, displayName });
    await deps.writeProfile(kind, uid, kind === 'client' ? { login: email, accessDisplayName: displayName } : { email, displayName });
    await deps.revoke(uid);
  }
  return { updated: true };
}
