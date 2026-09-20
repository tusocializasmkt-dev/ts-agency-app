import { callManageAccess, type AccessCommand, type AccessKind } from '../data/functions/access.functions';
export const listAdministrators = async () => (await callManageAccess({ kind: 'admin', action: 'list' })).profiles ?? [];
export const loadAccess = async (kind: AccessKind, uid: string) => (await callManageAccess({ kind, action: 'get', uid })).profile!;
export const changeAccess = (command: AccessCommand) => callManageAccess(command);
