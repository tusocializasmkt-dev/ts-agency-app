import { expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ onSnapshot: vi.fn(), doc: vi.fn(() => ({ path: 'appearance/active' })) }));
vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({ ...sdk, collection: vi.fn(), setDoc: vi.fn() }));
vi.mock('../data/repositories/storage.repository', () => ({ createStorageReference: vi.fn(), getFileDownloadUrl: vi.fn(), uploadFile: vi.fn() }));
import { watchAppearance } from '../appearance/appearance.service';
import { defaultAppearance } from '../appearance/theme';
it('aplica tema somente na confirmação e observa confirmação que muda apenas metadata', () => {
  const next = vi.fn(); watchAppearance(next, vi.fn());
  expect(sdk.onSnapshot.mock.calls[0][1]).toEqual({ includeMetadataChanges: true });
  const listen = sdk.onSnapshot.mock.calls[0][2];
  listen({ metadata: { hasPendingWrites: true }, data: () => defaultAppearance });
  expect(next).not.toHaveBeenCalled();
  listen({ metadata: { hasPendingWrites: false }, data: () => defaultAppearance });
  expect(next).toHaveBeenCalledWith(defaultAppearance);
});
