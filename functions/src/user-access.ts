export interface ClientAccessInput { brandId: string; email: string; password: string; active: boolean; }
export interface ClientAccessDependencies {
  brandExists(brandId: string): Promise<boolean>;
  createUser(data: { uid: string; email: string; password: string; disabled: boolean }): Promise<void>;
  updatePassword(uid: string, password: string): Promise<void>;
  updateDisabled(uid: string, disabled: boolean): Promise<void>;
  revokeRefreshTokens(uid: string): Promise<void>;
  updateBrand(brandId: string, data: Record<string, unknown>): Promise<void>;
}
export interface ClientWithAccessDependencies {
  createUser(data: { uid: string; email: string; password: string; disabled: boolean }): Promise<void>;
  createBrand(uid: string, data: Record<string, unknown>): Promise<void>;
  deleteUser(uid: string): Promise<void>;
}
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (input: ClientAccessInput) => ({ ...input, brandId: input.brandId.trim(), email: input.email.trim().toLowerCase() });
const validate = (input: ClientAccessInput) => { const data = clean(input); if (!data.brandId || !emailPattern.test(data.email) || data.password.length < 6) throw new Error('invalid-access-data'); return data; };
export async function assertAdminAccess(uid: string | undefined, adminExists: (uid: string) => Promise<boolean>) { if (!uid || !await adminExists(uid)) throw new Error('permission-denied'); }
export async function createClientWithAccess(uid: string, input: ClientAccessInput & { brand: Record<string, unknown> }, dependencies: ClientWithAccessDependencies) { const data = validate(input); if (!uid) throw new Error('invalid-access-data'); await dependencies.createUser({ uid, email: data.email, password: data.password, disabled: !data.active }); try { await dependencies.createBrand(uid, { ...input.brand, email: data.email, login: data.email, status: data.active ? 'active' : 'suspended', accessEnabled: data.active }); } catch (error) { await dependencies.deleteUser(uid).catch(() => undefined); throw error; } return { uid, email: data.email, active: data.active }; }
export async function createClientAccess(input: ClientAccessInput, dependencies: ClientAccessDependencies) { const data = validate(input); if (!await dependencies.brandExists(data.brandId)) throw new Error('brand-not-found'); await dependencies.createUser({ uid: data.brandId, email: data.email, password: data.password, disabled: !data.active }); await dependencies.updateBrand(data.brandId, { email: data.email, accessEnabled: data.active, updatedAt: new Date() }); return { uid: data.brandId, email: data.email, active: data.active }; }
export async function resetClientPassword(brandId: string, password: string, dependencies: ClientAccessDependencies) { if (!brandId.trim() || password.length < 6) throw new Error('invalid-access-data'); await dependencies.updatePassword(brandId.trim(), password); }
export async function setClientAccessStatus(brandId: string, active: boolean, dependencies: ClientAccessDependencies) { if (!brandId.trim()) throw new Error('invalid-access-data'); const uid = brandId.trim(); await dependencies.updateDisabled(uid, !active); if (!active) await dependencies.revokeRefreshTokens(uid); await dependencies.updateBrand(uid, { accessEnabled: active, status: active ? 'active' : 'suspended', updatedAt: new Date() }); }
