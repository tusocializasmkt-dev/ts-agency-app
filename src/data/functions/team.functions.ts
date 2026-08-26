import { httpsCallable } from 'firebase/functions'; import { functionsClient } from './client'; import type { TeamRole } from '../../types';
export interface TeamMemberCommand { uid?: string; displayName: string; email: string; role: TeamRole; active: boolean; brandIds: string[]; password?: string }
export const callCreateTeamMember = async (data: TeamMemberCommand) => (await httpsCallable<TeamMemberCommand, { uid: string; email: string }>(functionsClient, 'createTeamMember')(data)).data;
export const callUpdateTeamMember = async (data: TeamMemberCommand) => (await httpsCallable<TeamMemberCommand, { uid: string }>(functionsClient, 'updateTeamMember')(data)).data;
export const callResetTeamMemberPassword = async (uid: string, password: string) => (await httpsCallable<{ uid: string; password: string }, { updated: boolean }>(functionsClient, 'resetTeamMemberPassword')({ uid, password })).data;
