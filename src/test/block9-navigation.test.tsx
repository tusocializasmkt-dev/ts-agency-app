import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import AdminPostsPage from '../pages/admin/AdminPostsPage';
import AdminClientsPage from '../pages/admin/AdminClientsPage';
const state = vi.hoisted(() => ({ isAdmin: true, isTeamMember: false, brandIds: ['a'] }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => state }));
vi.mock('../hooks', () => ({ useBrands: () => ({ brands: [{ id: 'a', name: 'Marca A', status: 'active' }], loading: false }), useFeedback: () => ({}) }));
vi.mock('../data/functions', () => ({ callCreateClientWithAccess: vi.fn() }));
vi.mock('../components/Admin/ClientDialog', () => ({ default: () => null }));
vi.mock('../components/Admin/AccessConfirmationDialog', () => ({ default: () => null }));
vi.mock('../components/FeedView', () => ({ default: ({ selectedBrandId, onBrandChange }: any) => <div>Feed {selectedBrandId}<button onClick={() => onBrandChange('b')}>Trocar marca</button></div> }));
function Location() { const l = useLocation(); return <output>{l.pathname}{l.search}</output>; }
function mount(path: string) { return render(<MemoryRouter initialEntries={[path]}><Location /><Routes><Route path="/admin/clientes" element={<AdminClientsPage />} /><Route path="/admin/posts" element={<AdminPostsPage />} /><Route path="*" element={<span>Dashboard ou informações</span>} /></Routes></MemoryRouter>); }
beforeEach(() => Object.assign(state, { isAdmin: true, isTeamMember: false, brandIds: ['a'] }));
it('clique principal abre Feed escopado e ação secundária mantém informações', () => {
  const view = mount('/admin/clientes');
  fireEvent.click(screen.getByRole('link', { name: 'Abrir Feed de Marca A' }));
  expect(screen.getByText('Feed a')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('/admin/posts?brandId=a');
  view.unmount(); mount('/admin/clientes');
  fireEvent.click(screen.getByRole('button', { name: 'Informações' }));
  expect(screen.getByRole('status')).toHaveTextContent('/admin/clientes/a');
});
it('acesso direto preserva filtro na URL e troca atualiza URL', () => {
  mount('/admin/posts?brandId=a'); expect(screen.getByText('Feed a')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Trocar marca'));
  expect(screen.getByText('Feed b')).toBeInTheDocument(); expect(screen.getByRole('status')).toHaveTextContent('brandId=b');
});
it('equipe abre marca permitida por teclado, sem ação administrativa', () => {
  Object.assign(state, { isAdmin: false, isTeamMember: true }); mount('/admin/clientes');
  expect(screen.queryByText('Informações')).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('link'), { key: 'Enter' });
  expect(screen.getByText('Feed a')).toBeInTheDocument();
});
it('marca adulterada na URL não monta o Feed para equipe', () => {
  Object.assign(state, { isAdmin: false, isTeamMember: true }); mount('/admin/posts?brandId=forbidden');
  expect(screen.queryByText(/Feed/)).not.toBeInTheDocument(); expect(screen.getByRole('status')).toHaveTextContent('/admin');
});
