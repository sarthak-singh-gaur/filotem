import { useState, useEffect, useRef, useCallback } from 'react'
import { authFetch } from '../../../utils/apiClient'
import { useAuth } from '../../../context/useAuth'
import { useSocket } from '../../../context/useSocket'

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, refreshSession } = useAuth()
  const { requestNotificationPermission } = useSocket()
  
  const [name, setName] = useState(user?.name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatar, setAvatar] = useState(user?.avatar || '')
  const [allowNotifications, setAllowNotifications] = useState(user?.allowNotifications ?? true)
  const [publicOnlineStatus, setPublicOnlineStatus] = useState(user?.publicOnlineStatus ?? true)
  const [loading, setLoading] = useState(false)
  const [cropImage, setCropImage] = useState<string | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large! Maximum allowed is 5MB.')
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setCropImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
    // Reset the input so re-selecting the same file works
    e.target.value = ''
  }

  const handleCropDone = (croppedDataUrl: string) => {
    setAvatar(croppedDataUrl)
    setCropImage(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)

    try {
      await authFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        data: { name, username, bio, avatar, allowNotifications, publicOnlineStatus }
      })
      
      // Instantly sync context so the app updates everywhere
      await refreshSession()
      onClose()
    } catch (err: any) {
      alert(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleEnableNotifications = async () => {
    await requestNotificationPermission()
    setAllowNotifications(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 font-sans tracking-tight">Edit Profile</h2>
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center space-y-3 relative">
            <div className="w-24 h-24 rounded-full border-4 border-stone-100 dark:border-stone-800 overflow-hidden bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-3xl font-bold text-stone-300 relative group">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                name[0]?.toUpperCase() || '?'
              )}
              
              <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            <p className="text-xs text-stone-400 font-medium">Click image to upload DP (Max 5MB)</p>
          </div>

          <div className="space-y-4">
            {/* ENABLE NOTIFICATIONS BUTTON */}
            <button
               type="button"
               onClick={handleEnableNotifications}
               className="w-full py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700/80 text-stone-900 dark:text-stone-100 rounded-2xl flex items-center justify-center gap-2 transition-all group active:scale-95"
            >
              <div className="p-1.5 bg-indigo-500 rounded-lg text-white group-hover:animate-shake">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              </div>
              <span className="text-sm font-bold tracking-tight">Enable System Notifications</span>
            </button>

            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Display Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors text-sm font-semibold text-stone-900 dark:text-stone-100"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors text-sm text-stone-900 dark:text-stone-100"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">About Me</label>
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors text-sm resize-none text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">Alert Sounds</h3>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">Play sound for new messages</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowNotifications(!allowNotifications)}
                  className={`w-12 h-6 flex items-center rounded-full transition-colors ${allowNotifications ? 'bg-indigo-500' : 'bg-stone-300 dark:bg-stone-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${allowNotifications ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">Online Visibility</h3>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">Let others see when you are online</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPublicOnlineStatus(!publicOnlineStatus)}
                  className={`w-12 h-6 flex items-center rounded-full transition-colors ${publicOnlineStatus ? 'bg-indigo-500' : 'bg-stone-300 dark:bg-stone-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${publicOnlineStatus ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* My Connections (Badges) */}
          <BadgeConnectionsSection />

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl font-bold tracking-wide transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Masterpiece Updates'}
          </button>
        </form>

      </div>

      {/* Image Crop Modal */}
      {cropImage && (
        <ImageCropper
          src={cropImage}
          onDone={handleCropDone}
          onCancel={() => setCropImage(null)}
        />
      )}
    </div>
  )
}

function BadgeConnectionsSection() {
  const [bestFriend, setBestFriend] = useState<any>(null)
  const [lover, setLover] = useState<any>(null)

  const fetchStatus = () => {
    authFetch('/api/badges/status')
      .then((data: any) => {
        setBestFriend(data.bestFriend)
        setLover(data.lover)
      })
      .catch(console.error)
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleRemove = async (type: string) => {
    if (!window.confirm(`Remove your ${type === 'bestFriend' ? 'Best Friend' : 'Lover'} badge? This removes it for both of you.`)) return
    try {
      await authFetch(`/api/badges/remove/${type}`, { method: 'DELETE' })
      fetchStatus()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (!bestFriend && !lover) return null

  return (
    <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
      <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">My Connections</h3>
      {bestFriend && (
        <div className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-800/30 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-lg">⭐</span>
            <div>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{bestFriend.name}</p>
              <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Best Friend</p>
            </div>
          </div>
          <button
            onClick={() => handleRemove('bestFriend')}
            className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors font-medium border border-transparent hover:border-red-200 dark:hover:border-red-800"
          >
            Remove
          </button>
        </div>
      )}
      {lover && (
        <div className="flex items-center justify-between p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/30 dark:border-rose-800/30 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-lg">❤️</span>
            <div>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{lover.name}</p>
              <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Lover</p>
            </div>
          </div>
          <button
            onClick={() => handleRemove('lover')}
            className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors font-medium border border-transparent hover:border-red-200 dark:hover:border-red-800"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Image Cropper Component ────────────────────────────────────────────────
function ImageCropper({
  src,
  onDone,
  onCancel
}: {
  src: string
  onDone: (dataUrl: string) => void
  onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const offsetStart = useRef({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Load image once
  useEffect(() => {
    const img = new Image()
    img.onload = () => { imgRef.current = img }
    img.src = src
  }, [src])

  // Mouse handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    offsetStart.current = { ...offset }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [offset])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    setOffset({
      x: offsetStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetStart.current.y + (e.clientY - dragStart.current.y)
    })
  }, [dragging])

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  // Scroll to zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(prev => Math.min(3, Math.max(0.5, prev - e.deltaY * 0.002)))
  }, [])

  const handleApply = () => {
    const img = imgRef.current
    if (!img) return

    const size = 400 // output resolution
    const canvas = canvasRef.current!
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    // The preview circle is 256px on screen (w-64 = 16rem = 256px)
    const previewSize = 256
    const scale = size / previewSize

    // Calculate the draw parameters
    const imgAspect = img.width / img.height
    let drawW: number, drawH: number
    if (imgAspect > 1) {
      drawH = previewSize * zoom
      drawW = drawH * imgAspect
    } else {
      drawW = previewSize * zoom
      drawH = drawW / imgAspect
    }

    const drawX = (previewSize - drawW) / 2 + offset.x
    const drawY = (previewSize - drawH) / 2 + offset.y

    // Clip to circle
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    ctx.drawImage(img, drawX * scale, drawY * scale, drawW * scale, drawH * scale)

    onDone(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm bg-stone-900 rounded-3xl shadow-2xl overflow-hidden border border-stone-700">
        <div className="p-4 border-b border-stone-700 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Adjust Photo</h3>
          <button onClick={onCancel} className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-stone-700 transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Crop Area */}
        <div
          ref={containerRef}
          className="relative w-64 h-64 mx-auto my-6 rounded-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
        >
          {/* Grid overlay for visual reference */}
          <div className="absolute inset-0 z-10 pointer-events-none rounded-full border-2 border-white/30" />
          <div className="absolute inset-0 z-10 pointer-events-none" style={{boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.15), inset 0 0 30px rgba(0,0,0,0.3)'}} />

          <img
            src={src}
            alt="Crop preview"
            draggable={false}
            className="absolute select-none"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: dragging ? 'none' : 'transform 0.1s ease-out'
            }}
          />
        </div>

        {/* Zoom Slider */}
        <div className="px-6 pb-2 flex items-center gap-3">
          <svg className="text-stone-500 shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none bg-stone-700 accent-indigo-500 cursor-pointer"
          />
          <svg className="text-stone-500 shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/><path d="M11 8v6"/></svg>
        </div>

        <p className="text-center text-[10px] text-stone-500 uppercase tracking-widest font-bold pb-3">Drag to reposition • Scroll to zoom</p>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-stone-700">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-stone-800 text-stone-300 rounded-xl font-bold text-sm hover:bg-stone-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition"
          >
            Apply
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
