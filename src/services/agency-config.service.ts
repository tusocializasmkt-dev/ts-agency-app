import { updateAgencyConfig } from '../data/repositories';
import { validatePaymentSettings } from '../invoices/payment-settings';
export { subscribeToAgencyConfig as watchAgencyConfig } from '../data/repositories';
export const saveAgencyConfig = (config: Parameters<typeof updateAgencyConfig>[0]) => {
  validatePaymentSettings(config);
  return updateAgencyConfig(config);
};
