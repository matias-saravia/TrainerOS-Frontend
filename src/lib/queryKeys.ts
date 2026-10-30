// ─── Query Key Factories ────────────────────────────────────────────
// Centralized query keys for TanStack Query cache management.
// Each factory produces typed, hierarchical keys for granular invalidation.

export const exerciseKeys = {
  all: ['exercises'] as const,
  lists: () => [...exerciseKeys.all, 'list'] as const,
  list: (muscle?: string) => [...exerciseKeys.lists(), { muscle }] as const,
  detail: (id: string) => [...exerciseKeys.all, 'detail', id] as const,
}

export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (status?: string) => [...clientKeys.lists(), { status }] as const,
  detail: (id: string) => [...clientKeys.all, 'detail', id] as const,
  me: (userId: string) => [...clientKeys.all, 'me', userId] as const,
  weightHistory: (clientId: string, exerciseId: string) =>
    [...clientKeys.detail(clientId), 'weight', exerciseId] as const,
}

export const routineKeys = {
  all: ['routines'] as const,
  lists: () => [...routineKeys.all, 'list'] as const,
  list: () => [...routineKeys.lists()] as const,
  detail: (id: string) => [...routineKeys.all, 'detail', id] as const,
}

export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (clientId?: string) => [...sessionKeys.lists(), { clientId }] as const,
  detail: (id: string) => [...sessionKeys.all, 'detail', id] as const,
}

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  recentClients: () => [...dashboardKeys.all, 'recent-clients'] as const,
  upcomingSessions: () => [...dashboardKeys.all, 'upcoming-sessions'] as const,
  heatmap: () => [...dashboardKeys.all, 'heatmap'] as const,
}

export const clientRoutineKeys = {
  all: ['client-routines'] as const,
  byClient: (clientId: string) =>
    [...clientRoutineKeys.all, 'client', clientId] as const,
}
