import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authFetch } from '../utils/apiClient'
import { useAuth } from '../context/useAuth'

export interface Friend {
  _id: string
  name: string
  username: string
  bio?: string
  avatar?: string
  isOnline?: boolean
  publicOnlineStatus?: boolean
}

export interface TableDTO {
  _id: string
  name: string
  avatar?: string
  description?: string
  members: Friend[]
  admins: Friend[]
  isDirectMessage?: boolean
}

export interface RequestDTO {
  _id: string
  from: { _id: string, name: string, username: string }
  status: string
}

export interface BadgeRequestDTO {
  _id: string
  from: { _id: string, name: string, username: string, avatar?: string }
  type: 'bestFriend' | 'lover'
}

export interface InitDataResponse {
  friends: Friend[]
  tables: TableDTO[]
  friendRequests: RequestDTO[]
  badgeRequests: BadgeRequestDTO[]
  unreadCounts: Record<string, number>
}

export const INIT_DATA_QUERY_KEY = ['initData'] as const

export function useInitData() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery<InitDataResponse>({
    queryKey: [...INIT_DATA_QUERY_KEY, user?.id],
    queryFn: async () => {
      return await authFetch('/api/users/init')
    },
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute stale time
    refetchOnWindowFocus: false,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: INIT_DATA_QUERY_KEY })
  }

  return {
    ...query,
    friends: query.data?.friends ?? [],
    tables: query.data?.tables ?? [],
    requests: query.data?.friendRequests ?? [],
    badgeRequests: query.data?.badgeRequests ?? [],
    unreadCounts: query.data?.unreadCounts ?? {},
    invalidate,
  }
}

