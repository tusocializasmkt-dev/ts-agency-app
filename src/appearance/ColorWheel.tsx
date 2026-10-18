import { useState, useId } from 'react';

function fromHsl(h: number, s: number, l: number, a: number) {
  s /= 100; l /= 100;
  const f = (n: number) => { const k = (n + h / 30) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return '#' + [f(0), f(8), f(4), a / 100].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}
function toHsl(value: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min, l = (max + min) / 2;
  const h = delta === 0 ? 0 : max === r ? 60 * (((g - b) / delta + 6) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
  return [h, delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1)) * 100, l * 100, parseInt(value.slice(7, 9), 16) / 255 * 100];
}
export default function ColorWheel({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const id = useId();
  const [hex, setHex] = useState<string | null>(null);
  const [lastHue, setLastHue] = useState(0);
  const values = toHsl(value); if (values[1] === 0) values[0] = lastHue;
  const change = (index: number, number: number) => { const next = [...values]; next[index] = number; if (index === 0) setLastHue(number); setHex(null); onChange(fromHsl(next[0], next[1], next[2], next[3])); };
  const pointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    change(0, (Math.atan2(event.clientX - box.left - box.width / 2, -(event.clientY - box.top - box.height / 2)) * 180 / Math.PI + 360) % 360);
  };
  return <fieldset className="space-y-3 rounded-xl border p-4"><legend className="px-2 font-bold">{label}</legend>
    <div role="slider" tabIndex={0} aria-label={`${label}: círculo de tonalidade`} aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(values[0])} onKeyDown={e => { if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Home', 'End'].includes(e.key)) { e.preventDefault(); change(0, e.key === 'Home' ? 0 : e.key === 'End' ? 360 : (values[0] + (['ArrowLeft', 'ArrowDown'].includes(e.key) ? -1 : 1) + 360) % 360); } }} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); pointer(e); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) pointer(e); }} className="relative mx-auto h-36 w-36 touch-none rounded-full outline-offset-4" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
      <span className="absolute inset-6 rounded-full border-4 border-white" style={{ background: value }} /><span className="absolute left-1/2 top-1/2 h-4 w-4 rounded-full border-2 border-black bg-white" style={{ transform: `translate(-50%, -50%) rotate(${values[0]}deg) translateY(-63px)` }} />
    </div>
    {['Tonalidade', 'Saturação', 'Luminosidade', 'Opacidade'].map((name, i) => <label key={name} className="block text-sm">{name}: {Math.round(values[i])}{i ? '%' : '°'}<input aria-label={`${label}: ${name}`} type="range" className="block min-h-8 w-full" min={0} max={i ? 100 : 360} value={values[i]} onChange={e => change(i, Number(e.target.value))} /></label>)}
    <label htmlFor={id} className="block text-sm">HEX (RRGGBB ou RRGGBBAA)</label><input id={id} className="min-h-11 w-full rounded-lg border px-3" value={hex ?? value} onChange={e => { const input = e.target.value; setHex(input); if (/^#[\da-f]{8}$/i.test(input)) onChange(input.toLowerCase()); }} onBlur={() => { if (hex && /^#[\da-f]{6}$/i.test(hex)) onChange(hex.toLowerCase() + 'ff'); setHex(null); }} />
  </fieldset>;
}
