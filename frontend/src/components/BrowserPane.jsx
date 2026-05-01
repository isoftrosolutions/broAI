import { useEffect, useMemo, useState } from 'react'

const BrowserPane = () => {
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [fieldValues, setFieldValues] = useState({})

  const refreshSnapshot = async () => {
    try {
      const response = await fetch('http://localhost:8001/snapshot')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.ok) {
        setSnapshot(data)
        setError('')
        setUrlInput(data.url || '')
      } else {
        setSnapshot(null)
        setError(data.error || 'Browser bridge offline')
      }
    } catch (err) {
      setSnapshot(null)
      setError('Browser bridge unreachable')
    }
  }

  useEffect(() => {
    let alive = true
    const tick = async () => {
      if (!alive) return
      await refreshSnapshot()
    }
    tick()
    const timer = setInterval(tick, 2000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const sendAction = async (action, payload = {}) => {
    setBusy(true)
    try {
      const response = await fetch('http://localhost:8001/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      await response.json()
      await refreshSnapshot()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const visibleElements = useMemo(() => snapshot?.elements || [], [snapshot])

  return (
    <div className="h-full flex flex-col bg-[#f8f6f0] animate-fade-in">
      {/* Browser Toolbar */}
      <div className="px-6 py-4 bg-white border-b border-[#e5e0d4] flex items-center gap-4">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => sendAction('back')} 
            disabled={busy} 
            className="p-1.5 hover:bg-[#f1ede3] rounded-lg disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button 
            onClick={() => sendAction('forward')} 
            disabled={busy} 
            className="p-1.5 hover:bg-[#f1ede3] rounded-lg disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button 
            onClick={refreshSnapshot} 
            disabled={busy} 
            className="p-1.5 hover:bg-[#f1ede3] rounded-lg disabled:opacity-30 transition-colors"
          >
            <svg className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>

        <div className="flex-1 relative flex items-center">
          <div className="absolute left-3 text-[#706a5a] opacity-40">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendAction('open_url', { url: urlInput })}
            className="w-full pl-9 pr-4 py-1.5 bg-[#f8f6f0] border border-[#e5e0d4] rounded-full text-xs font-mono outline-none focus:border-[#b85c38] focus:ring-4 focus:ring-[#b85c38]/5"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Screenshot Panel */}
        <div className="flex-1 p-6 overflow-auto scrollbar-thin bg-[#fcfbf9]">
          {snapshot?.screenshot_base64 ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl border border-[#e5e0d4] shadow-2xl shadow-black/5 overflow-hidden">
                <img
                  src={`data:image/png;base64,${snapshot.screenshot_base64}`}
                  alt="Live View"
                  className="w-full h-auto"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <div className="w-20 h-20 mb-6 rounded-3xl bg-[#e5e0d4] flex items-center justify-center">
                <svg className="w-10 h-10 text-[#706a5a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Bridge Protocol Offline</h3>
              <p className="text-sm max-w-xs">{error || 'Verify your browser is running with --remote-debugging-port=9222'}</p>
            </div>
          )}
        </div>

        {/* Elements Sidebar */}
        <div className="w-96 border-l border-[#e5e0d4] bg-white flex flex-col">
          <div className="p-6 border-b border-[#e5e0d4]">
             <p className="text-[10px] uppercase tracking-[0.2em] text-[#706a5a] font-bold mb-1">Inspector</p>
             <h2 className="text-lg font-semibold tracking-tight truncate">{snapshot?.title || 'Inactive Page'}</h2>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {visibleElements.length ? (
              visibleElements.map((element) => {
                const isInput = ['input', 'textarea', 'select'].includes(element.tag)
                return (
                  <div key={element.id} className="p-4 rounded-2xl border border-[#e5e0d4] bg-[#f8f6f0]/50 hover:bg-[#f8f6f0] transition-colors group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-[#706a5a]/10 text-[#706a5a] text-[9px] font-bold uppercase tracking-wider mb-1.5">
                          {element.tag}
                        </span>
                        <div className="text-[13px] font-medium text-[#1a1915] break-words line-clamp-2">
                          {element.text || element.placeholder || element.ariaLabel || '(Empty Element)'}
                        </div>
                      </div>
                      <button
                        onClick={() => sendAction('click', { selector: element.selector })}
                        disabled={busy}
                        className="p-2 bg-white border border-[#e5e0d4] rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:border-[#b85c38] hover:text-[#b85c38]"
                        title="Click Element"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
                      </button>
                    </div>

                    {isInput && (
                      <div className="flex gap-2">
                        <input
                          value={fieldValues[element.id] || ''}
                          onChange={(e) => setFieldValues(v => ({ ...v, [element.id]: e.target.value }))}
                          placeholder="Type content..."
                          className="flex-1 px-3 py-2 bg-white border border-[#e5e0d4] rounded-xl text-xs outline-none focus:border-[#b85c38]"
                        />
                        <button
                          onClick={() => sendAction('type', { selector: element.selector, text: fieldValues[element.id] || '' })}
                          disabled={busy || !fieldValues[element.id]}
                          className="px-3 py-2 bg-[#b85c38] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider disabled:opacity-30"
                        >
                          Fill
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="py-20 text-center opacity-30 px-6">
                <p className="text-sm italic">No interactive elements detected on this page layer.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrowserPane
