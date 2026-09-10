import { useCallback, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useAgencyConfig } from '../../hooks/useAgencyConfig';

export default function AuthenticatedLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { config } = useAgencyConfig();
  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(wasOpen => {
      if (wasOpen) window.requestAnimationFrame(() => menuButtonRef.current?.focus());
      return false;
    });
  }, []);

  return <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-[#FDFDFD] text-black">
    <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={closeMobileMenu} />
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <button ref={menuButtonRef} type="button" aria-label="Abrir menu de navegação" aria-controls="authenticated-navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
          <Menu className="h-5 w-5" />
        </button>
        {config.logoUrl ? <img src={config.logoUrl} alt={config.name ? `Logotipo ${config.name}` : 'Logotipo da agência'} className="h-9 min-w-0 max-w-[11rem] object-contain object-left" /> : <span className="truncate text-sm font-bold uppercase tracking-wider">{config.name || 'TS Agency'}</span>}
      </header>
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-5 sm:p-6 lg:p-8"><Outlet /></div>
      </main>
    </div>
  </div>;
}
