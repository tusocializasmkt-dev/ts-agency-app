import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import MobileHeader from '../app/layouts/MobileHeader';

it('mantém logo dinâmico ao lado do menu dentro do cabeçalho compacto', () => {
  const open = vi.fn();
  const { rerender } = render(<MobileHeader logoUrl="/logo-old.png" name="Tu Socializas" menuOpen={false} onMenuOpen={open} />);
  const header = screen.getByRole('banner');
  expect(header).toHaveClass('h-16', 'min-h-16', 'max-h-16', 'shrink-0', 'lg:hidden');
  const image = screen.getByAltText('Logotipo Tu Socializas');
  expect(header).toContainElement(image);
  expect(image).toHaveClass('agency-mobile-logo');
  expect(image).toHaveAttribute('src', '/logo-old.png');
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));
  expect(open).toHaveBeenCalledOnce();
  rerender(<MobileHeader logoUrl="/logo-new.png" name="Tu Socializas" menuOpen onMenuOpen={open} />);
  expect(screen.getByAltText('Logotipo Tu Socializas')).toHaveAttribute('src', '/logo-new.png');
  expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
});

it('preserva os fallbacks de nome e TS Agency sem criar outra seção', () => {
  const { rerender } = render(<MobileHeader name="Minha agência" menuOpen={false} onMenuOpen={() => {}} />);
  expect(screen.getByRole('banner')).toHaveTextContent('Minha agência');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  rerender(<MobileHeader menuOpen={false} onMenuOpen={() => {}} />);
  expect(screen.getByRole('banner')).toHaveTextContent('TS Agency');
});
