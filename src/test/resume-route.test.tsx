import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import ResumeRoute from '../app/router/ResumeRoute';
import { rememberRoute } from '../app/router/last-route';
const load = vi.hoisted(() => vi.fn());
vi.mock('../services/brands.service', () => ({ loadBrand: load }));
vi.mock('../lib/firebase', () => ({ auth: {} }));
const Location = () => <span>{useLocation().pathname}</span>;
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
const renderResume = (role: 'admin' | 'manager' = 'admin', brandIds: string[] = []) => render(<MemoryRouter initialEntries={['/']}><Routes><Route path="/" element={<ResumeRoute uid="a" role={role} brandIds={brandIds} />} /><Route path="*" element={<Location />} /></Routes></MemoryRouter>);
it('deleted brand returns to Dashboard instead of reopening an invalid route', async () => {
  rememberRoute('a','admin','/admin/clientes/deleted',[]); load.mockRejectedValue(new Error('missing')); renderResume(); expect(await screen.findByText('/admin')).toBeInTheDocument();
});
it('valid assigned brand is verified against the operational repository before resuming', async () => {
  rememberRoute('a','manager','/admin/clientes/brand',['brand']); load.mockResolvedValue({ id: 'brand' }); renderResume('manager',['brand']); expect(await screen.findByText('/admin/clientes/brand')).toBeInTheDocument(); expect(load).toHaveBeenCalledWith('brand',true);
});
it('removed assignment falls back without querying the forbidden brand', async () => {
  rememberRoute('a','manager','/admin/clientes/brand',['brand']); renderResume('manager',[]); expect(await screen.findByText('/admin')).toBeInTheDocument(); expect(load).not.toHaveBeenCalled();
});
