import type { CSSProperties, Ref } from 'react';
import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  logoUrl?: string;
  name?: string;
  menuOpen: boolean;
  onMenuOpen: () => void;
  menuButtonRef?: Ref<HTMLButtonElement>;
  style?: CSSProperties;
}

export default function MobileHeader({ logoUrl, name, menuOpen, onMenuOpen, menuButtonRef, style }: MobileHeaderProps) {
  return <header data-appearance-header style={style} className="sticky top-0 z-30 flex h-16 min-h-16 max-h-16 shrink-0 items-center gap-3 overflow-hidden border-b border-zinc-200 bg-white/95 px-4 backdrop-blur lg:hidden">
    <button ref={menuButtonRef} type="button" aria-label="Abrir menu de navegação" aria-controls="authenticated-navigation" aria-expanded={menuOpen} onClick={onMenuOpen} className="flex h-11 min-h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
      <Menu className="h-5 w-5" />
    </button>
    <div className="flex h-9 min-w-0 max-w-[11rem] flex-1 items-center overflow-hidden">
      {logoUrl ? <img src={logoUrl} alt={name ? `Logotipo ${name}` : 'Logotipo da agência'} className="agency-mobile-logo" /> : <span className="truncate text-sm font-bold uppercase tracking-wider">{name || 'TS Agency'}</span>}
    </div>
  </header>;
}
