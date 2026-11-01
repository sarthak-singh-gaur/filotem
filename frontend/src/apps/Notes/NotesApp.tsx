import { useState, useEffect } from 'react'
import { usePlatformUser, usePlatformNavigation } from '../sdk'

interface Note {
  id: string
  title: string
  content: string
  category: 'General' | 'Ideas' | 'Tasks' | 'Work'
  updatedAt: string
}

export function NotesApp() {
  const { user } = usePlatformUser()
  const { switchApp } = usePlatformNavigation()

  const storageKey = `filotem_notes_${user?.id || 'guest'}`

  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved)
    } catch {
      /* ignore */
    }
    return [
      {
        id: '1',
        title: 'Welcome to Filotem Notes 📝',
        content: '# Filotem Notes\n\nThis micro-app proves the Filotem Multi-App Shell architecture!\n\n- Local-first persistence\n- Powered by the Platform App SDK\n- Pluggable & isolated\n\nStart typing your thoughts here...',
        category: 'General',
        updatedAt: new Date().toISOString()
      }
    ]
  })

  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Auto-persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes))
    } catch (e) {
      console.error('Failed to save notes:', e)
    }
  }, [notes, storageKey])

  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0]

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      category: 'General',
      updatedAt: new Date().toISOString()
    }
    setNotes(prev => [newNote, ...prev])
    setActiveNoteId(newNote.id)
  }

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotes(prev => prev.filter(n => n.id !== id))
    if (activeNoteId === id) {
      const remaining = notes.filter(n => n.id !== id)
      if (remaining.length > 0) {
        setActiveNoteId(remaining[0].id)
      }
    }
  }

  const updateActiveNote = (fields: Partial<Note>) => {
    if (!activeNote) return
    setNotes(prev =>
      prev.map(n =>
        n.id === activeNote.id
          ? { ...n, ...fields, updatedAt: new Date().toISOString() }
          : n
      )
    )
  }

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          note.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = selectedCategory === 'All' || note.category === selectedCategory
    return matchesSearch && matchesCat
  })

  const categories = ['All', 'General', 'Ideas', 'Tasks', 'Work']

  return (
    <div className="flex h-full w-full bg-stone-50/50 dark:bg-stone-950/50 overflow-hidden text-stone-900 dark:text-stone-100">
      
      {/* Notes Sidebar */}
      <div className="w-full md:w-80 h-full border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col shrink-0">
        
        {/* Notes Search & Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base tracking-tight flex items-center gap-2">
              <span>📝</span> My Notes
            </h2>
            <button
              onClick={handleCreateNote}
              className="p-1.5 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-lg hover:scale-105 active:scale-95 transition-all text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              New Note
            </button>
          </div>

          <div className="relative">
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:border-stone-400 dark:focus:border-stone-500"
            />
          </div>

          {/* Categories Pill Bar */}
          <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] font-semibold no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Note List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">
              No notes found. Click "New Note" to create one.
            </div>
          ) : (
            filteredNotes.map(note => {
              const isActive = note.id === activeNote?.id
              return (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border group relative ${
                    isActive
                      ? 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 shadow-sm'
                      : 'bg-transparent border-transparent hover:bg-stone-50 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm truncate flex-1 leading-tight">
                      {note.title || 'Untitled Note'}
                    </h3>
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-500 transition-opacity"
                      title="Delete Note"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                  <p className="text-xs text-stone-500 truncate mt-1">
                    {note.content.replace(/[#*`_]/g, '') || 'Empty note...'}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-stone-400">
                    <span className="px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-700/60 font-medium">
                      {note.category}
                    </span>
                    <span>{new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Back to Friends Table bottom bar */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between">
          <button
            onClick={() => switchApp('friends-table')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors"
          >
            <span>💬</span> Return to Friends Table
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 h-full flex flex-col bg-white dark:bg-stone-950 overflow-hidden">
        {activeNote ? (
          <div className="flex-1 flex flex-col p-6 max-w-4xl w-full mx-auto space-y-4 overflow-y-auto">
            {/* Title & Category Bar */}
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-stone-200 dark:border-stone-800">
              <input
                type="text"
                value={activeNote.title}
                onChange={e => updateActiveNote({ title: e.target.value })}
                placeholder="Note Title"
                className="flex-1 text-2xl font-black bg-transparent outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-700"
              />
              <select
                value={activeNote.category}
                onChange={e => updateActiveNote({ category: e.target.value as any })}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 outline-none"
              >
                <option value="General">General</option>
                <option value="Ideas">Ideas</option>
                <option value="Tasks">Tasks</option>
                <option value="Work">Work</option>
              </select>
            </div>

            {/* Note Content Textarea */}
            <textarea
              value={activeNote.content}
              onChange={e => updateActiveNote({ content: e.target.value })}
              placeholder="Write anything freely here (supports markdown)..."
              className="flex-1 w-full bg-transparent resize-none outline-none font-mono text-sm leading-relaxed text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-700"
            />

            {/* Note Stats Bar */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-900 flex items-center justify-between text-[11px] text-stone-400 font-mono">
              <span>{activeNote.content.split(/\s+/).filter(Boolean).length} words • {activeNote.content.length} characters</span>
              <span>Saved locally</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">
            Select or create a note to start editing.
          </div>
        )}
      </div>

    </div>
  )
}
