import { useEffect, useRef } from 'react'

const toneByType = {
  thought: 'bg-white text-[#1a1915] border-[#e5e0d4] shadow-sm',
  tool_call: 'bg-[#f1ede3] text-[#1a1915] border-[#d1cbbd]',
  tool_result: 'bg-[#4a6741]/5 text-[#4a6741] border-[#4a6741]/20',
  done: 'bg-[#b85c38]/5 text-[#b85c38] border-[#b85c38]/20',
  error: 'bg-[#a34836]/5 text-[#a34836] border-[#a34836]/20',
  confirmation_required: 'bg-amber-50 text-amber-800 border-amber-200',
}

const labelByType = {
  thought: 'Strategic Plan',
  tool_call: 'Executing Action',
  tool_result: 'Observation',
  done: 'Task Completed',
  error: 'System Error',
  confirmation_required: 'Manual Gate',
}

const StepBubble = ({ step }) => {
  const tone = toneByType[step.type] || toneByType.thought
  const label = labelByType[step.type] || step.type

  return (
    <div className={`p-4 rounded-2xl border ${tone} transition-all animate-fade-in`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-80">{label}</p>
        <span className="text-[10px] font-mono opacity-50">{new Date(step.timestamp).toLocaleTimeString()}</span>
      </div>
      <p className="text-[14px] whitespace-pre-wrap break-words font-mono leading-relaxed">
        {step.content}
      </p>
    </div>
  )
}

const TaskLog = ({ steps, isRunning }) => {
  const logRef = useRef(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTo({
        top: logRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [steps])

  return (
    <div ref={logRef} className="h-full overflow-y-auto scrollbar-thin p-6 space-y-6">
      {steps.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
          <div className="w-16 h-16 mb-4 rounded-full bg-[#e5e0d4] flex items-center justify-center">
             <svg className="w-8 h-8 text-[#706a5a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <p className="text-sm font-medium">
            {isRunning ? 'Agent is initializing protocols...' : 'Awaiting deployment instructions.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl mx-auto">
          {steps.map((step, index) => (
            <StepBubble key={index} step={step} />
          ))}
          {isRunning && (
            <div className="flex items-center justify-center py-8 opacity-40">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#706a5a] animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#706a5a] animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#706a5a] animate-bounce" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskLog
