import type { Brand } from '../types';
import { createBrand, getBrandById, subscribeToBrands, updateBrand, updateClientEditableFields, type ClientEditableBrandFields } from '../data/repositories';

export const watchBrands = subscribeToBrands;
export const loadBrand = getBrandById;
export const saveBrand = (id: string, data: Partial<Brand>) => updateBrand(id, data);
export const addBrand = createBrand;
export const saveClientProfile = (id: string, data: ClientEditableBrandFields) => updateClientEditableFields(id, data);
