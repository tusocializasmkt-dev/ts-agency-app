import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppErrorBoundary from '../app/errors/AppErrorBoundary';
import { reportUnexpectedError } from '../app/errors/error-reporting';

vi.mock('../app/errors/error-reporting', () => ({ reportUnexpectedError: vi.fn() }));

describe('AppErrorBoundary', () => {
  beforeEach(() => vi.mocked(reportUnexpectedError).mockClear());
  it('exibe fallback amigável, reporta e permite remontar', () => {
    let fail = true; const Broken = () => { if (fail) throw new Error('segredo técnico'); return <span>recuperado</span>; };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<AppErrorBoundary><Broken /></AppErrorBoundary>);
    expect(screen.getByText(/não foi possível exibir/i)).toBeInTheDocument(); expect(screen.queryByText(/segredo técnico/i)).not.toBeInTheDocument(); expect(document.body.textContent).not.toContain('stack');
    expect(reportUnexpectedError).toHaveBeenCalledOnce(); fail = false; fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i })); expect(screen.getByText('recuperado')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
