import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  UserCheck,
  UserX,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Building2,
} from 'lucide-react'
import { useMembers } from '../api/queries'
import useDashboardData from '../hooks/useDashboardData'
import { KPICard } from '../components/ui/KPICard'
import { Skeleton, TableRowSkeleton, PageHeader } from '../components/ui/Skeleton'
import type { Member, OrgNode, UserStat } from '../api/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildOrgTree(members: Member[]): OrgNode[] {
  const nodeMap = new Map<number, OrgNode>()

  for (const m of members) {
    nodeMap.set(m.ID, {
      id:          m.ID,
      parentId:    m.parent_id ?? null,
      name:        m.name,
      email:       m.email,
      type:        m.designation || 'Advisor',
      children:    [],
      memberCount: 0,
    })
  }

  const roots: OrgNode[] = []

  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Calculate memberCount recursively
  function countMembers(node: OrgNode): number {
    const direct = node.children.length
    const nested = node.children.reduce((acc, c) => acc + countMembers(c), 0)
    node.memberCount = direct + nested
    return node.memberCount
  }

  for (const root of roots) {
    countMembers(root)
  }

  return roots
}

function hasRealHierarchy(members: Member[]): boolean {
  return members.some((m) => m.parent_id !== null && m.parent_id !== 0)
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface OrgTreeNodeProps {
  node:       OrgNode
  depth?:     number
  statsMap:   Map<string, UserStat>
}

function OrgTreeNode({ node, depth = 0, statsMap }: OrgTreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const stat = statsMap.get(node.email) ?? statsMap.get(String(node.id))

  return (
    <div className="select-none">
      <div
        className={[
          'flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={() => hasChildren && setExpanded((e) => !e)}
      >
        {/* Expand toggle */}
        <span className="w-4 h-4 flex-shrink-0 text-muted-foreground">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <span className="w-4 h-4 block" />
          )}
        </span>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium text-indigo-300">
            {node.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Name / email */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">
            {node.name}
          </span>
          <span className="text-xs text-muted-foreground truncate block">
            {node.email}
          </span>
        </div>

        {/* Type badge */}
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 hidden sm:inline-flex">
          {node.type}
        </span>

        {/* Stats */}
        {stat && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground hidden md:flex">
            <span>{stat.count} sessions</span>
            <span className={scoreColor(stat.avgScore)}>
              {stat.avgScore.toFixed(1)}%
            </span>
          </div>
        )}

        {/* Child count */}
        {hasChildren && (
          <span className="text-xs text-muted-foreground">
            {node.memberCount} member{node.memberCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <OrgTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              statsMap={statsMap}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ disabled }: { disabled: number }) {
  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 block" />
        Disabled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 block" />
      Active
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OrganizationPage() {
  const membersQuery             = useMembers()
  const { userStats, isLoading: dashLoading } = useDashboardData()

  const members: Member[] = membersQuery.data ?? []
  const isLoading         = membersQuery.isLoading || dashLoading
  const isError           = membersQuery.isError

  // ── Search / filter state ─────────────────────────────────────────────────
  const [search,     setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all')
  const [page,       setPage]       = useState(1)
  const [viewMode,   setViewMode]   = useState<'table' | 'tree'>('table')

  // ── Stats map: email → UserStat ────────────────────────────────────────────
  const statsMap = useMemo(() => {
    const map = new Map<string, UserStat>()
    for (const s of userStats) {
      if (s.userId) map.set(s.userId, s)
      map.set(s.name, s)
    }
    return map
  }, [userStats])

  // ── Aggregate KPIs ─────────────────────────────────────────────────────────
  const totalUsers    = members.length
  const activeUsers   = members.filter((m) => !m.disabled).length
  const disabledUsers = members.filter((m) => m.disabled).length

  // ── Filtered members ───────────────────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    let list = members

    if (statusFilter === 'active')   list = list.filter((m) => !m.disabled)
    if (statusFilter === 'disabled') list = list.filter((m) => m.disabled)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      )
    }

    return list
  }, [members, statusFilter, search])

  const totalPages   = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE))
  const pagedMembers = filteredMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page when filters change
  const handleSearch = (v: string) => { setSearch(v); setPage(1) }
  const handleStatus = (v: 'all' | 'active' | 'disabled') => { setStatusFilter(v); setPage(1) }

  // ── Org tree ───────────────────────────────────────────────────────────────
  const showTree      = hasRealHierarchy(members)
  const orgTree       = useMemo(() => buildOrgTree(members), [members])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title="Organization"
        subtitle="Team structure, enrollment status, and simulation performance per user."
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Enrolled"
          value={isLoading ? '—' : totalUsers}
          subtitle="All registered users"
          icon={Users}
          color="blue"
          loading={isLoading}
        />
        <KPICard
          title="Active Advisors"
          value={isLoading ? '—' : activeUsers}
          subtitle="Enabled accounts"
          icon={UserCheck}
          color="green"
          loading={isLoading}
        />
        <KPICard
          title="Inactive Users"
          value={isLoading ? '—' : disabledUsers}
          subtitle="Disabled accounts"
          icon={UserX}
          color="red"
          loading={isLoading}
        />
        <KPICard
          title="Org Levels"
          value={isLoading ? '—' : (showTree ? 'Hierarchy' : 'Flat')}
          subtitle={showTree ? 'Multi-level structure detected' : 'All users at level 0'}
          icon={Building2}
          color="violet"
          loading={isLoading}
        />
      </div>

      {/* Org tree section (only when hierarchy exists) */}
      {!isLoading && showTree && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl bg-card border border-border/50 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-violet-400" />
              Organizational Tree
            </h2>
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setViewMode(viewMode === 'tree' ? 'table' : 'tree')}
            >
              {viewMode === 'tree' ? 'Switch to table' : 'Switch to tree'}
            </button>
          </div>

          {viewMode === 'tree' ? (
            <div className="space-y-0.5">
              {orgTree.map((node) => (
                <OrgTreeNode
                  key={node.id}
                  node={node}
                  statsMap={statsMap}
                />
              ))}
            </div>
          ) : null}
        </motion.div>
      )}

      {/* User table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden"
      >
        {/* Table toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-border/50">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            User Directory
            {!isLoading && (
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({filteredMembers.length} of {totalUsers})
              </span>
            )}
          </h2>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-background border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatus(e.target.value as 'all' | 'active' | 'disabled')}
                className="pl-8 pr-3 py-1.5 text-sm rounded-lg bg-background border border-border/60 text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error state */}
        {isError && (
          <div className="px-5 py-10 text-center text-sm text-red-400">
            Failed to load organization data. Please refresh the page.
          </div>
        )}

        {/* Table */}
        {!isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {['Name', 'Email', 'Level', 'Status', 'Sessions', 'Avg Score'].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRowSkeleton key={i} cols={6} />
                    ))
                  : pagedMembers.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                        No users match your search.
                      </td>
                    </tr>
                  )
                  : pagedMembers.map((member) => {
                      const stat =
                        statsMap.get(member.email) ??
                        statsMap.get(String(member.ID)) ??
                        null

                      return (
                        <tr
                          key={member.ID}
                          className="border-b border-border/30 hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Name */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-indigo-600/25 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-indigo-300">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate max-w-[160px]">
                                  {member.name}
                                </p>
                                {member.designation && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                                    {member.designation}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-4 py-3 text-muted-foreground max-w-[200px]">
                            <span className="truncate block">{member.email}</span>
                          </td>

                          {/* Level */}
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700/50 text-xs font-medium text-foreground">
                              {member.level}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusBadge disabled={member.disabled} />
                          </td>

                          {/* Sessions */}
                          <td className="px-4 py-3 text-center">
                            {stat ? (
                              <span className="font-medium text-foreground">
                                {stat.count}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Avg Score */}
                          <td className="px-4 py-3 text-center">
                            {stat ? (
                              <span className={`font-medium ${scoreColor(stat.avgScore)}`}>
                                {stat.avgScore.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} &mdash; {filteredMembers.length} users
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs rounded-lg border border-border/50 text-foreground hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                // Show pages around current
                let pageNum: number
                if (totalPages <= 7) {
                  pageNum = i + 1
                } else if (page <= 4) {
                  pageNum = i + 1
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i
                } else {
                  pageNum = page - 3 + i
                }
                if (pageNum < 1 || pageNum > totalPages) return null
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={[
                      'w-7 h-7 text-xs rounded-lg transition-colors',
                      pageNum === page
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'border border-border/50 text-foreground hover:bg-white/5',
                    ].join(' ')}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-xs rounded-lg border border-border/50 text-foreground hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
