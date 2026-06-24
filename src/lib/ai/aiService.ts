// AI Analytics Service
import { AIContext, AIResponse } from './types'
import { SQLGenerator } from './sqlGenerator'

export class AIAnalyticsService {
  constructor(private context: AIContext) {}

  async processQuestion(question: string): Promise<AIResponse> {
    // Step 1: Detect intent
    const intent = this.detectIntent(question)
    
    // Step 2: Generate SQL
    const sqlGenerator = new SQLGenerator(this.context)
    const query = sqlGenerator.generateQuery(question, intent)
    
    if (!query) {
      return {
        answer: this.getNoDataMessage(),
        keyInsight: 'Unable to generate appropriate query for this question.',
      }
    }

    // Step 3: Execute SQL (via API endpoint)
    const data = await this.executeQuery(query.sql)
    
    // Step 4: Validate and format response
    if (!data || data.length === 0) {
      return {
        answer: this.getNoDataMessage(),
        sql: query.sql,
        explanation: query.description,
      }
    }

    // Step 5: Format response
    return this.formatResponse(question, data, query)
  }

  private detectIntent(question: string): string {
    const q = question.toLowerCase()
    
    if (q.includes('why') || q.includes('explain') || q.includes('reason')) return 'explanation'
    if (q.includes('how many') || q.includes('count') || q.includes('total')) return 'count'
    if (q.includes('show') || q.includes('list') || q.includes('display')) return 'list'
    if (q.includes('compare') || q.includes('difference') || q.includes('vs')) return 'comparison'
    if (q.includes('worst') || q.includes('lowest') || q.includes('bottom')) return 'ranking_low'
    if (q.includes('best') || q.includes('highest') || q.includes('top')) return 'ranking_high'
    if (q.includes('trend') || q.includes('change') || q.includes('over time')) return 'trend'
    if (q.includes('anomal') || q.includes('issue') || q.includes('problem')) return 'anomaly'
    if (q.includes('recommend') || q.includes('suggest') || q.includes('should')) return 'recommendation'
    
    return 'general'
  }

  private async executeQuery(sql: string): Promise<any[]> {
    try {
      const response = await fetch('https://rolplay.app/ajax/remote-access.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      })

      const result = await response.json()
      
      if (result.result === 'success' && result.data) {
        return Array.isArray(result.data) ? result.data : [result.data]
      }
      
      return []
    } catch (error) {
      console.error('SQL execution error:', error)
      return []
    }
  }

  private formatResponse(question: string, data: any[], query: any): AIResponse {
    const language = this.context.currentPage?.includes('es') ? 'es' : 'en'
    const q = question.toLowerCase()
    
    // Format based on intent and data structure
    if (q.includes('approval rate') || q.includes('pass rate')) {
      return this.formatApprovalRateResponse(data, language, query)
    }
    
    if (q.includes('summary') || q.includes('summarize')) {
      return this.formatSummaryResponse(data, language, query)
    }
    
    if (q.includes('anomal') || q.includes('issue')) {
      return this.formatAnomalyResponse(data, language, query)
    }
    
    if (q.includes('fail') || q.includes('failing')) {
      return this.formatFailureResponse(data, language, query)
    }
    
    if (q.includes('top') || q.includes('best')) {
      return this.formatTopPerformersResponse(data, language, query)
    }
    
    if (q.includes('coaching') || q.includes('risk')) {
      return this.formatCoachingResponse(data, language, query)
    }
    
    if (q.includes('worst') || q.includes('lowest')) {
      return this.formatWorstPerformersResponse(data, language, query)
    }
    
    if (q.includes('popular') || q.includes('most used')) {
      return this.formatPopularActivitiesResponse(data, language, query)
    }
    
    // Default generic response
    return this.formatGenericResponse(data, language, query)
  }

  private formatApprovalRateResponse(data: any[], language: string, query: any): AIResponse {
    const row = data[0]
    const approvalRate = row.approval_rate || 0
    const total = row.total_simulations || 0
    const approved = row.approved || 0
    const failed = row.failed || 0

    return {
      answer: language === 'es' 
        ? `La tasa de aprobación actual es del ${approvalRate}%`
        : `Current approval rate is ${approvalRate}%`,
      supportingMetrics: {
        'Total Simulations': total,
        'Approved': approved,
        'Failed': failed,
        'Approval Rate': `${approvalRate}%`,
      },
      keyInsight: language === 'es'
        ? `${failed} de ${total} simulaciones no fueron aprobadas.`
        : `${failed} out of ${total} simulations were not approved.`,
      recommendation: language === 'es'
        ? 'Revise el contenido de capacitación para las simulaciones con mayor tasa de fallo.'
        : 'Review training content for simulations with highest failure rates.',
      sql: query.sql,
      explanation: language === 'es'
        ? 'Tasa de Aprobación = Usuarios Aprobados ÷ Total de Simulaciones Completadas × 100'
        : 'Approval Rate = Approved Users ÷ Total Completed Simulations × 100',
    }
  }

  private formatSummaryResponse(data: any[], language: string, query: any): AIResponse {
    const row = data[0]
    
    return {
      answer: language === 'es'
        ? 'Resumen del Dashboard'
        : 'Dashboard Summary',
      supportingMetrics: {
        'Total Simulations': row.total_simulations || 0,
        'Unique Users': row.unique_users || 0,
        'Unique Activities': row.unique_activities || 0,
        'Average Score': row.avg_score || 0,
        'Approval Rate': `${row.approval_rate || 0}%`,
      },
      keyInsight: language === 'es'
        ? `${row.unique_users} usuarios han completado ${row.total_simulations} simulaciones en ${row.unique_activities} actividades.`
        : `${row.unique_users} users have completed ${row.total_simulations} simulations across ${row.unique_activities} activities.`,
      sql: query.sql,
    }
  }

  private formatAnomalyResponse(data: any[], language: string, query: any): AIResponse {
    const row = data[0]
    const issues: string[] = []
    
    if (row.missing_scores > 0) {
      issues.push(language === 'es' 
        ? `${row.missing_scores} simulaciones sin puntuación`
        : `${row.missing_scores} simulations missing scores`)
    }
    if (row.future_dates > 0) {
      issues.push(language === 'es'
        ? `${row.future_dates} simulaciones con fechas futuras`
        : `${row.future_dates} simulations with future dates`)
    }
    if (row.missing_users > 0) {
      issues.push(language === 'es'
        ? `${row.missing_users} simulaciones sin usuario`
        : `${row.missing_users} simulations missing user`)
    }

    return {
      answer: language === 'es'
        ? 'Análisis de Anomalías de Datos'
        : 'Data Anomaly Analysis',
      supportingMetrics: {
        'Total Records': row.total || 0,
        'Missing Scores': row.missing_scores || 0,
        'Future Dates': row.future_dates || 0,
        'Missing Users': row.missing_users || 0,
      },
      keyInsight: issues.length > 0
        ? (language === 'es' ? `Problemas detectados: ${issues.join(', ')}.` : `Issues detected: ${issues.join(', ')}.`)
        : (language === 'es' ? 'No se detectaron anomalías.' : 'No anomalies detected.'),
      recommendation: issues.length > 0
        ? (language === 'es' ? 'Revisar la sincronización de datos y validar las fuentes.' : 'Review data synchronization and validate sources.')
        : undefined,
      sql: query.sql,
    }
  }

  private formatFailureResponse(data: any[], language: string, query: any): AIResponse {
    const topFailures = data.slice(0, 5).map((row: any) => ({
      user: row.Usuario,
      failures: row.failures,
      attempts: row.attempts,
      failureRate: `${row.pass_rate}%`,
    }))

    return {
      answer: language === 'es'
        ? 'Usuarios con más fallos'
        : 'Users with most failures',
      supportingMetrics: {
        'Top Failures': topFailures,
      },
      keyInsight: language === 'es'
        ? `${data.length} usuarios tienen tasas de fallo significativas.`
        : `${data.length} users have significant failure rates.`,
      recommendation: language === 'es'
        ? 'Priorizar coaching para estos usuarios.'
        : 'Prioritize coaching for these users.',
      sql: query.sql,
    }
  }

  private formatTopPerformersResponse(data: any[], language: string, query: any): AIResponse {
    const topPerformers = data.slice(0, 5).map((row: any) => ({
      rank: row.rank,
      user: row.Usuario,
      avgScore: row.avg_score,
      passRate: `${row.pass_rate}%`,
    }))

    return {
      answer: language === 'es'
        ? 'Mejores Desempeños'
        : 'Top Performers',
      supportingMetrics: {
        'Top Performers': topPerformers,
      },
      keyInsight: language === 'es'
        ? `El mejor desempeño es de ${data[0]?.avg_score}% con ${data[0]?.pass_rate}% de aprobación.`
        : `Top performance is ${data[0]?.avg_score}% with ${data[0]?.passRate}% approval rate.`,
      sql: query.sql,
    }
  }

  private formatCoachingResponse(data: any[], language: string, query: any): AIResponse {
    const coachingCandidates = data.slice(0, 5).map((row: any) => ({
      user: row.Usuario,
      avgScore: row.avg_score,
      failureRate: `${row.failure_rate}%`,
      riskLevel: row.risk_level,
    }))

    return {
      answer: language === 'es'
        ? 'Usuarios que requieren coaching'
        : 'Users requiring coaching',
      supportingMetrics: {
        'Coaching Candidates': coachingCandidates,
      },
      keyInsight: language === 'es'
        ? `${data.length} usuarios requieren intervención inmediata.`
        : `${data.length} users require immediate intervention.`,
      recommendation: language === 'es'
        ? 'Programar sesiones de coaching prioritarias.'
        : 'Schedule priority coaching sessions.',
      sql: query.sql,
    }
  }

  private formatWorstPerformersResponse(data: any[], language: string, query: any): AIResponse {
    const worstActivities = data.slice(0, 5).map((row: any) => ({
      activity: row.Actividad,
      avgScore: row.avg_score,
      passRate: `${row.pass_rate}%`,
    }))

    return {
      answer: language === 'es'
        ? 'Actividades con peor desempeño'
        : 'Worst performing activities',
      supportingMetrics: {
        'Worst Activities': worstActivities,
      },
      keyInsight: language === 'es'
        ? `La actividad con peor desempeño tiene ${data[0]?.pass_rate}% de aprobación.`
        : `The worst performing activity has ${data[0]?.passRate}% approval rate.`,
      recommendation: language === 'es'
        ? 'Revisar y mejorar el contenido de estas actividades.'
        : 'Review and improve content for these activities.',
      sql: query.sql,
    }
  }

  private formatPopularActivitiesResponse(data: any[], language: string, query: any): AIResponse {
    const popularActivities = data.slice(0, 5).map((row: any) => ({
      activity: row.Actividad,
      attempts: row.attempts,
      uniqueUsers: row.unique_users,
      passRate: `${row.pass_rate}%`,
    }))

    return {
      answer: language === 'es'
        ? 'Actividades más populares'
        : 'Most popular activities',
      supportingMetrics: {
        'Popular Activities': popularActivities,
      },
      keyInsight: language === 'es'
        ? `La actividad más popular tiene ${data[0]?.attempts} intentos.`
        : `The most popular activity has ${data[0]?.attempts} attempts.`,
      sql: query.sql,
    }
  }

  private formatGenericResponse(data: any[], language: string, query: any): AIResponse {
    return {
      answer: language === 'es'
        ? 'Análisis completado'
        : 'Analysis completed',
      supportingMetrics: {
        'Results': data,
      },
      keyInsight: language === 'es'
        ? 'Datos recuperados exitosamente.'
        : 'Data retrieved successfully.',
      sql: query.sql,
      explanation: query.description,
    }
  }

  private getNoDataMessage(): string {
    const language = this.context.currentPage?.includes('es') ? 'es' : 'en'
    return language === 'es'
      ? 'No hay datos disponibles para este análisis.'
      : 'Data is not available for this analysis.'
  }
}
