// Explicit allowlists: newly introduced billing fields never leak to the team.
const brandFields = ['name', 'tradeName', 'status', 'logoUrl', 'segment', 'description', 'city', 'state', 'responsible', 'email', 'phone', 'whatsapp', 'website', 'socialLinks', 'brandColors', 'identityNotes', 'targetAudience', 'mainOffers', 'communicationTone', 'contentNotes', 'avoidedTerms', 'references', 'driveUrl', 'createdAt', 'updatedAt'];
export function operationalBrand(data: Record<string, unknown>) {
  const source: Record<string, unknown> = { ...data, driveUrl: data.driveUrl ?? data.googleDriveLink };
  return Object.fromEntries(brandFields.filter(key => source[key] !== undefined).map(key => [key, source[key]]));
}
export function publicAgency(data: Record<string, unknown>) { return Object.fromEntries(['name', 'logoUrl', 'phone', 'email', 'socialLinks'].filter(key => data[key] !== undefined).map(key => [key, data[key]])); }
