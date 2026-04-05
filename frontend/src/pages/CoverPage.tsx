import { useTheme } from '../context/useTheme'
import { Logo } from '../components/Logo'

export function CoverPage({ onLaunch }: { onLaunch: () => void }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-stone-50 dark:bg-stone-950 font-sans transition-colors duration-300">
      
      {/* Theme Toggle Button positioned at top right */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-full text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        )}
      </button>

      <div className="max-w-md w-full flex flex-col items-center text-center space-y-6">
        
        {/* App Logo/Icon */}
        <div className="mb-4 transform hover:scale-105 transition-transform duration-300 drop-shadow-2xl text-stone-900 dark:text-stone-100">
           <Logo className="w-32 h-32" />
        </div>

        {/* Title & Info */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
            Filotem
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-[15px] leading-relaxed max-w-sm mx-auto font-medium">
            A beautiful, lightweight, and modern platform to stay connected. Experience real-time group chats, direct messaging, and friend badges on any device.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full pt-8 flex flex-col gap-3">
          <button 
            onClick={onLaunch}
            className="w-full flex items-center justify-center gap-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-3.5 px-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
          >
            Launch Web App
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
          
          <a 
            href="/filotem.apk" 
            download
            // Fallback action if apk not available in public folder
            onClick={() => {
              // Usually the href points to the actual APK in the public/ folder
              // If it's not generated, we might want to alert the user or let it naturally 404
            }}
            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-800 py-3.5 px-4 rounded-2xl font-bold hover:bg-stone-50 dark:hover:bg-stone-800 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Download APK
          </a>
        </div>

        {/* Footer info */}
        <div className="pt-8 opacity-60 text-xs text-stone-500 font-medium">
          Version 1.0.0 • Filotem Messaging
        </div>

      </div>
    </div>
  )
}
