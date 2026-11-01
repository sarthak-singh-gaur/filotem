import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { APP_REGISTRY, type AppManifest } from '../apps/registry'
import { useSocket } from '../context/useSocket'
import { useRegisterModal } from '../utils/backButton'

export function AppLauncherModal({ 
  activeAppId, 
  onClose 
}: { 
  activeAppId: string
  onClose: () => void 
}) {
  useRegisterModal(true, onClose)
  const navigate = useNavigate()
  const { unreadCounts } = useSocket()

  const unreadTotal = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0)

  const handleLaunch = (app: AppManifest) => {
    navigate(app.route)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center font-bold text-sm">
              𝄜
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Filotem Ecosystem</h2>
              <p className="text-[11px] text-stone-500 font-medium">Switch between apps or launch new tools</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* App Grid */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          {APP_REGISTRY.map(app => {
            const IconComponent = app.icon
            const isCurrent = app.id === activeAppId
            const badge = app.badgeCount ? app.badgeCount({ unreadTotal }) : 0

            return (
              <div
                key={app.id}
                onClick={() => handleLaunch(app)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group relative ${
                  isCurrent
                    ? 'bg-stone-100 dark:bg-stone-800/80 border-stone-300 dark:border-stone-600 shadow-sm'
                    : 'bg-stone-50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 hover:shadow-md'
                }`}
              >
                {/* Active Indicator / Badge */}
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm ${
                    isCurrent
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700'
                  }`}>
                    <IconComponent className="w-6 h-6" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-sm">
                        {badge}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">{app.name}</h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed line-clamp-2">{app.description}</p>
                </div>

                <div className="mt-4 pt-2 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between text-[10px] text-stone-400 font-medium">
                  <span className="uppercase tracking-wider font-semibold">{app.category}</span>
                  <span>v{app.version}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between text-xs text-stone-400">
          <span>Filotem Ecosystem Container</span>
          <span className="font-mono text-[10px]">SDK v1.0</span>
        </div>
      </motion.div>
    </div>
  )
}

