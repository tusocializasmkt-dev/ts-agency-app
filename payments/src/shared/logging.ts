import { logger } from 'firebase-functions';

export const financialLog = (event: string, context: Record<string, string | number | boolean | undefined>) => logger.info(event, context);
export const financialError = (event: string, context: Record<string, string | number | boolean | undefined>) => logger.error(event, context);
