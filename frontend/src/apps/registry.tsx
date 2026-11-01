import React from 'react'

export interface AppBadgeContext {
  unreadTotal: number
}

export interface AppManifest {
  id: string
  name: string
  description: string
  route: string
  icon: (props: { className?: string }) => React.ReactElement
  category: 'social' | 'productivity' | 'utilities'
  version: string
  badgeCount?: (context: AppBadgeContext) => number
}

// App Icon components
export function TableAppIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function NotesAppIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
      <path d="M15 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  )
}

/**
 * Global App Registry catalog for the Filotem Multi-App Shell.
 * To register a new app into the platform, simply add its manifest here.
 */
export const APP_REGISTRY: AppManifest[] = [
  {
    id: 'friends-table',
    name: 'Friends Table',
    description: 'Real-time social groups, direct messaging, and friend badges',
    route: '/app',
    icon: TableAppIcon,
    category: 'social',
    version: '1.0.0',
    badgeCount: ({ unreadTotal }) => unreadTotal
  },
  {
    id: 'notes',
    name: 'Filotem Notes',
    description: 'Quick local scratchpad, checklists, and personal markdown notes',
    route: '/app/notes',
    icon: NotesAppIcon,
    category: 'productivity',
    version: '1.0.0'
  }
]

export function getAppById(id: string): AppManifest | undefined {
  return APP_REGISTRY.find(app => app.id === id)
}

export function getAppByPath(pathname: string): AppManifest | undefined {
  if (pathname.startsWith('/app/notes')) {
    return getAppById('notes')
  }
  return getAppById('friends-table')
}

