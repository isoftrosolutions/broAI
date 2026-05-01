import { useState, useEffect } from 'react'

const FileExplorer = ({ workspacePath, setWorkspacePath, currentPath, setCurrentPath }) => {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [pathInput, setPathInput] = useState(workspacePath)

  const fetchFiles = async (path) => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8001/files?path=${encodeURIComponent(path)}`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data.items)
      } else {
        setFiles([])
      }
    } catch (error) {
      console.error('Error fetching files:', error)
      setFiles([])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (workspacePath) {
      fetchFiles(workspacePath)
      setCurrentPath(workspacePath)
    }
  }, [workspacePath, setCurrentPath])

  useEffect(() => {
    if (currentPath && currentPath !== workspacePath) {
      fetchFiles(currentPath)
    }
  }, [currentPath, workspacePath])

  const handlePathSubmit = (e) => {
    e.preventDefault()
    setWorkspacePath(pathInput)
  }

  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      const newPath = currentPath === '.' ? item.name : `${currentPath}/${item.name}`
      setCurrentPath(newPath)
    }
  }

  const handleRefresh = () => {
    fetchFiles(currentPath)
  }

  const getFileIcon = (item) => {
    if (item.type === 'folder') return (
      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
    )
    return (
      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
    )
  }

  const formatSize = (size) => {
    if (size === null) return ''
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-[#e5e0d4]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#706a5a] font-bold mb-1">Explorer</p>
            <h2 className="text-lg font-semibold tracking-tight">Project Files</h2>
          </div>
          <button 
            onClick={handleRefresh}
            className="p-2 hover:bg-[#f1ede3] rounded-lg transition-colors text-[#706a5a]"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>

        <form onSubmit={handlePathSubmit} className="relative group">
          <input
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            placeholder="Enter workspace path..."
            className="w-full px-4 py-2.5 bg-[#f8f6f0] border border-[#e5e0d4] rounded-xl text-xs font-mono outline-none transition-all focus:border-[#b85c38] focus:ring-4 focus:ring-[#b85c38]/5"
          />
          <button 
            type="submit" 
            className="absolute right-2 top-1.5 px-2 py-1 bg-white border border-[#e5e0d4] rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#706a5a] hover:bg-[#f1ede3] transition-all active:scale-95 shadow-sm"
          >
            Set
          </button>
        </form>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-[#706a5a] font-mono opacity-60 overflow-hidden">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          <span className="truncate">{currentPath || 'No root directory'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-0.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 opacity-40">
            <div className="w-5 h-5 border-2 border-[#b85c38] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-[11px] font-medium uppercase tracking-wider">Indexing...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center opacity-30 px-6">
            <p className="text-sm italic">
              {workspacePath ? 'Directory is empty' : 'Enter a local path to begin browsing your project.'}
            </p>
          </div>
        ) : (
          files.map((item, index) => (
            <div
              key={index}
              onClick={() => handleItemClick(item)}
              className="group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-[#f8f6f0] transition-all border border-transparent hover:border-[#e5e0d4]"
            >
              <div className="flex-shrink-0">
                {getFileIcon(item)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate group-hover:text-[#b85c38] transition-colors">{item.name}</div>
                <div className="text-[10px] text-[#706a5a] opacity-60 flex items-center gap-2">
                  {item.type === 'file' && (
                    <>
                      <span>{formatSize(item.size)}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{new Date(item.modified * 1000).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default FileExplorer
