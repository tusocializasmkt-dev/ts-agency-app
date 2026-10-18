import AppearanceProvider, { useAppearance } from '../../appearance/AppearanceProvider';
import { surfaceStyle } from '../../appearance/theme';
import AnnouncementPopup from '../../communications/AnnouncementPopup';
import RememberRoute from '../router/RememberRoute';
import { useCallback, useRef, useState } from 'react';
import MobileHeader from './MobileHeader';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useAgencyConfig } from '../../hooks/useAgencyConfig';

export default function AuthenticatedLayout() { return <AppearanceProvider><LayoutContent /></AppearanceProvider>; }
function LayoutContent() {
  const appearance = useAppearance();
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
    <AnnouncementPopup /><RememberRoute /><Sidebar mobileOpen={mobileMenuOpen} onMobileClose={closeMobileMenu} />
    <div className="flex min-w-0 flex-1 flex-col">
      <MobileHeader logoUrl={config.logoUrl} name={config.name} menuButtonRef={menuButtonRef} menuOpen={mobileMenuOpen} onMenuOpen={() => setMobileMenuOpen(true)} style={surfaceStyle(appearance.header)} />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-5 sm:p-6 lg:p-8"><Outlet /></div>
      </main>
    </div>
  </div>;
}
