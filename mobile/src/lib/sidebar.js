import { createContext, useCallback, useContext, useState } from 'react';
import { useSelector } from 'react-redux';
import Sidebar from '../components/Sidebar';
import { useTheme } from './theme';

const SidebarContext = createContext({ open: () => {}, close: () => {} });

export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const user = useSelector((s) => s.user.data);
  const c = useTheme();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SidebarContext.Provider value={{ open, close }}>
      {children}
      <Sidebar visible={isOpen} onClose={close} user={user} c={c} />
    </SidebarContext.Provider>
  );
}
