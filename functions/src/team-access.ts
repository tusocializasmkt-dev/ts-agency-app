export type TeamRole = 'manager' | 'social_media';
export interface TeamMemberInput { uid?: string; displayName: string; email: string; role: TeamRole; active: boolean; brandIds: string[]; password?: string }
export interface TeamAccessDependencies {
  brandExists(id: string): Promise<boolean>;
  createUser(data: { email: string; password: string; displayName: string; disabled: boolean }): Promise<{ uid: string }>;
  updateUser(uid: string, data: { displayName?: string; disabled?: boolean; password?: string }): Promise<void>;
  deleteUser(uid: string): Promise<void>;
  revokeTokens(uid: string): Promise<void>;
  setClaims(uid: string, claims: Record<string, unknown>): Promise<void>;
  createMember(uid: string, data: Record<string, unknown>): Promise<void>;
  updateMember(uid: string, data: Record<string, unknown>): Promise<void>;
}
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateTeamInput(input: TeamMemberInput, creating: boolean) {
  const displayName = input.displayName?.trim(); const email = input.email?.trim().toLowerCase();
  const role = input.role; const brandIds = [...new Set((input.brandIds ?? []).map(String).map(id => id.trim()).filter(Boolean))];
  if (!displayName || displayName.length > 100 || !emailPattern.test(email) || !['manager', 'social_media'].includes(role) || brandIds.length > 30 || (creating && (input.password?.length ?? 0) < 10)) throw new Error('invalid-team-data');
  return { displayName, email, role, active: input.active !== false, brandIds, password: input.password };
}
async function assertBrands(ids: string[], deps: TeamAccessDependencies) { if (!(await Promise.all(ids.map(id => deps.brandExists(id)))).every(Boolean)) throw new Error('brand-not-found'); }
const claims = (data: { role: TeamRole; active: boolean; brandIds: string[] }) => ({ teamRole: data.role, teamActive: data.active, brandIds: data.brandIds });
export async function createTeamMember(input: TeamMemberInput, createdBy: string, deps: TeamAccessDependencies) {
  const data = validateTeamInput(input, true); await assertBrands(data.brandIds, deps);
  const user = await deps.createUser({ email: data.email, password: data.password!, displayName: data.displayName, disabled: !data.active });
  try { await deps.setClaims(user.uid, claims(data)); await deps.createMember(user.uid, { uid: user.uid, displayName: data.displayName, email: data.email, role: data.role, active: data.active, brandIds: data.brandIds, createdBy }); }
  catch (error) { await deps.deleteUser(user.uid).catch(() => undefined); throw error; }
  return { uid: user.uid, email: data.email };
}
export async function updateTeamMember(input: TeamMemberInput, deps: TeamAccessDependencies) {
  if (!input.uid) throw new Error('invalid-team-data'); const data = validateTeamInput(input, false); await assertBrands(data.brandIds, deps);
  await deps.updateUser(input.uid, { displayName: data.displayName, disabled: !data.active });
  await deps.setClaims(input.uid, claims(data));
  await deps.updateMember(input.uid, { displayName: data.displayName, email: data.email, role: data.role, active: data.active, brandIds: data.brandIds });
  await deps.revokeTokens(input.uid); return { uid: input.uid };
}
export async function resetTeamPassword(uid: string, password: string, deps: TeamAccessDependencies) { if (!uid || password.length < 10) throw new Error('invalid-team-data'); await deps.updateUser(uid, { password }); await deps.revokeTokens(uid); }
