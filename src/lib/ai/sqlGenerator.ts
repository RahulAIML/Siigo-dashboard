// SQL Generation Engine
import { AIContext, PageKey } from './types'
import { PAGE_BEHAVIORS } from './types'

export interface SQLQuery {
  sql: string
  params: any[]
  description: string
}

export class SQLGenerator {
  constructor(private context: AIContext) {}

  private applyDateFilter(baseQuery: string): string {
    if (!this.context.dateRange) return baseQuery
    const [from, to] = this.context.dateRange.split(',')
    return baseQuery.replace(
      /WHERE 1=1/,
      `WHERE 1=1 AND Fecha_y_Hora BETWEEN '${from}' AND '${to}'`
    )
  }

  private applyFilters(baseQuery: string): string {
    let query = baseQuery
    Object.entries(this.context.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.replace(
          /WHERE 1=1/,
          `WHERE 1=1 AND ${key} = '${value}'`
        )
      }
    })
    return query
  }

  generateQuery(question: string, intent: string): SQLQuery | null {
    const pageKey = this.getPageKey()
    const query = this.getPageSpecificQuery(pageKey, question, intent)
    
    if (!query) return null

    let sql = query.sql
    sql = this.applyDateFilter(sql)
    sql = this.applyFilters(sql)

    return { ...query, sql }
  }

  private getPageKey(): PageKey {
    const pageMap: Record<string, PageKey> = {
      '/': 'overview',
      '/simulations': 'simulations',
      '/leaderboard': 'ranking',
      '/coaching': 'coaching',
      '/activities': 'activities',
      '/organization': 'organization',
      '/reports': 'reports',
    }
    return pageMap[this.context.route] || 'overview'
  }

  private getPageSpecificQuery(pageKey: PageKey, question: string, intent: string): SQLQuery | null {
    const q = question.toLowerCase()
    
    switch (pageKey) {
      case 'overview':
        return this.getOverviewQuery(q, intent)
      case 'simulations':
        return this.getSimulationsQuery(q, intent)
      case 'ranking':
        return this.getRankingQuery(q, intent)
      case 'coaching':
        return this.getCoachingQuery(q, intent)
      case 'activities':
        return this.getActivitiesQuery(q, intent)
      case 'organization':
        return this.getOrganizationQuery(q, intent)
      case 'reports':
        return this.getReportsQuery(q, intent)
      default:
        return null
    }
  }

  private getOverviewQuery(question: string, intent: string): SQLQuery | null {
    if (question.includes('approval rate') || question.includes('pass rate')) {
      return {
        sql: `
          SELECT 
            COUNT(*) as total_simulations,
            SUM(CASE WHEN Calificacion >= 70 THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN Calificacion < 70 THEN 1 ELSE 0 END) as failed,
            ROUND((SUM(CASE WHEN Calificacion >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as approval_rate
          FROM r_simulacion
          WHERE 1=1
        `,
        params: [],
        description: 'Calculate overall approval rate',
      }
    }

    if (question.includes('summary') || question.includes('summarize')) {
      return {
        sql: `
          SELECT 
            COUNT(*) as total_simulations,
            COUNT(DISTINCT Usuario) as unique_users,
            COUNT(DISTINCT Actividad) as unique_activities,
            ROUND(AVG(Calificacion), 2) as avg_score,
            ROUND((SUM(CASE WHEN Calificacion >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as approval_rate
          FROM r_simulacion
          WHERE 1=1
        `,
        params: [],
        description: 'Dashboard summary statistics',
      }
    }

    if (question.includes('anomal') || question.includes('issue')) {
      return {
        sql: `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN Calificacion IS NULL THEN 1 ELSE 0 END) as missing_scores,
            SUM(CASE WHEN Fecha_y_Hora > NOW() THEN 1 ELSE 0 END) as future_dates,
            SUM(CASE WHEN Usuario IS NULL OR Usuario = '' THEN 1 ELSE 0 END) as missing_users
          FROM r_simulacion
          WHERE 1=1
        `,
        params: [],
        description: 'Detect data anomalies',
      }
    }

    return null
  }

  private getSimulationsQuery(question: string, intent: string): SQLQuery | null {
    if (question.includes('fail') || question.includes('failing')) {
      return {
        sql: `
          SELECT 
            Usuario,
            COUNT(*) as attempts,
            SUM(CASE WHEN Calificacion < 70 THEN 1 ELSE 0 END) as failures,
            ROUND(AVG(Calificacion), 2) as avg_score,
            ROUND((SUM(CASE WHEN Calificacion >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as pass_rate
          FROM r_simulacion
          WHERE 1=1
          GROUP BY Usuario
          ORDER BY failures DESC
          LIMIT 10
        `,
        params: [],
        description: 'Find users with most failures',
      }
    }

    if (question.includes('lowest') || question.includes('worst')) {
      return {
        sql: `
          SELECT 
            Usuario,
            COUNT(*) as attempts,
            ROUND(AVG(Calificacion), 2) as avg_score,
            ROUND(MIN(Calificacion), 2) as min_score
          FROM r_simulacion
          WHERE 1=1
          GROUP BY Usuario
          ORDER BY avg_score ASC
          LIMIT 10
        `,
        params: [],
        description: 'Find lowest performing users',
      }
    }

    if (question.includes('highest failure rate') || question.includes('most failures')) {
      return {
        sql: `
          SELECT 
            Actividad,
            COUNT(*) as attempts,
            SUM(CASE WHEN Calificacion < 70 THEN 1 ELSE 0 END) as failures,
            ROUND((SUM(CASE WHEN Calificacion < 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as failure_rate
          FROM r_simulacion
          WHERE 1=1
          GROUP BY Actividad
          ORDER BY failure_rate DESC
          LIMIT 10
        `,
        params: [],
        description: 'Find simulations with highest failure rate',
      }
    }

    if (question.includes('attempts') || question.includes('how many')) {
      return {
        sql: `
          SELECT 
            COUNT(*) as total_attempts,
            COUNT(DISTINCT Usuario) as unique_users,
            COUNT(DISTINCT Actividad) as unique_activities
          FROM r_simulacion
          WHERE 1=1
        `,
        params: [],
        description: 'Count total attempts',
      }
    }

    return null
  }

  private getRankingQuery(question: string, intent: string): SQLQuery | null {
    if (question.includes('top') || question.includes('best')) {
      return {
        sql: `
          SELECT 
            Usuario,
            COUNT(*) as attempts,
            ROUND(AVG(Calificacion), 2) as avg_score,
            ROUND((SUM(CASE WHEN Calificacion >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as pass_rate,
            ROW_NUMBER() OVER (ORDER BY AVG(Calificacion) DESC) as rank
          FROM r_simulacion
          WHERE 1=1
          GROUP BY Usuario
          ORDER BY avg_score DESC
          LIMIT 10
        `,
        params: [],
        description: 'Get top 10 performers',
      }
    }

    if (question.includes('improve') || question.includes('improved')) {
      return {
        sql: `
          SELECT 
            Usuario,
            ROUND(AVG(Calificacion), 2) as recent_avg,
            LAG(ROUND(AVG(Calificacion), 2)) OVER (PARTITION BY Usuario ORDER BY Fecha_y_Hora) as previous_avg,
            ROUND(AVG(Calificacion) - LAG(ROUND(AVG(Calificacion), 2)) OVER (PARTITION BY Usuario ORDER BY Fecha_y_Hora), 2) as improvement
          FROM (
            SELECT Usuario, Calificacion, Fecha_y_Hora
            FROM r_simulacion
            WHERE 1=1
            ORDER BY Fecha_y_Hora DESC
          ) ranked
          GROUP BY Usuario, Fecha_y_Hora
          ORDER BY improvement DESC
          LIMIT 10
        `,
        params: [],
        description: 'Find most improved users',
      }
    }

    return null
  }

  private getCoachingQuery(question: string, intent: string): SQLQuery | null {
    if (question.includes('coaching') || question.includes('needs coaching')) {
      return {
        sql: `
          SELECT 
            Usuario,
            COUNT(*) as attempts,
            ROUND(AVG(Calificacion), 2) as avg_score,
            ROUND((SUM(CASE WHEN Calificacion < 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as failure_rate,
            CASE 
              WHEN AVG(Calificacion) < 60 THEN 'High Risk'
              WHEN AVG(Calificacion) < 70 THEN 'Medium Risk'
              ELSE 'Low Risk'
            END as risk_level
          FROM r_simulacion
          WHERE 1=1
          GROUP BY Usuario
          HAVING AVG(Calificacion) < 70
          ORDER BY avg_score ASC
          LIMIT 10
        `,
        params: [],
        description: 'Identify users needing coaching',
      }
    }

    if (question.includes('likely to fail') || question.includes('risk')) {
      return {
        sql: `
          SELECT 
            Usuario,
            COUNT(*) as attempts,
            ROUND(AVG(Calificacion), 2) as avg_score,
            ROUND((SUM(CASE WHEN Calificacion < 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as failure_rate,
            MAX(Calificacion) as best_score
          FROM r_simulacion
          WHERE 1=1
          GROUP BY Usuario
          HAVING AVG(Calificacion) < 65 AND COUNT(*) >= 3
          ORDER BY avg_score ASC
          LIMIT 10
        `,
        params: [],
        description: 'Find users at risk of failing',
      }
    }

    return null
  }

  private getActivitiesQuery(question: string, intent: string): SQLQuery | null {
    if (question.includes('worst') || question.includes('lowest')) {
      return {
        sql: `
          SELECT 
            Actividad,
            COUNT(*) as attempts,
            ROUND(AVG(Calificacion), 2) as avg_score,
            ROUND((SUM(CASE WHEN Calificacion >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as pass_rate
          FROM r_simulacion
          WHERE 1=1
          GROUP BY Actividad
          ORDER BY pass_rate ASC
          LIMIT 10
        `,
        params: [],
        description: 'Find worst performing activities',
      }
    }

    if (question.includes('popular') || question.includes('most used')) {
      return {
        sql: `
          SELECT 
            Actividad,
            COUNT(*) as attempts,
            COUNT(DISTINCT Usuario) as unique_users,
            ROUND((SUM(CASE WHEN Calificacion >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as pass_rate
          FROM r_simulacion
          WHERE 1=1
          GROUP BY Actividad
          ORDER BY attempts DESC
          LIMIT 10
        `,
        params: [],
        description: 'Find most popular activities',
      }
    }

    if (question.includes('compare')) {
      return {
        sql: `
          SELECT 
            Actividad,
            COUNT(*) as attempts,
            ROUND(AVG(Calificacion), 2) as avg_score,
            ROUND((SUM(CASE WHEN Calificacion >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as pass_rate
          FROM r_simulacion
          WHERE 1=1
          GROUP BY Actividad
          ORDER BY attempts DESC
        `,
        params: [],
        description: 'Compare all activities',
      }
    }

    return null
  }

  private getOrganizationQuery(question: string, intent: string): SQLQuery | null {
    if (question.includes('team') || question.includes('department')) {
      return {
        sql: `
          SELECT 
            Departamento,
            COUNT(*) as attempts,
            COUNT(DISTINCT Usuario) as users,
            ROUND(AVG(Calificacion), 2) as avg_score,
            ROUND((SUM(CASE WHEN Calificacion >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as pass_rate
          FROM r_simulacion
          WHERE 1=1
          GROUP BY Departamento
          ORDER BY avg_score DESC
        `,
        params: [],
        description: 'Compare team performance',
      }
    }

    return null
  }

  private getReportsQuery(question: string, intent: string): SQLQuery | null {
    if (question.includes('weekly') || question.includes('report')) {
      return {
        sql: `
          SELECT 
            DATE(Fecha_y_Hora) as date,
            COUNT(*) as simulations,
            ROUND(AVG(Calificacion), 2) as avg_score,
            ROUND((SUM(CASE WHEN Calificacion >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as pass_rate
          FROM r_simulacion
          WHERE 1=1 AND Fecha_y_Hora >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          GROUP BY DATE(Fecha_y_Hora)
          ORDER BY date DESC
        `,
        params: [],
        description: 'Generate weekly performance report',
      }
    }

    if (question.includes('executive') || question.includes('summary')) {
      return {
        sql: `
          SELECT 
            COUNT(*) as total_simulations,
            COUNT(DISTINCT Usuario) as active_users,
            COUNT(DISTINCT Actividad) as activities_used,
            ROUND(AVG(Calificacion), 2) as overall_avg_score,
            ROUND((SUM(CASE WHEN Calificacion >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as overall_pass_rate,
            SUM(CASE WHEN Calificacion >= 70 THEN 1 ELSE 0 END) as certified,
            SUM(CASE WHEN Calificacion < 70 THEN 1 ELSE 0 END) as not_certified
          FROM r_simulacion
          WHERE 1=1
        `,
        params: [],
        description: 'Generate executive summary',
      }
    }

    return null
  }
}
