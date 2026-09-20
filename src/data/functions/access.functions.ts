import { httpsCallable } from 'firebase/functions';
import { functionsClient } from './client';
export type AccessKind = 'admin' | 'team' | 'client';
export interface AccessProfile { uid: string; email: string; displayName: string; active: boolean; exists: boolean }
export interface AccessCommand { kind: AccessKind; action: 'list' | 'get' | 'create' | 'update' | 'password' | 'status' | 'remove'; uid?: string; email?: string; displayName?: string; password?: string; active?: boolean }
export const callManageAccess = async (command: AccessCommand) => (await httpsCallable<AccessCommand, { profiles?: AccessProfile[]; profile?: AccessProfile; uid?: string }>(functionsClient, 'manageUserAccess')(command)).data;
