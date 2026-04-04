import { useState, useEffect } from 'react'
import { authFetch } from '../../utils/apiClient'
import { useAuth } from '../../context/useAuth'

interface UserDTO {
  _id: string
  name: string
  username: string
}

interface RequestDTO {
  _id: string
  from: UserDTO
  status: string
}

export function NetworkingTab() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<RequestDTO[]>([])
  const [searchResults, setSearchResults] = useState<UserDTO[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [myFriendIds, setMyFriendIds] = useState<Set<string>>(new Set())

  const fetchRequests = () => {
    authFetch('/api/friends/requests')
      .then(setRequests)
      .catch(console.error)
  }

  const fetchFriends = () => {
    authFetch('/api/friends')
      .then((data: any[]) => setMyFriendIds(new Set(data.map(f => f._id))))
      .catch(console.error)
  }

  useEffect(() => {
    fetchRequests()
    fetchFriends()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      setIsSearching(true)
      authFetch(`/api/users/search?q=${searchQuery}`)
        .then(res => {
          // Filter out ourself from search results
          setSearchResults(res.filter((u: UserDTO) => u._id !== user?.id))
        })
        .catch(console.error)
        .finally(() => setIsSearching(false))
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery, user?.id])

  const handleAction = async (endpoint: string) => {
    try {
      await authFetch(endpoint, { method: 'PUT' })
      fetchRequests()
      fetchFriends() // Refresh friends list if accepted
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleAddFriend = async (toUserId: string) => {
    try {
      await authFetch('/api/friends/request', {
        method: 'POST',
        data: { toUserId }
      })
      alert('Friend request sent!')
      setSearchQuery('')
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Requests Section */}
      <div className="p-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/20">
        <h2 className="text-xl font-bold font-sans text-stone-900 dark:text-stone-100 mb-4">Pending Requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-stone-500">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req._id} className="flex items-center justify-between p-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-700 flex items-center justify-center font-bold text-stone-600 dark:text-stone-300">
                    {req.from.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-stone-900 dark:text-white">{req.from.name}</p>
                    <p className="text-xs text-stone-500">@{req.from.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAction(`/api/friends/requests/${req._id}/accept`)}
                    className="p-2 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    Accept
                  </button>
                  <button 
                    onClick={() => handleAction(`/api/friends/requests/${req._id}/reject`)}
                    className="p-2 bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300 rounded-lg text-xs font-semibold hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badge Requests Section */}
      <BadgeRequestsSection />

      {/* Search Section */}
      <div className="p-5 flex flex-col flex-1">
        <h2 className="text-xl font-bold font-sans text-stone-900 dark:text-stone-100 mb-4">Discover</h2>
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 pl-10 outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors text-sm"
          />
          <svg className="absolute left-3 top-3.5 text-stone-400 w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isSearching && <p className="text-sm text-stone-500 text-center">Searching...</p>}
          
          {!isSearching && searchQuery && searchResults.length === 0 && (
            <p className="text-sm text-stone-500 text-center">No users found for "{searchQuery}"</p>
          )}

          <div className="space-y-2">
            {searchResults.map(res => {
              const isFriend = myFriendIds.has(res._id)
              return (
                <div key={res._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors border border-transparent dark:hover:border-stone-800">
                  <div className="flex flex-col">
                    <p className="font-semibold text-stone-900 dark:text-stone-100">{res.name}</p>
                    <p className="text-sm text-stone-500">@{res.username}</p>
                  </div>
                  {isFriend ? (
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-[11px] font-bold tracking-wide uppercase border border-green-200 dark:border-green-800/50">
                      Friends
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleAddFriend(res._id)}
                      className="px-4 py-2 bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100 rounded-lg text-xs font-semibold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-stone-700 shadow-sm"
                    >
                      Add
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

interface BadgeRequestDTO {
  _id: string
  from: { _id: string; name: string; username: string; avatar?: string }
  type: 'bestFriend' | 'lover'
}

function BadgeRequestsSection() {
  const [badgeRequests, setBadgeRequests] = useState<BadgeRequestDTO[]>([])

  const fetchBadgeRequests = () => {
    authFetch('/api/badges/requests')
      .then((data: any) => setBadgeRequests(data.incoming || []))
      .catch(console.error)
  }

  useEffect(() => {
    fetchBadgeRequests()
  }, [])

  const handleBadgeAction = async (id: string, action: 'accept' | 'reject') => {
    try {
      await authFetch(`/api/badges/requests/${id}/${action}`, { method: 'PUT' })
      fetchBadgeRequests()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (badgeRequests.length === 0) return null

  return (
    <div className="p-5 border-b border-stone-200 dark:border-stone-800">
      <h2 className="text-base font-bold font-sans text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        Badge Requests
      </h2>
      <div className="space-y-2">
        {badgeRequests.map(req => (
          <div key={req._id} className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50/50 to-rose-50/50 dark:from-amber-950/20 dark:to-rose-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-700 flex items-center justify-center font-bold text-stone-600 dark:text-stone-300 overflow-hidden">
                {req.from.avatar ? (
                  <img src={req.from.avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  req.from.name[0]?.toUpperCase()
                )}
              </div>
              <div>
                <p className="font-semibold text-sm text-stone-900 dark:text-white">{req.from.name}</p>
                <p className="text-xs text-stone-500">
                  wants to be your {req.type === 'bestFriend' ? '⭐ Best Friend' : '❤️ Lover'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBadgeAction(req._id, 'accept')}
                className="px-3 py-1.5 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Accept
              </button>
              <button
                onClick={() => handleBadgeAction(req._id, 'reject')}
                className="px-3 py-1.5 bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300 rounded-lg text-xs font-semibold hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
