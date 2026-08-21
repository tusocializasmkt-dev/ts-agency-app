import { httpsCallable } from 'firebase/functions';
import { functionsClient } from './client';
import type { UserRole } from '../../types';

interface InternalLoginResult { customToken: string; role: UserRole; profile: { uid: string; displayName: string; brandId?: string } }
export const callInternalLogin = async (email: string, password: string) => (await httpsCallable<{ email: string; password: string }, InternalLoginResult>(functionsClient, 'internalLogin')({ email, password })).data;
export const callSetInternalCredential = async (data: { uid: string; email: string; password: string; role: UserRole; active: boolean }) => (await httpsCallable<typeof data, { uid: string; email: string; role: UserRole; active: boolean }>(functionsClient, 'setInternalCredential')(data)).data;
export const callCreateClientAccess = async (data: { brandId: string; email: string; password: string; active: boolean }) => (await httpsCallable<typeof data, { uid: string; email: string; active: boolean }>(functionsClient, 'createClientAccess')(data)).data;
export const callCreateClientWithAccess = async (data: { brand: Record<string, unknown>; email: string; password: string; active: boolean }) => (await httpsCallable<typeof data, { uid: string; email: string; active: boolean }>(functionsClient, 'createClientWithAccess')(data)).data;
export const callResetClientPassword = async (brandId: string, password: string) => (await httpsCallable<{ brandId: string; password: string }, { updated: boolean }>(functionsClient, 'resetClientPassword')({ brandId, password })).data;
export const callSetClientAccessStatus = async (brandId: string, active: boolean) => (await httpsCallable<{ brandId: string; active: boolean }, { active: boolean }>(functionsClient, 'setClientAccessStatus')({ brandId, active })).data;
