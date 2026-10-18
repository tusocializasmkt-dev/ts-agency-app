import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ColorWheel from '../appearance/ColorWheel';
import { defaultAppearance, foreground, isAppearance, opaqueColor, surfaceStyle } from '../appearance/theme';
describe('aparência', () => {
  it('valida configurações e bloqueia imagens arbitrárias, SVG e escalas inválidas', () => {
    expect(isAppearance(defaultAppearance)).toBe(true);
    for (const image of ['javascript:alert(1)', 'data:image/svg+xml,test', 'https://elsewhere.test/image.png']) expect(isAppearance({ ...defaultAppearance, sidebar: { ...defaultAppearance.sidebar, image } })).toBe(false);
    expect(isAppearance({ ...defaultAppearance, header: { ...defaultAppearance.header, overlay: 1 } })).toBe(false);
  });
  it('compõe transparência e escolhe texto com contraste', () => {
    expect(opaqueColor('#00000000')).toBe('#ffffff');
    expect(foreground('#000000ff')).toBe('#ffffff');
    expect(foreground('#ffffffff')).toBe('#000000');
    expect(surfaceStyle(defaultAppearance.sidebar).backgroundImage).toBe('none');
  });
  it('permite teclado no círculo e HEX com alpha', () => {
    const change = vi.fn(); render(<ColorWheel label="Menu" value="#ff0000ff" onChange={change} />);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Menu: círculo de tonalidade' }), { key: 'ArrowRight' });
    expect(change).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('HEX (RRGGBB ou RRGGBBAA)'), { target: { value: '#12345680' } });
    expect(change).toHaveBeenLastCalledWith('#12345680');
    fireEvent.change(screen.getByLabelText('Menu: Opacidade'), { target: { value: '50' } });
    expect(change).toHaveBeenLastCalledWith('#ff000080');
  });
});
