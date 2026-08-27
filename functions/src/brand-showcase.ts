export interface BrandShowcaseProjection {
  displayName: string;
  visible: boolean;
  logoUrl?: string;
}

const cleanText = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export function buildBrandShowcaseProjection(brand: Record<string, unknown>): BrandShowcaseProjection {
  const displayName = cleanText(brand.tradeName) || cleanText(brand.name) || 'Marca';
  const logoUrl = cleanText(brand.logoUrl);
  return {
    displayName,
    visible: brand.showcaseVisible !== false,
    ...(logoUrl ? { logoUrl } : {}),
  };
}

export interface BrandShowcaseWriter {
  upsert: (brandId: string, projection: BrandShowcaseProjection) => Promise<void>;
  remove: (brandId: string) => Promise<void>;
}

export async function synchronizeBrandShowcase(brandId: string, brand: Record<string, unknown> | null, writer: BrandShowcaseWriter): Promise<void> {
  if (!brand) return writer.remove(brandId);
  return writer.upsert(brandId, buildBrandShowcaseProjection(brand));
}
