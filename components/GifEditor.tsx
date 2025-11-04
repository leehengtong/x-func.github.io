'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'

export default function GifEditor() {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [gifFrames, setGifFrames] = useState<string[]>([])
  const [currentFrame, setCurrentFrame] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [viewMode, setViewMode] = useState<'animated' | 'frame'>('animated')
  const [zoom, setZoom] = useState<number>(100)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null)
  const [showProperties, setShowProperties] = useState(true)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const gifImageRef = useRef<HTMLImageElement>(null)
  const ffmpegLoadPromiseRef = useRef<Promise<boolean> | null>(null)
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false)

  // Initialize FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ffmpeg = new FFmpeg()
        ffmpegRef.current = ffmpeg

        ffmpeg.on('log', ({ message }) => {
          console.log(message)
        })

        if (!ffmpeg.loaded) {
          console.log('Loading FFmpeg core...')
          const loadPromise = ffmpeg.load()
          ffmpegLoadPromiseRef.current = loadPromise
          await loadPromise
        }

        if (ffmpeg.loaded) {
          console.log('FFmpeg core loaded!')
          setFfmpegLoaded(true)
        } else {
          throw new Error('FFmpeg failed to load: loaded property is false')
        }
      } catch (error) {
        console.error('Failed to load FFmpeg:', error)
        setFfmpegLoaded(false)
        ffmpegRef.current = null
        ffmpegLoadPromiseRef.current = null
      }
    }

    loadFFmpeg()
  }, [])

  // Extract frames from GIF using FFmpeg
  const extractGifFrames = async (file: File) => {
    if (!ffmpegLoaded && ffmpegLoadPromiseRef.current) {
      try {
        await ffmpegLoadPromiseRef.current
        if (ffmpegRef.current?.loaded) {
          setFfmpegLoaded(true)
        }
      } catch (error) {
        console.warn('FFmpeg failed to load, skipping frame extraction:', error)
        setGifFrames([])
        return
      }
    }

    const ffmpeg = ffmpegRef.current
    if (!ffmpeg || !ffmpeg.loaded || !ffmpegLoaded) {
      console.warn('FFmpeg not loaded yet')
      setGifFrames([])
      return
    }

    setLoading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const inputFile = 'input.gif'
      
      await ffmpeg.writeFile(inputFile, new Uint8Array(arrayBuffer))
      
      const extractArgs = ['-i', inputFile, '-vsync', '0', 'frame_%03d.png']
      
      await ffmpeg.exec(extractArgs)
      
      const frames: string[] = []
      
      let frameIndex = 0
      while (frameIndex < 100) {
        try {
          const frameFile = `frame_${String(frameIndex + 1).padStart(3, '0')}.png`
          const data = await ffmpeg.readFile(frameFile)
          
          // Convert FileData to Blob-compatible format
          // FFmpeg returns Uint8Array, ensure we have a proper ArrayBuffer
          const arrayBuffer = data instanceof Uint8Array && data.buffer instanceof ArrayBuffer
            ? data.buffer.slice(0)
            : new Uint8Array(data as unknown as ArrayLike<number>).buffer
          const blob = new Blob([arrayBuffer], { type: 'image/png' })
          const frameUrl = URL.createObjectURL(blob)
          frames.push(frameUrl)
          
          await ffmpeg.deleteFile(frameFile).catch(() => {})
          frameIndex++
        } catch {
          break
        }
      }
      
      setGifFrames(frames)
      setCurrentFrame(0)
      
      await ffmpeg.deleteFile(inputFile).catch(() => {})
    } catch (error) {
      console.error('Error extracting GIF frames:', error)
      setGifFrames([])
    } finally {
      setLoading(false)
    }
  }

  // Load GIF from file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'image/gif') {
      setGifFrames([])
      setCurrentFrame(0)
      setIsPlaying(false)
      setViewMode('animated')
      
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
        animationIntervalRef.current = null
      }
      
      setIsPlaying(true)
      
      const reader = new FileReader()
      reader.onload = async (e) => {
        const newSrc = e.target?.result as string
        setImageSrc(newSrc)
        resetView()
        
        extractGifFrames(file).catch((error) => {
          console.warn('Frame extraction failed, but GIF will still display:', error)
        })
      }
      reader.readAsDataURL(file)
    }
  }

  // Download GIF
  const handleDownload = useCallback(() => {
    if (!imageSrc) return

    const link = document.createElement('a')
    link.download = 'edited-gif.gif'
    link.href = imageSrc
    link.click()
  }, [imageSrc])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        fileInputRef.current?.click()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleDownload()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault()
        handleZoom(25)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        handleZoom(-25)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        resetView()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleDownload])

  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(25, Math.min(500, prev + delta)))
  }

  // Handle pan start
  const handlePanStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageSrc) return
    setIsPanning(true)
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
  }

  // Handle pan move
  const handlePanMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !panStart) return
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    })
  }

  // Handle pan end
  const handlePanEnd = () => {
    setIsPanning(false)
    setPanStart(null)
  }

  // Reset zoom and pan
  const resetView = () => {
    setZoom(100)
    setPanOffset({ x: 0, y: 0 })
  }

  // GIF animation controls
  const handlePlayPause = () => {
    if (isPlaying) {
      if (gifFrames.length > 0) {
        setViewMode('frame')
        setIsPlaying(false)
      } else {
        console.warn('Cannot pause: frames not extracted yet')
      }
    } else {
      setViewMode('animated')
      setIsPlaying(true)
    }
  }

  const handleNextFrame = () => {
    if (gifFrames.length > 0) {
      setCurrentFrame((prev) => (prev + 1) % gifFrames.length)
      setViewMode('frame')
      setIsPlaying(false)
    }
  }

  const handlePrevFrame = () => {
    if (gifFrames.length > 0) {
      setCurrentFrame((prev) => (prev - 1 + gifFrames.length) % gifFrames.length)
      setViewMode('frame')
      setIsPlaying(false)
    }
  }

  const handleGoToFrame = (frameIndex: number) => {
    if (frameIndex >= 0 && frameIndex < gifFrames.length && gifFrames.length > 0) {
      setCurrentFrame(frameIndex)
      setViewMode('frame')
      setIsPlaying(false)
    }
  }

  // Ensure frame mode is only active when frames are available
  useEffect(() => {
    if (viewMode === 'frame' && gifFrames.length === 0) {
      setViewMode('animated')
      setIsPlaying(true)
    }
  }, [viewMode, gifFrames.length])

  // Ensure currentFrame is valid when frames change
  useEffect(() => {
    if (gifFrames.length > 0 && currentFrame >= gifFrames.length) {
      setCurrentFrame(0)
    }
  }, [gifFrames.length, currentFrame])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
      }
    }
  }, [])

  // Cleanup frame URLs when component unmounts or frames change
  useEffect(() => {
    return () => {
      gifFrames.forEach(url => URL.revokeObjectURL(url))
    }
  }, [gifFrames])

  // Fit image to screen
  const handleFitToScreen = () => {
    if (canvasContainerRef.current && gifImageRef.current) {
      const container = canvasContainerRef.current
      const img = gifImageRef.current
      const containerWidth = container.clientWidth - 32
      const containerHeight = container.clientHeight - 32
      const imgRatio = img.naturalWidth / img.naturalHeight
      const containerRatio = containerWidth / containerHeight
      
      let newZoom = 100
      if (imgRatio > containerRatio) {
        newZoom = (containerWidth / img.naturalWidth) * 100
      } else {
        newZoom = (containerHeight / img.naturalHeight) * 100
      }
      
      setZoom(Math.min(newZoom, 500))
      setPanOffset({ x: 0, y: 0 })
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/gif"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Menu Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-1.5 flex items-center gap-1 text-sm">
        {/* File Group */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 hover:bg-gray-700 rounded transition-colors tooltip-wrapper-top group"
          data-tooltip="Open GIF (Ctrl+O)"
          title="Open GIF (Ctrl+O)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-[9px] text-gray-400 group-hover:text-gray-300 leading-none">Open</span>
        </button>
        <button
          onClick={handleDownload}
          disabled={!imageSrc}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:hover:bg-gray-800 tooltip-wrapper-top group"
          data-tooltip="Save/Download (Ctrl+S)"
          title="Save/Download (Ctrl+S)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="text-[9px] text-gray-400 group-hover:text-gray-300 leading-none">Save</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-600 mx-1" />

        {/* View/Zoom Group */}
        <button
          onClick={() => handleZoom(-25)}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 hover:bg-gray-700 rounded transition-colors tooltip-wrapper-top group"
          data-tooltip="Zoom Out (Ctrl+-)"
          title="Zoom Out (Ctrl+-)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6" />
          </svg>
          <span className="text-[9px] text-gray-400 group-hover:text-gray-300 leading-none">−</span>
        </button>
        <button
          onClick={() => handleZoom(25)}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 hover:bg-gray-700 rounded transition-colors tooltip-wrapper-top group"
          data-tooltip="Zoom In (Ctrl+=)"
          title="Zoom In (Ctrl+=)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v6m3-3H9" />
          </svg>
          <span className="text-[9px] text-gray-400 group-hover:text-gray-300 leading-none">+</span>
        </button>
        <button
          onClick={resetView}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 hover:bg-gray-700 rounded transition-colors tooltip-wrapper-top group"
          data-tooltip="Reset View (Ctrl+0)"
          title="Reset View (Ctrl+0)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-[9px] text-gray-400 group-hover:text-gray-300 leading-none">Reset</span>
        </button>
        <button
          onClick={handleFitToScreen}
          disabled={!imageSrc}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:hover:bg-gray-800 tooltip-wrapper-top group"
          data-tooltip="Fit to Screen"
          title="Fit to Screen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <span className="text-[9px] text-gray-400 group-hover:text-gray-300 leading-none">Fit</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-600 mx-1" />

        {/* Zoom percentage display */}
        {imageSrc && (
          <div className="px-2 text-xs text-gray-400 font-mono">
            {zoom}%
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Central Canvas Area */}
        <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden min-w-0">
          {/* Status Bar */}
          {imageSrc && (
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-1.5 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2 sm:gap-4">
                {gifImageRef.current && (
                  <span className="font-mono text-xs sm:text-sm">
                    <span className="hidden sm:inline">{gifImageRef.current.naturalWidth} × {gifImageRef.current.naturalHeight}px</span>
                    <span className="sm:hidden">{gifImageRef.current.naturalWidth}×{gifImageRef.current.naturalHeight}</span>
                  </span>
                )}
                <span className="text-gray-500 hidden sm:inline">|</span>
                <span className="text-xs sm:text-sm">GIF</span>
                <span className="text-gray-500 hidden sm:inline">|</span>
                <span className="text-xs sm:text-sm">
                  {viewMode === 'frame' && gifFrames.length > 0 
                    ? `Frame ${currentFrame + 1}/${gifFrames.length}` 
                    : 'GIF Animation'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 mr-2">
                  <button
                    onClick={handlePrevFrame}
                    disabled={viewMode === 'animated' || gifFrames.length === 0}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous Frame"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={handlePlayPause}
                    disabled={isPlaying && viewMode === 'animated' && gifFrames.length === 0}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      isPlaying && viewMode === 'animated' && gifFrames.length === 0
                        ? 'Waiting for frame extraction'
                        : isPlaying && viewMode === 'animated'
                        ? 'Pause'
                        : 'Play'
                    }
                  >
                    {isPlaying && viewMode === 'animated' ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={handleNextFrame}
                    disabled={viewMode === 'animated' || gifFrames.length === 0}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next Frame"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => setShowProperties(!showProperties)}
                  className="lg:hidden px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                  title={showProperties ? 'Hide Properties' : 'Show Properties'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showProperties ? "M6 18L18 6M6 6l12 12" : "M9 5l7 7-7 7"} />
                  </svg>
                </button>
                <span className="text-xs sm:text-sm">{zoom}%</span>
              </div>
            </div>
          )}

          {/* Canvas Container */}
          <div
            ref={canvasContainerRef}
            className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-8"
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          >
            {!imageSrc ? (
              <div className="text-center text-gray-500">
                <svg className="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg mb-2">No GIF loaded</p>
                <p className="text-sm text-gray-600">Click &quot;Open&quot; to load a GIF file</p>
              </div>
            ) : (
              <div
                className="relative inline-block"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                }}
              >
                {viewMode === 'frame' && gifFrames.length > 0 && gifFrames[currentFrame] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    ref={gifImageRef}
                    src={gifFrames[currentFrame]}
                    alt={`Frame ${currentFrame + 1} of ${gifFrames.length}`}
                    className="max-w-full h-auto block shadow-2xl"
                    draggable={false}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    ref={gifImageRef}
                    src={imageSrc || ''}
                    alt="GIF Preview"
                    className="max-w-full h-auto block shadow-2xl"
                    draggable={false}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Properties Panel */}
        {imageSrc && (
          <div className={`bg-gray-800 border-l border-gray-700 overflow-y-auto shrink-0 transition-all duration-300 ${
            showProperties ? 'w-80 lg:w-80' : 'w-0 hidden'
          }`}>
            <div className="p-4 space-y-4">
              {/* GIF Controls */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  GIF Animation
                </h3>
                <div className="space-y-3">
                  {loading && gifFrames.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-2">
                      Extracting frames...
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePlayPause}
                      disabled={isPlaying && viewMode === 'animated' && gifFrames.length === 0}
                      className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isPlaying && viewMode === 'animated' && gifFrames.length === 0 ? 'Waiting for frame extraction to enable pause' : undefined}
                    >
                      {isPlaying && viewMode === 'animated' ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                          Pause
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          Play Animation
                        </>
                      )}
                    </button>
                  </div>
                  {isPlaying && viewMode === 'animated' && gifFrames.length === 0 && !loading && (
                    <div className="text-xs text-gray-500 text-center">
                      Extract frames to enable pause
                    </div>
                  )}
                  
                  {gifFrames.length > 0 && (
                    <>
                      <div className="border-t border-gray-600 pt-3">
                        <label className="text-sm text-gray-400 mb-2 block">View Mode</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setViewMode('animated')
                              setIsPlaying(true)
                            }}
                            className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                              viewMode === 'animated'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                          >
                            Animated
                          </button>
                          <button
                            onClick={() => {
                              if (gifFrames.length > 0) {
                                setViewMode('frame')
                                setIsPlaying(false)
                              }
                            }}
                            disabled={gifFrames.length === 0}
                            className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                              viewMode === 'frame'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            Frame by Frame
                          </button>
                        </div>
                      </div>

                      {viewMode === 'frame' && (
                        <div className="border-t border-gray-600 pt-3 space-y-3">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-sm text-gray-400">Frame</label>
                              <span className="text-sm font-medium text-white">
                                {currentFrame + 1} / {gifFrames.length}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={gifFrames.length - 1}
                              value={currentFrame}
                              onChange={(e) => handleGoToFrame(parseInt(e.target.value))}
                              className="w-full accent-primary-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handlePrevFrame}
                              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                              Previous
                            </button>
                            <button
                              onClick={handleNextFrame}
                              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              Next
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {!loading && gifFrames.length === 0 && (
                    <div className="text-xs text-gray-500 text-center py-2 border-t border-gray-600 pt-3">
                      Frame extraction unavailable. Animated view still works.
                    </div>
                  )}
                </div>
              </div>

              {/* GIF Info */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">GIF Info</h3>
                {gifImageRef.current && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Dimensions:</span>
                      <span className="text-white font-mono">
                        {gifImageRef.current.naturalWidth} × {gifImageRef.current.naturalHeight}px
                      </span>
                    </div>
                    {gifFrames.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Frames:</span>
                        <span className="text-white font-mono">{gifFrames.length}</span>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <p className="text-gray-400 text-xs">
                        Use the controls above to play, pause, and navigate through GIF frames. Click and drag to pan when zoomed in.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

