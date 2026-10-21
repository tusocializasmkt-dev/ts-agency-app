import type { CSSProperties } from 'react';

export interface Surface { color: string; image: string; position: number; scale: number; overlay: number }
export interface DesktopBackground { image: string; positionX: number; positionY: number; scale: number; overlayColor: string; overlay: number }
export interface SidebarSurface extends Surface { desktopBackground?: DesktopBackground }
export interface Appearance { name: string; sidebar: SidebarSurface; header: Surface; accent: string; dashboard: string; feed: string }
const surface = (): Surface => ({ color: '#ffffffff', image: '', position: 50, scale: 100, overlay: 85 });
export const defaultAppearance: Appearance = { name: 'Original TS Agency', sidebar: surface(), header: surface(), accent: '#000000ff', dashboard: '#e4e4e7ff', feed: '#e4e4e7ff' };
export const validColor = (value: unknown): value is string => typeof value === 'string' && /^#[\da-f]{8}$/i.test(value);
export function validImage(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/gen-lang-client-0975642231\.firebasestorage\.app\/o\/agency%2Fappearance%2F[\w.-]+\?alt=media(?:&token=[\w-]+)?$/.test(value));
}
export function isAppearance(value: unknown): value is Appearance {
  if (!value || typeof value !== 'object') return false;
  const t = value as Appearance;
  return typeof t.name === 'string' && t.name.trim().length > 0 && t.name.length <= 80 && [t.accent, t.dashboard, t.feed].every(validColor) && [t.sidebar, t.header].every(s => s && validColor(s.color) && validImage(s.image) && Number.isFinite(s.position) && s.position >= 0 && s.position <= 100 && Number.isFinite(s.scale) && s.scale >= 100 && s.scale <= 200 && Number.isFinite(s.overlay) && s.overlay >= 75 && s.overlay <= 100) && (t.sidebar.desktopBackground === undefined || isDesktopBackground(t.sidebar.desktopBackground));
}
export function isDesktopBackground(value: unknown): value is DesktopBackground {
  if (!value || typeof value !== 'object') return false;
  const d = value as DesktopBackground;
  return validImage(d.image) && validColor(d.overlayColor) && [d.positionX, d.positionY, d.overlay].every(n => Number.isFinite(n) && n >= 0 && n <= 100) && Number.isFinite(d.scale) && d.scale >= 100 && d.scale <= 200;
}
export function getDesktopBackground(s: SidebarSurface): DesktopBackground {
  return s.desktopBackground || { image: s.image, positionX: 50, positionY: s.position, scale: s.scale, overlayColor: s.color, overlay: s.overlay };
}
export function desktopSidebarVariables(s: SidebarSurface): CSSProperties {
  const d = getDesktopBackground(s);
  const style = d.image ? surfaceStyle({ color: d.overlayColor, image: d.image, position: d.positionY, scale: d.scale, overlay: d.overlay }) : surfaceStyle({ ...s, image: '' });
  return {
    '--desktop-sidebar-color': opaqueColor(s.color),
    '--desktop-sidebar-text': style.color,
    '--desktop-sidebar-image': style.backgroundImage,
    '--desktop-sidebar-position': `${d.positionX}% ${d.positionY}%`,
    '--desktop-sidebar-size': s.desktopBackground ? 'cover' : style.backgroundSize,
    '--desktop-sidebar-scale': s.desktopBackground && d.image ? d.scale / 100 : 1,
    '--desktop-sidebar-origin': `${d.positionX}% ${d.positionY}%`,
  } as CSSProperties;
}
// Composite transparent colors on the white application canvas before choosing text.
export function opaqueColor(color: string): string {
  const a = parseInt(color.slice(7, 9), 16) / 255;
  return '#' + [1, 3, 5].map(i => Math.round(parseInt(color.slice(i, i + 2), 16) * a + 255 * (1 - a)).toString(16).padStart(2, '0')).join('');
}
export function foreground(color: string): string {
  const c = opaqueColor(color.length === 7 ? color + 'ff' : color);
  return luminance(c) > .179 ? '#000000' : '#ffffff';
}
function luminance(c: string): number {
  const rgb = [1, 3, 5].map(i => { const v = parseInt(c.slice(i, i + 2), 16) / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
export function surfaceStyle(s: Surface): CSSProperties {
  const base = opaqueColor(s.color);
  const text = foreground(base);
  let opacity = s.overlay / 100;
  // Increase the requested overlay only when even an all-black/all-white image
  // would otherwise reduce normal text contrast below WCAG 4.5:1.
  while (opacity < 1) {
    const worst = '#' + [1, 3, 5].map(i => Math.round(parseInt(base.slice(i, i + 2), 16) * opacity + (text === '#ffffff' ? 255 : 0) * (1 - opacity)).toString(16).padStart(2, '0')).join('');
    const contrast = text === '#ffffff' ? 1.05 / (luminance(worst) + .05) : (luminance(worst) + .05) / .05;
    if (contrast >= 4.5) break;
    opacity = Math.min(1, opacity + .01);
  }
  const overlay = base + Math.round(opacity * 255).toString(16).padStart(2, '0');
  return { backgroundColor: base, color: foreground(base), backgroundImage: s.image ? `linear-gradient(${overlay}, ${overlay}), url("${s.image}")` : 'none', backgroundSize: `${s.scale}% auto`, backgroundPosition: `center ${s.position}%`, backgroundRepeat: 'no-repeat' };
}
