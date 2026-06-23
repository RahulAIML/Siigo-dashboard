import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store'

interface AiBubbleProps {
  unreadCount?: number
}

export default function AiBubble({ unreadCount = 0 }: AiBubbleProps) {
  const { setAiOpen } = useAppStore()
  const [hovered, setHovered] = useState(false)
  const hasUnread = unreadCount > 0

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-[calc(100%+10px)] right-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-lg pointer-events-none select-none"
            style={{
              background: 'linear-gradient(135deg, #0066FF 0%, #8B5CF6 100%)',
            }}
          >
            Asistente IA SIIGO
            {/* Arrow */}
            <span
              className="absolute -bottom-1 right-5 w-2 h-2 rotate-45"
              style={{
                background: '#8B5CF6',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulsing ring — only shown when there are unread messages */}
      {hasUnread && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            background: 'linear-gradient(135deg, rgba(0,102,255,0.45) 0%, rgba(139,92,246,0.45) 100%)',
          }}
        />
      )}

      {/* Main button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.93 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        onClick={() => setAiOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="relative flex items-center justify-center rounded-full shadow-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/60"
        style={{
          width: 64,
          height: 64,
          background: 'linear-gradient(135deg, #0066FF 0%, #8B5CF6 100%)',
        }}
        aria-label="Asistente IA SIIGO"
        title="Asistente IA SIIGO"
      >
        <Sparkles size={26} className="text-white drop-shadow-sm" />

        {/* Unread badge */}
        {hasUnread && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shadow-md"
            style={{ minWidth: 20, height: 20, padding: '0 4px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>
    </motion.div>
  )
}
