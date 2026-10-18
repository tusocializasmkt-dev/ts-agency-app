import ColorWheel from './ColorWheel';
import type { DesktopBackground } from './theme';

interface Props {
  value: DesktopBackground;
  onChange: (next: DesktopBackground) => void;
  onUpload: (file: File) => void;
}
export default function SidebarBackgroundEditor({ value, onChange, onUpload }: Props) {
  return <fieldset className="space-y-3 rounded-xl border p-4">
    <legend className="px-2 font-bold">Imagem de fundo do menu lateral</legend>
    <p className="text-sm text-zinc-600">Aplicada somente no desktop. A prévia não altera o menu até aplicar globalmente.</p>
    <label className="block text-sm">Selecionar imagem do menu lateral<input className="block w-full py-3" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onUpload(file); }} /></label>
    <p className="text-xs text-zinc-500">PNG, JPG ou WebP. Até 2 MB e 16 megapixels.</p>
    {value.image && <><img src={value.image} alt="Prévia da imagem de fundo do menu lateral" className="max-h-32 w-full rounded-lg object-contain" /><button type="button" className="min-h-11 underline" onClick={() => onChange({ ...value, image: '' })}>Remover imagem do menu lateral</button></>}
    {(['positionX', 'positionY', 'scale', 'overlay'] as const).map((control, i) => <label key={control} className="block text-sm">{['Posição horizontal do fundo', 'Posição vertical do fundo', 'Escala do fundo', 'Opacidade da sobreposição'][i]}: {value[control]}%<input aria-label={['Posição horizontal do fundo', 'Posição vertical do fundo', 'Escala do fundo', 'Opacidade da sobreposição'][i]} className="block min-h-9 w-full" type="range" min={control === 'scale' ? 100 : 0} max={control === 'scale' ? 200 : 100} value={value[control]} onChange={e => onChange({ ...value, [control]: Number(e.target.value) })} /></label>)}
    <ColorWheel label="Cor da sobreposição do menu desktop" value={value.overlayColor} onChange={overlayColor => onChange({ ...value, overlayColor })} />
    <p className="text-xs text-zinc-500">A sobreposição pode ser reforçada automaticamente para garantir a leitura dos itens.</p>
  </fieldset>;
}
