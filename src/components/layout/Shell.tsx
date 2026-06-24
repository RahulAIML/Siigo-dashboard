import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import AIAssistant from '../ai/AIAssistant'
import AiBubble from '../ai/AiBubble'
import { useAppStore } from '../../store/index'

export default function Shell() {
  const aiOpen = useAppStore((state) => state.aiOpen)
  const theme = useAppStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="flex min-h-screen bg-[#f4f7fb] dark:bg-[#0b1121] text-slate-900 dark:text-slate-100">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
          <Outlet />
        </main>
      </div>

      <AnimatePresence>
        {aiOpen ? <AIAssistant /> : <AiBubble />}
      </AnimatePresence>
    </div>
  )
}
