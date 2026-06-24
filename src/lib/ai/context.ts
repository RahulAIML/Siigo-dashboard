// AI Context Provider
import { create } from 'zustand'
import { AIContext } from './types'

interface AIContextStore extends AIContext {
  setContext: (context: Partial<AIContext>) => void
  resetContext: () => void
}

const DEFAULT_CONTEXT: AIContext = {
  customer: 'SIIGO',
  exerciseId: 3200,
  currentPage: '',
  route: '',
  dateRange: '',
  selectedUser: null,
  filters: {},
}

export const useAIContext = create<AIContextStore>((set) => ({
  ...DEFAULT_CONTEXT,
  setContext: (context) => set((state) => ({ ...state, ...context })),
  resetContext: () => set(DEFAULT_CONTEXT),
}))
