import { useState } from 'react'
import FileExplorer from './components/FileExplorer'
import AgentChat from './components/AgentChat'
import BrowserPane from './components/BrowserPane'

function App() {
  const [workspacePath, setWorkspacePath] = useState('')
  const [currentPath, setCurrentPath] = useState('.')

  return (
    <div className="h-screen flex bg-[#f8f6f0] text-[#1a1915] selection:bg-[#b85c38]/10 overflow-hidden">
      {/* Left Panel - File Explorer */}
      <aside className="w-[300px] flex-shrink-0 bg-white border-r border-[#e5e0d4] flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <FileExplorer
          workspacePath={workspacePath}
          setWorkspacePath={setWorkspacePath}
          currentPath={currentPath}
          setCurrentPath={setCurrentPath}
        />
      </aside>

      {/* Center Panel - Browser Viewport */}
      <main className="flex-1 flex flex-col bg-[#fcfbf9] relative min-w-0 border-r border-[#e5e0d4] z-10">
        <BrowserPane />
      </main>

      {/* Right Panel - Agent Intelligence */}
      <aside className="w-[450px] flex-shrink-0 bg-white flex flex-col z-20">
        <AgentChat />
      </aside>
    </div>
  )
}

export default App
