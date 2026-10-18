import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ColorWheel from '../appearance/ColorWheel';
import { defaultAppearance, desktopSidebarVariables, foreground, getDesktopBackground, isAppearance, opaqueColor, surfaceStyle } from '../appearance/theme';
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
  it('fundo desktop é opcional e não muda o estilo do menu mobile', () => {
    const background = { image: 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0975642231.firebasestorage.app/o/agency%2Fappearance%2Ftest.png?alt=media', positionX: 10, positionY: 90, scale: 150, overlayColor: '#000000ff', overlay: 30 };
    const sidebar = { ...defaultAppearance.sidebar, desktopBackground: background };
    expect(isAppearance({ ...defaultAppearance, sidebar })).toBe(true);
    expect(surfaceStyle(sidebar)).toEqual(surfaceStyle(defaultAppearance.sidebar));
    expect(desktopSidebarVariables(sidebar)).toMatchObject({ '--desktop-sidebar-position': '10% 90%', '--desktop-sidebar-size': 'cover', '--desktop-sidebar-scale': 1.5 });
    expect(getDesktopBackground(defaultAppearance.sidebar).image).toBe('');
    for (const patch of [{ image: 'blob:temporary' }, { positionX: 101 }, { scale: 99 }, { overlay: -1 }, { overlayColor: 'red' }]) expect(isAppearance({ ...defaultAppearance, sidebar: { ...sidebar, desktopBackground: { ...background, ...patch } } })).toBe(false);
  });
  it('remover fundo desktop retorna à cor sólida mesmo com uma imagem mobile legada', () => {
    const sidebar = { ...defaultAppearance.sidebar, color: '#123456ff', image: 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0975642231.firebasestorage.app/o/agency%2Fappearance%2Fold.png?alt=media' };
    const removed = { ...sidebar, desktopBackground: { ...getDesktopBackground(sidebar), image: '' } };
    expect(desktopSidebarVariables(removed)).toMatchObject({ '--desktop-sidebar-image': 'none', '--desktop-sidebar-color': '#123456' });
    expect(surfaceStyle(removed)).toEqual(surfaceStyle(sidebar));
    expect(desktopSidebarVariables(defaultAppearance.sidebar)['--desktop-sidebar-image']).toBe('none');
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
