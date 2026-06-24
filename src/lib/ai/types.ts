// AI Analytics Copilot Types

export interface AIContext {
  customer: string
  exerciseId: number
  currentPage: string
  route: string
  dateRange: string
  selectedUser: string | null
  filters: Record<string, any>
}

export interface AIResponse {
  answer: string
  supportingMetrics?: Record<string, number | string>
  keyInsight?: string
  recommendation?: string
  sql?: string
  explanation?: string
}

export interface PageBehavior {
  focus: string[]
  examples: string[]
}

export const PAGE_BEHAVIORS: Record<string, PageBehavior> = {
  overview: {
    focus: ['KPI explanations', 'Dashboard summary', 'Trends', 'Executive insights', 'Anomalies', 'Growth analysis'],
    examples: [
      'Why is approval rate low?',
      'Summarize this dashboard.',
      'What changed this week?',
      'What anomalies do you see?',
    ],
  },
  simulations: {
    focus: ['Simulation performance', 'Pass/fail rates', 'Scores', 'Attempts', 'User activity', 'Simulation trends'],
    examples: [
      'Why are users failing?',
      'Show lowest performers.',
      'Which simulation has highest failure rate?',
      'How many attempts are being made?',
    ],
  },
  ranking: {
    focus: ['Rankings', 'Leaderboards', 'Score calculations', 'Rank explanations'],
    examples: [
      'Why is John ranked #1?',
      'Who improved most?',
      'Explain ranking calculation.',
      'Show top 10 performers.',
    ],
  },
  coaching: {
    focus: ['Coaching opportunities', 'Weak performers', 'Risk detection', 'Intervention recommendations'],
    examples: [
      'Who needs coaching?',
      'Who is likely to fail?',
      'Which users are not improving?',
      'Generate coaching recommendations.',
    ],
  },
  activities: {
    focus: ['Activity participation', 'Completion rates', 'Engagement metrics', 'Activity performance'],
    examples: [
      'Which activity performs worst?',
      'Show most popular activity.',
      'Compare activities.',
    ],
  },
  organization: {
    focus: ['Team performance', 'Department analysis', 'Organizational comparisons'],
    examples: [
      'Which team performs best?',
      'Compare departments.',
      'Which organization needs attention?',
    ],
  },
  reports: {
    focus: ['Executive summaries', 'Exportable insights', 'Trend reports', 'KPI summaries'],
    examples: [
      'Generate weekly report.',
      'Generate executive summary.',
      'Prepare board-level insights.',
    ],
  },
}

export type PageKey = keyof typeof PAGE_BEHAVIORS
