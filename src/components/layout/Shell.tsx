import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AIAssistant from '../ai/AIAssistant';
import AiBubble from '../ai/AiBubble';
import useAppStore from '../../store';

const Shell = () => {
  const aiOpen = useAppStore((state) => state.aiOpen);
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="flex h-screen bg overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <AnimatePresence>
        {aiOpen && <AIAssistant />}
        {!aiOpen && <AiBubble />}
      </AnimatePresence>
    </div>
  );
};

export default Shell;
