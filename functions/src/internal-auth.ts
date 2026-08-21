import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);
const KEY_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 10;

export type InternalRole = 'admin' | 'client';
export interface InternalCredential {
  uid: string;
  emailNormalized: string;
  passwordHash: string;
  passwordSalt: string;
  role: InternalRole;
  active: boolean;
  displayName: string;
  brandId?: string;
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error('weak-password');
  const derived = await scrypt(password, salt, KEY_LENGTH) as Buffer;
  return { passwordHash: derived.toString('hex'), passwordSalt: salt };
}

export async function verifyPassword(password: string, credential: Pick<InternalCredential, 'passwordHash' | 'passwordSalt'>) {
  try {
    const expected = Buffer.from(credential.passwordHash, 'hex');
    const actual = await scrypt(password, credential.passwordSalt, expected.length) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}

export interface LoginDependencies {
  findCredential(emailNormalized: string): Promise<InternalCredential | null>;
  isRateLimited(emailNormalized: string): Promise<boolean>;
  recordFailure(emailNormalized: string): Promise<void>;
  clearFailures(emailNormalized: string): Promise<void>;
  profileExists(credential: InternalCredential): Promise<boolean>;
  createCustomToken(uid: string, role: InternalRole): Promise<string>;
}

export async function authenticateInternal(email: string, password: string, dependencies: LoginDependencies) {
  const emailNormalized = normalizeEmail(email);
  if (!emailNormalized || !password || await dependencies.isRateLimited(emailNormalized)) throw new Error('invalid-credentials');
  const credential = await dependencies.findCredential(emailNormalized);
  const valid = credential ? await verifyPassword(password, credential) : false;
  if (!credential || !valid || !credential.active || !await dependencies.profileExists(credential)) {
    await dependencies.recordFailure(emailNormalized);
    throw new Error('invalid-credentials');
  }
  await dependencies.clearFailures(emailNormalized);
  const customToken = await dependencies.createCustomToken(credential.uid, credential.role);
  return { customToken, role: credential.role, profile: { uid: credential.uid, displayName: credential.displayName, brandId: credential.role === 'client' ? credential.brandId ?? credential.uid : undefined } };
}
