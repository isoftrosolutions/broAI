import { useState, useRef } from 'react'
import TaskLog from './TaskLog'

const AgentChat = () => {
  const [task, setTask] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [steps, setSteps] = useState([])
  const [status, setStatus] = useState('')
  const [bridgeUrl, setBridgeUrl] = useState('http://localhost:9222')
  const [maxSteps, setMaxSteps] = useState(20)
  const eventSourceRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!task.trim()) return

    setIsRunning(true)
    setSteps([])
    setStatus('Initializing...')

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      const response = await fetch('http://localhost:8001/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: task.trim(),
          bridge_url: bridgeUrl.trim(),
          max_steps: Number(maxSteps)
        })
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                handleEvent(data)
              } catch (e) {
                console.error('Failed to parse SSE data:', line, e)
              }
            }
          }
        }
      }

      await processStream()
    } catch (error) {
      console.error('Error running task:', error)
      setSteps(prev => [...prev, {
        type: 'error',
        content: `Failed to start task: ${error.message}`,
        timestamp: Date.now()
      }])
    } finally {
      setIsRunning(false)
      setStatus('')
    }
  }

  const handleEvent = (event) => {
    const step = { ...event, timestamp: Date.now() }
    setSteps(prev => [...prev, step])

    switch (event.type) {
      case 'thought': setStatus('Thinking...'); break
      case 'tool_call': setStatus('Running tool...'); break
      case 'tool_result': setStatus('Processing result...'); break
      case 'done': setStatus('Task completed'); setTimeout(() => setStatus(''), 2000); break
      case 'error': setStatus('Error occurred'); setTimeout(() => setStatus(''), 3000); break
    }
  }

  const handleClear = () => {
    setSteps([])
    setTask('')
  }

  return (
    <div className="flex flex-col h-full animate-fade-in relative bg-[#fcfbf9]">
      {/* Header */}
      <div className="p-6 border-b border-[#e5e0d4] bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#706a5a] font-bold mb-1">Operator</p>
            <h2 className="text-xl font-semibold tracking-tight">Agent Workspace</h2>
          </div>
          <div className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${isRunning ? 'bg-[#b85c38]/10 text-[#b85c38] animate-pulse' : 'bg-[#706a5a]/10 text-[#706a5a]'}`}>
            {isRunning ? 'System Active' : 'Ready'}
          </div>
        </div>

        {/* Task Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="group relative">
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Describe what you want the agent to do..."
              className="w-full px-5 py-4 bg-[#f8f6f0] border border-[#e5e0d4] rounded-2xl resize-none text-[15px] leading-relaxed outline-none transition-all focus:border-[#b85c38] focus:ring-4 focus:ring-[#b85c38]/5 placeholder-[#706a5a]/40"
              rows={4}
              disabled={isRunning}
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={isRunning || !task.trim()}
                className="p-2 text-[#706a5a] hover:bg-[#f1ede3] rounded-xl transition-all disabled:opacity-30"
                title="Clear"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
              <button
                type="submit"
                disabled={isRunning || !task.trim()}
                className="px-6 py-2 bg-[#b85c38] hover:bg-[#9f4a2c] text-white font-medium rounded-xl shadow-lg shadow-[#b85c38]/20 transition-all active:scale-95 disabled:bg-[#e5e0d4] disabled:shadow-none disabled:cursor-not-allowed"
              >
                {isRunning ? 'Running...' : 'Deploy Agent'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-[#706a5a] font-bold ml-1">Bridge URL</label>
              <input
                type="text"
                value={bridgeUrl}
                onChange={(e) => setBridgeUrl(e.target.value)}
                className="w-full px-4 py-2 bg-[#f8f6f0] border border-[#e5e0d4] rounded-xl text-xs font-mono outline-none focus:border-[#b85c38]"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-[#706a5a] font-bold ml-1">Step Limit</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxSteps}
                onChange={(e) => setMaxSteps(e.target.value)}
                className="w-full px-4 py-2 bg-[#f8f6f0] border border-[#e5e0d4] rounded-xl text-xs font-mono outline-none focus:border-[#b85c38]"
                disabled={isRunning}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Task Log */}
      <div className="flex-1 overflow-hidden">
        <TaskLog steps={steps} isRunning={isRunning} />
      </div>

      {/* Status Footer */}
      {status && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white border border-[#e5e0d4] rounded-full shadow-xl shadow-black/5 text-xs font-medium text-[#706a5a] flex items-center gap-2 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-[#b85c38] animate-pulse" />
          {status}
        </div>
      )}
    </div>
  )
}

export default AgentChat
