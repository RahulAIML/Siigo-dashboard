import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import type { Activity, Member, Simulation, SimReport } from './types'
import {
  fetchActivities, fetchMembers, fetchSimReport, fetchSimulations,
} from './client'
import {
  CACHE_ACTIVITIES_MS, CACHE_MEMBERS_MS, CACHE_SIMULATIONS_MS,
} from '../config/constants'
import { keepPreviousData } from '@tanstack/react-query'

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useActivities(): UseQueryResult<Activity[]> {
  return useQuery({
    queryKey: ['activities'],
    queryFn:  fetchActivities,
    staleTime: CACHE_ACTIVITIES_MS,
    gcTime:    CACHE_ACTIVITIES_MS * 2,
  })
}

export function useSimulations(from: string, to: string): UseQueryResult<Simulation[]> {
  return useQuery({
    queryKey:      ['simulations', from, to],
    queryFn:       () => fetchSimulations(from, to),
    staleTime:     CACHE_SIMULATIONS_MS,
    gcTime:        CACHE_SIMULATIONS_MS * 2,
    placeholderData: keepPreviousData,
  })
}

export function useMembers(): UseQueryResult<Member[]> {
  return useQuery({
    queryKey:  ['members'],
    queryFn:   fetchMembers,
    staleTime: CACHE_MEMBERS_MS,
    gcTime:    CACHE_MEMBERS_MS * 2,
  })
}

export function useSimReport(simId: number | null): UseQueryResult<SimReport> {
  return useQuery({
    queryKey:  ['simReport', simId],
    queryFn:   () => fetchSimReport(simId!),
    enabled:   simId !== null,
    staleTime: Infinity,  // sessions are immutable
    gcTime:    Infinity,
  })
}

// ─── Prefetch ─────────────────────────────────────────────────────────────────

export async function prefetchAll(
  queryClient: QueryClient,
  from:        string,
  to:          string,
): Promise<void> {
  await Promise.allSettled([
    queryClient.prefetchQuery({ queryKey: ['activities'],          queryFn: fetchActivities,                staleTime: CACHE_ACTIVITIES_MS }),
    queryClient.prefetchQuery({ queryKey: ['simulations', from, to], queryFn: () => fetchSimulations(from, to), staleTime: CACHE_SIMULATIONS_MS }),
    queryClient.prefetchQuery({ queryKey: ['members'],             queryFn: fetchMembers,                   staleTime: CACHE_MEMBERS_MS }),
  ])
}
