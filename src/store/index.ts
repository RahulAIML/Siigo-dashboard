import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type DatePreset = 'today' | 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'all'

interface AppState {
  // UI
  language:         'es' | 'en'
  theme:            'light' | 'dark'
  sidebarCollapsed: boolean
  mobileMenuOpen:   boolean

  // AI
  aiOpen: boolean

  // Filters
  selectedActivityId: number | null
  dateFrom:   string | null
  dateTo:     string | null
  datePreset: DatePreset

  // Actions
  setLanguage:          (lang: 'es' | 'en') => void
  setTheme:             (theme: 'light' | 'dark') => void
  toggleSidebar:        () => void
  setMobileMenuOpen:    (open: boolean) => void
  setAiOpen:            (open: boolean) => void
  setSelectedActivityId:(id: number | null) => void
  setDateRange:         (from: string | null, to: string | null) => void
  setDatePreset:        (preset: DatePreset) => void
  resetFilters:         () => void
}

function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language:         'es',
      theme:            'light',
      sidebarCollapsed: false,
      mobileMenuOpen:   false,
      aiOpen:           false,
      selectedActivityId: null,
      dateFrom:   null,
      dateTo:     null,
      datePreset: 'last30',

      setLanguage: (language) => set({ language }),

      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),

      setAiOpen: (aiOpen) => set({ aiOpen }),

      setSelectedActivityId: (selectedActivityId) => set({ selectedActivityId }),

      setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo }),

      setDatePreset: (datePreset) => set({ datePreset, dateFrom: null, dateTo: null }),

      resetFilters: () =>
        set({ selectedActivityId: null, dateFrom: null, dateTo: null, datePreset: 'last30' }),
    }),
    {
      name: 'siigo-store-v1',
      partialize: (s) => ({
        language:         s.language,
        theme:            s.theme,
        sidebarCollapsed: s.sidebarCollapsed,
        datePreset:       s.datePreset,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)

export default useAppStore
