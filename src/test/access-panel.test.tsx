import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import AccessPanel from '../components/auth/AccessPanel';

const mocks = vi.hoisted(() => ({ admin: true, confirm: vi.fn(), run: vi.fn(), profile: { uid: 'client-a', email: 'test@example.test', displayName: 'Marca', exists: true, active: true } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: mocks.admin, user: { uid: 'admin' } }) }));
vi.mock('../hooks/useAccessManagement', () => ({ useAccessManagement: () => ({ profiles: [mocks.profile], loading: false, processing: false, error: '', run: mocks.run, refresh: vi.fn() }) }));
vi.mock('../hooks/useModal', () => ({ useModal: () => ({ confirm: mocks.confirm }) }));
vi.mock('../hooks/useFeedback', () => ({ useFeedback: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../data/functions/auth.functions', () => ({ callCreateClientAccess: vi.fn() }));
beforeEach(() => { mocks.admin = true; vi.clearAllMocks(); });
it('client login removal requires confirmation and explicitly preserves business data', async () => {
  mocks.confirm.mockResolvedValue(false); render(<AccessPanel kind="client" uid="client-a" />);
  fireEvent.click(screen.getByText('Remover login')); await waitFor(() => expect(mocks.confirm).toHaveBeenCalled()); expect(mocks.run).not.toHaveBeenCalled();
  expect(mocks.confirm.mock.calls[0][0].description).toContain('preservados');
  mocks.confirm.mockResolvedValue(true); fireEvent.click(screen.getByText('Remover login'));
  await waitFor(() => expect(mocks.run).toHaveBeenCalledWith({ uid: 'client-a', action: 'remove', active: false }));
});
it('team/client cannot render access controls', () => { mocks.admin = false; const { container } = render(<AccessPanel kind="admin" />); expect(container).toBeEmptyDOMElement(); });
