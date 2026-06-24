// SQL Generation Engine
import { AIContext, PageKey } from './types'
import { PAGE_BEHAVIORS } from './types'
import { SIIGO_CLIENT_ID, SIIGO_IDS_SQL, PASS_THRESHOLD } from '../../config/constants'

export interface SQLQuery {
  sql: string
  params: any[]
  description: string
}

// Base FROM + JOIN clause for all queries — enforces client scoping
const BASE_FROM = `r_user_session us
     JOIN r_user u ON u.ID = us.user_id AND u.client_id = ${SIIGO_CLIENT_ID}
     JOIN r_simulator rs ON rs.ID = us.simulator_id`

const CLIENT_FILTER = `us.simulator_id IN (${SIIGO_IDS_SQL}) AND u.client_id = ${SIIGO_CLIENT_ID}`

export class SQLGenerator {
  constructor(private context: AIContext) {}

  private applyDateFilter(baseQuery: string): string {
    if (!this.context.dateRange) return baseQuery
    const [from, to] = this.context.dateRange.split(',')
    return baseQuery.replace(
      /WHERE 1=1/,
      `WHERE 1=1 AND us.date_created BETWEEN '${from}' AND '${to}'`
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
      case 'overview':    return this.getOverviewQuery(q, intent)
      case 'simulations': return this.getSimulationsQuery(q, intent)
      case 'ranking':     return this.getRankingQuery(q, intent)
      case 'coaching':    return this.getCoachingQuery(q, intent)
      case 'activities':  return this.getActivitiesQuery(q, intent)
      case 'organization': return this.getOrganizationQuery(q, intent)
      case 'reports':     return this.getReportsQuery(q, intent)
      default:            return null
    }
  }

  private getOverviewQuery(question: string, intent: string): SQLQuery | null {
    if (question.includes('approval rate') || question.includes('pass rate')) {
      return {
        sql: `
          SELECT
            COUNT(*) AS total_simulations,
            SUM(us.passed_flag) AS approved,
            SUM(1 - us.passed_flag) AS failed,
            ROUND(AVG(us.passed_flag) * 100, 2) AS approval_rate
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
        `,
        params: [],
        description: 'Calculate overall approval rate',
      }
    }

    if (question.includes('summary') || question.includes('summarize')) {
      return {
        sql: `
          SELECT
            COUNT(*) AS total_simulations,
            COUNT(DISTINCT us.user_id) AS unique_users,
            COUNT(DISTINCT us.simulator_id) AS unique_activities,
            ROUND(AVG(us.passed_flag) * 100, 2) AS approval_rate
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
        `,
        params: [],
        description: 'Dashboard summary statistics',
      }
    }

    if (question.includes('anomal') || question.includes('issue')) {
      return {
        sql: `
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN us.closing_analysis IS NULL OR us.closing_analysis = '' THEN 1 ELSE 0 END) AS missing_scores,
            SUM(CASE WHEN us.date_created > NOW() THEN 1 ELSE 0 END) AS future_dates,
            SUM(CASE WHEN u.name IS NULL OR u.name = '' THEN 1 ELSE 0 END) AS missing_users
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
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
            u.name AS Usuario,
            COUNT(*) AS attempts,
            SUM(1 - us.passed_flag) AS failures,
            ROUND((1 - AVG(us.passed_flag)) * 100, 2) AS failure_rate,
            ROUND(AVG(us.passed_flag) * 100, 2) AS pass_rate
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
          GROUP BY us.user_id, u.name
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
            u.name AS Usuario,
            COUNT(*) AS attempts,
            ROUND(AVG(us.passed_flag) * 100, 2) AS pass_rate
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
          GROUP BY us.user_id, u.name
          ORDER BY pass_rate ASC
          LIMIT 10
        `,
        params: [],
        description: 'Find lowest performing users',
      }
    }

    if (question.includes('attempts') || question.includes('how many')) {
      return {
        sql: `
          SELECT
            COUNT(*) AS total_attempts,
            COUNT(DISTINCT us.user_id) AS unique_users,
            COUNT(DISTINCT us.simulator_id) AS unique_activities,
            ROUND(AVG(us.passed_flag) * 100, 2) AS pass_rate
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
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
            u.name AS Usuario,
            COUNT(*) AS attempts,
            ROUND(AVG(us.passed_flag) * 100, 2) AS pass_rate,
            SUM(us.passed_flag) AS passed_count
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
          GROUP BY us.user_id, u.name
          ORDER BY pass_rate DESC, passed_count DESC
          LIMIT 10
        `,
        params: [],
        description: 'Get top 10 performers by pass rate',
      }
    }

    return null
  }

  private getCoachingQuery(question: string, intent: string): SQLQuery | null {
    if (question.includes('coaching') || question.includes('needs coaching') || question.includes('risk')) {
      return {
        sql: `
          SELECT
            u.name AS Usuario,
            COUNT(*) AS attempts,
            ROUND(AVG(us.passed_flag) * 100, 2) AS pass_rate,
            ROUND((1 - AVG(us.passed_flag)) * 100, 2) AS failure_rate,
            CASE
              WHEN AVG(us.passed_flag) < 0.4 THEN 'High Risk'
              WHEN AVG(us.passed_flag) < 0.7 THEN 'Medium Risk'
              ELSE 'Low Risk'
            END AS risk_level
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
          GROUP BY us.user_id, u.name
          HAVING AVG(us.passed_flag) < 0.7
          ORDER BY pass_rate ASC
          LIMIT 10
        `,
        params: [],
        description: 'Identify users needing coaching',
      }
    }

    return null
  }

  private getActivitiesQuery(question: string, intent: string): SQLQuery | null {
    if (question.includes('worst') || question.includes('lowest')) {
      return {
        sql: `
          SELECT
            rs.name AS Actividad,
            COUNT(*) AS attempts,
            ROUND(AVG(us.passed_flag) * 100, 2) AS pass_rate
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
          GROUP BY us.simulator_id, rs.name
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
            rs.name AS Actividad,
            COUNT(*) AS attempts,
            COUNT(DISTINCT us.user_id) AS unique_users,
            ROUND(AVG(us.passed_flag) * 100, 2) AS pass_rate
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
          GROUP BY us.simulator_id, rs.name
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
            rs.name AS Actividad,
            COUNT(*) AS attempts,
            ROUND(AVG(us.passed_flag) * 100, 2) AS pass_rate
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
          GROUP BY us.simulator_id, rs.name
          ORDER BY attempts DESC
        `,
        params: [],
        description: 'Compare all activities',
      }
    }

    return null
  }

  private getOrganizationQuery(question: string, intent: string): SQLQuery | null {
    if (question.includes('team') || question.includes('department') || question.includes('level')) {
      return {
        sql: `
          SELECT
            COALESCE(u.level, 'Unknown') AS Level,
            COUNT(*) AS attempts,
            COUNT(DISTINCT us.user_id) AS users,
            ROUND(AVG(us.passed_flag) * 100, 2) AS pass_rate
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
          GROUP BY u.level
          ORDER BY pass_rate DESC
        `,
        params: [],
        description: 'Compare performance by level/team',
      }
    }

    return null
  }

  private getReportsQuery(question: string, intent: string): SQLQuery | null {
    if (question.includes('weekly') || question.includes('report')) {
      return {
        sql: `
          SELECT
            DATE(us.date_created) AS date,
            COUNT(*) AS simulations,
            ROUND(AVG(us.passed_flag) * 100, 2) AS pass_rate,
            SUM(us.passed_flag) AS passed
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
            AND us.date_created >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          GROUP BY DATE(us.date_created)
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
            COUNT(*) AS total_simulations,
            COUNT(DISTINCT us.user_id) AS active_users,
            COUNT(DISTINCT us.simulator_id) AS activities_used,
            ROUND(AVG(us.passed_flag) * 100, 2) AS overall_pass_rate,
            SUM(us.passed_flag) AS certified,
            SUM(1 - us.passed_flag) AS not_certified
          FROM ${BASE_FROM}
          WHERE 1=1 AND ${CLIENT_FILTER}
        `,
        params: [],
        description: 'Generate executive summary',
      }
    }

    return null
  }
}
