import { useState, useEffect } from 'react'
import { authFetch } from '../../../utils/apiClient'

interface FriendProfile {
  _id: string
  name: string
  username: string
  bio?: string
  avatar?: string
  bestFriendId?: string | null
  loverId?: string | null
}

export function FriendProfileModal({ 
  friendId, 
  onClose 
}: { 
  friendId: string
  onClose: () => void 
}) {
  const [profile, setProfile] = useState<FriendProfile | null>(null)
  const [badges, setBadges] = useState<{ bestFriend: any; lover: any }>({ bestFriend: null, lover: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [userData, badgeData] = await Promise.all([
          authFetch(`/api/users/${friendId}`),
          authFetch('/api/badges/status').catch(() => ({ bestFriend: null, lover: null }))
        ])
        setProfile(userData)
        setBadges(badgeData)
      } catch (err) {
        console.error('Failed to load profile:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [friendId])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-10 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-stone-300 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-8 text-center">
          <p className="text-stone-500 text-sm">Could not load profile.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-stone-200 dark:bg-stone-800 rounded-xl text-sm font-semibold">Close</button>
        </div>
      </div>
    )
  }

  // Check mutual badge status
  const isBestFriend = badges.bestFriend?._id === friendId
  const isLover = badges.lover?._id === friendId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="w-full max-w-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with gradient banner */}
        <div className="relative">
          <div className="h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 opacity-80" />
          
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-black/30 backdrop-blur-sm text-white/80 hover:text-white rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>

          {/* Avatar overlapping banner */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-stone-900 bg-stone-200 dark:bg-stone-800 overflow-hidden shadow-xl flex items-center justify-center text-3xl font-bold text-stone-400">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name[0]?.toUpperCase()
              )}
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="pt-16 pb-6 px-6 text-center">
          {/* Name + Badges */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{profile.name}</h2>
            {isBestFriend && <span title="Your Best Friend" className="text-base">⭐</span>}
            {isLover && <span title="Your Lover" className="text-base">❤️</span>}
          </div>
          <p className="text-sm text-stone-500 font-medium">@{profile.username}</p>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-4 px-4 py-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-800">
              <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Relationship badges */}
          {(isBestFriend || isLover) && (
            <div className="mt-4 space-y-2">
              {isBestFriend && (
                <div className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/40 dark:border-amber-800/30">
                  <span className="text-sm">⭐</span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Your Best Friend</span>
                </div>
              )}
              {isLover && (
                <div className="flex items-center justify-center gap-2 py-2 px-4 bg-rose-50/70 dark:bg-rose-950/20 rounded-xl border border-rose-200/40 dark:border-rose-800/30">
                  <span className="text-sm">❤️</span>
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-widest">Your Lover</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
