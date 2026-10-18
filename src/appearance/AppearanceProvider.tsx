import { createContext, useContext, useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { defaultAppearance, opaqueColor, foreground } from './theme';
import { watchAppearance } from './appearance.service';

const Context = createContext(defaultAppearance);
export const useAppearance = () => useContext(Context);
export default function AppearanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState(defaultAppearance);
  useEffect(() => {
    setTheme(defaultAppearance);
    if (!user) return;
    return watchAppearance(value => setTheme(value || defaultAppearance), () => setTheme(defaultAppearance));
  }, [user?.uid]);
  const style = { '--appearance-accent': opaqueColor(theme.accent), '--appearance-accent-text': foreground(theme.accent), '--appearance-dashboard': opaqueColor(theme.dashboard), '--appearance-feed': opaqueColor(theme.feed) } as CSSProperties;
  return <Context.Provider value={theme}><div className="appearance-root" style={style}>{children}</div></Context.Provider>;
}
