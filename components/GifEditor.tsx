'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'

export default function GifEditor() {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [gifFrames, setGifFrames] = useState<string[]>([])
  const [currentFrame, setCurrentFrame] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [viewMode, setViewMode] = useState<'animated' | 'frame'>('animated')
  const [zoom, setZoom] = useState<number>(100)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null)
  const [showPreviewPanel, setShowPreviewPanel] = useState(true)
  const [draggedFrameIndex, setDraggedFrameIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const frameFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const frameElementRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const previewPanelRef = useRef<HTMLDivElement>(null)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const gifImageRef = useRef<HTMLImageElement>(null)
  const ffmpegLoadPromiseRef = useRef<Promise<boolean> | null>(null)
  const gifFramesRef = useRef<string[]>([])
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

  // --- BEGIN: Utility to normalize image size to match GIF ---
  const normalizeImageToGifSize = (src: string, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject('No canvas context')
          return
        }
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = (err) => reject(err)
      img.src = src
    })
  }
  // --- END: Utility ---

  // Reconstruct GIF from edited frames
  const reconstructGifFromFrames = useCallback(async (): Promise<string | null> => {
    if (!ffmpegLoaded && ffmpegLoadPromiseRef.current) {
      try {
        await ffmpegLoadPromiseRef.current
        if (ffmpegRef.current?.loaded) {
          setFfmpegLoaded(true)
        } else {
          console.error('FFmpeg failed to load after waiting')
          return null
        }
      } catch (error) {
        console.error('FFmpeg failed to load:', error)
        return null
      }
    }

    const ffmpeg = ffmpegRef.current
    if (!ffmpeg || !ffmpeg.loaded) {
      console.error('FFmpeg not loaded')
      return null
    }
    
    if (gifFrames.length === 0) {
      console.error('No frames available for reconstruction')
      return null
    }

    try {
      // Write all frames to FFmpeg filesystem
      const frameFiles: string[] = []
      for (let i = 0; i < gifFrames.length; i++) {
        const frameUrl = gifFrames[i]
        if (!frameUrl || frameUrl.trim() === '') {
          console.error(`Frame ${i} is empty or invalid`)
          return null
        }
        
        const frameFile = `frame_${String(i + 1).padStart(3, '0')}.png`
        frameFiles.push(frameFile)
        
        // Convert data URL or blob URL to Uint8Array
        let frameData: Uint8Array
        try {
          if (frameUrl.startsWith('data:')) {
            // Data URL
            const response = await fetch(frameUrl)
            if (!response.ok) {
              throw new Error(`Failed to fetch frame ${i}: ${response.statusText}`)
            }
            const blob = await response.blob()
            const arrayBuffer = await blob.arrayBuffer()
            frameData = new Uint8Array(arrayBuffer)
          } else if (frameUrl.startsWith('blob:')) {
            // Blob URL
            const response = await fetch(frameUrl)
            if (!response.ok) {
              throw new Error(`Failed to fetch frame ${i}: ${response.statusText}`)
            }
            const blob = await response.blob()
            const arrayBuffer = await blob.arrayBuffer()
            frameData = new Uint8Array(arrayBuffer)
          } else {
            console.error('Unsupported frame URL format:', frameUrl)
            return null
          }
        } catch (error) {
          console.error(`Error processing frame ${i}:`, error)
          return null
        }
        
        await ffmpeg.writeFile(frameFile, frameData)
      }
      
      // Create a palette for better GIF quality
      const paletteFile = 'palette.png'
      const paletteArgs = [
        '-i', `frame_%03d.png`,
        '-vf', 'palettegen',
        paletteFile
      ]
      await ffmpeg.exec(paletteArgs)
      
      // Combine frames into GIF using palette
      const outputFile = 'output.gif'
      const gifArgs = [
        '-i', `frame_%03d.png`,
        '-i', paletteFile,
        '-lavfi', '[0:v][1:v]paletteuse',
        '-loop', '0',
        '-y',
        outputFile
      ]
      await ffmpeg.exec(gifArgs)
      
      // Read the output GIF
      const data = await ffmpeg.readFile(outputFile)
      const arrayBuffer = data instanceof Uint8Array && data.buffer instanceof ArrayBuffer
        ? data.buffer.slice(0)
        : new Uint8Array(data as unknown as ArrayLike<number>).buffer
      const blob = new Blob([arrayBuffer], { type: 'image/gif' })
      const gifUrl = URL.createObjectURL(blob)
      
      // Cleanup FFmpeg files
      for (const frameFile of frameFiles) {
        await ffmpeg.deleteFile(frameFile).catch(() => {})
      }
      await ffmpeg.deleteFile(paletteFile).catch(() => {})
      await ffmpeg.deleteFile(outputFile).catch(() => {})
      
      return gifUrl
    } catch (error) {
      console.error('Error reconstructing GIF:', error)
      return null
    }
  }, [gifFrames, ffmpegLoaded])

  // Download GIF
  const handleDownload = useCallback(async () => {
    if (!imageSrc) return

    // If frames have been edited, reconstruct GIF from frames
    if (gifFrames.length > 0) {
      try {
        const reconstructedGifUrl = await reconstructGifFromFrames()
        if (reconstructedGifUrl) {
          const link = document.createElement('a')
          link.download = 'edited-gif.gif'
          link.href = reconstructedGifUrl
          link.click()
          // Clean up the blob URL after a delay
          setTimeout(() => {
            URL.revokeObjectURL(reconstructedGifUrl)
          }, 100)
          return
        } else {
          // Show error if reconstruction fails
          alert('Failed to reconstruct GIF from edited frames. Please ensure FFmpeg is loaded and try again.')
          console.error('Failed to reconstruct GIF from frames')
          return
        }
      } catch (error) {
        console.error('Error during GIF reconstruction:', error)
        alert('An error occurred while saving the edited GIF. Please try again.')
        return
      }
    }

    // Download original GIF if no frames or reconstruction failed
    const link = document.createElement('a')
    link.download = 'edited-gif.gif'
    link.href = imageSrc
    link.click()
  }, [imageSrc, gifFrames, reconstructGifFromFrames])

  // Add frame (duplicate current frame)
  const handleAddFrame = useCallback(() => {
    setGifFrames((prev) => {
      if (prev.length === 0) return prev
      
      const newFrames = [...prev]
      const frameToDuplicate = prev[currentFrame]
      newFrames.splice(currentFrame + 1, 0, frameToDuplicate)
      setCurrentFrame((prevFrame) => prevFrame + 1)
      setViewMode('frame')
      setIsPlaying(false)
      // Clear refs to force rebuild after adding frame
      frameElementRefs.current = {}
      return newFrames
    })
  }, [currentFrame])

  // Delete current frame
  const handleDeleteFrame = useCallback(() => {
    setGifFrames((prev) => {
      if (prev.length <= 1) {
        alert('Cannot delete the last frame. GIF must have at least one frame.')
        return prev
      }

      const frameToDelete = prev[currentFrame]
      // Only revoke blob URLs, not data URLs
      if (frameToDelete && frameToDelete.startsWith('blob:')) {
        URL.revokeObjectURL(frameToDelete)
      }
      const newFrames = prev.filter((_, index) => index !== currentFrame)
      
      // Adjust current frame index
      setCurrentFrame((prevFrame) => {
        const newLength = newFrames.length
        return prevFrame >= newLength ? newLength - 1 : prevFrame
      })
      setViewMode('frame')
      setIsPlaying(false)
      // Clear refs to force rebuild after deleting frame
      frameElementRefs.current = {}
      
      return newFrames
    })
  }, [currentFrame])

  // Move frame up (swap with previous frame)
  const handleMoveFrameUp = useCallback(() => {
    setGifFrames((prev) => {
      if (currentFrame === 0 || prev.length <= 1) return prev
      
      const newFrames = [...prev]
      const temp = newFrames[currentFrame]
      newFrames[currentFrame] = newFrames[currentFrame - 1]
      newFrames[currentFrame - 1] = temp
      setCurrentFrame((prevFrame) => prevFrame - 1)
      setViewMode('frame')
      setIsPlaying(false)
      // Clear refs to force rebuild after reordering
      frameElementRefs.current = {}
      return newFrames
    })
  }, [currentFrame])

  // Move frame down (swap with next frame)
  const handleMoveFrameDown = useCallback(() => {
    setGifFrames((prev) => {
      if (currentFrame === prev.length - 1 || prev.length <= 1) return prev
      
      const newFrames = [...prev]
      const temp = newFrames[currentFrame]
      newFrames[currentFrame] = newFrames[currentFrame + 1]
      newFrames[currentFrame + 1] = temp
      setCurrentFrame((prevFrame) => prevFrame + 1)
      setViewMode('frame')
      setIsPlaying(false)
      // Clear refs to force rebuild after reordering
      frameElementRefs.current = {}
      return newFrames
    })
  }, [currentFrame])

  // Navigate to next frame
  const handleNextFrame = useCallback(() => {
    if (gifFrames.length > 0) {
      setCurrentFrame((current) => (current + 1) % gifFrames.length)
      setViewMode('frame')
      setIsPlaying(false)
    }
  }, [gifFrames.length])

  // Navigate to previous frame
  const handlePrevFrame = useCallback(() => {
    if (gifFrames.length > 0) {
      setCurrentFrame((current) => (current - 1 + gifFrames.length) % gifFrames.length)
      setViewMode('frame')
      setIsPlaying(false)
    }
  }, [gifFrames.length])

  // Handle drag start for frame reordering
  const handleDragStart = (index: number) => {
    setDraggedFrameIndex(index)
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedFrameIndex !== null && draggedFrameIndex !== index) {
      setDragOverIndex(index)
    }
  }

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedFrameIndex(null)
    setDragOverIndex(null)
  }

  // Handle drop to reorder frames
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    
    if (draggedFrameIndex === null || draggedFrameIndex === dropIndex) {
      setDraggedFrameIndex(null)
      return
    }

    setGifFrames((prev) => {
      const newFrames = [...prev]
      const [draggedFrame] = newFrames.splice(draggedFrameIndex, 1)
      newFrames.splice(dropIndex, 0, draggedFrame)
      
      // Update current frame index using functional update
      setCurrentFrame((prevCurrentFrame) => {
        let newCurrentFrame = prevCurrentFrame
        if (prevCurrentFrame === draggedFrameIndex) {
          newCurrentFrame = dropIndex
        } else if (draggedFrameIndex < prevCurrentFrame && dropIndex >= prevCurrentFrame) {
          newCurrentFrame = prevCurrentFrame - 1
        } else if (draggedFrameIndex > prevCurrentFrame && dropIndex <= prevCurrentFrame) {
          newCurrentFrame = prevCurrentFrame + 1
        }
        return newCurrentFrame
      })
      setViewMode('frame')
      setIsPlaying(false)
      
      // Clear refs to force rebuild after reordering
      frameElementRefs.current = {}
      
      setDraggedFrameIndex(null)
      return newFrames
    })
  }

  // Handle delete frame from preview panel
  const handleDeleteFrameAt = (index: number) => {
    setGifFrames((prev) => {
      if (prev.length <= 1) {
        alert('Cannot delete the last frame. GIF must have at least one frame.')
        return prev
      }

      const frameToDelete = prev[index]
      // Only revoke blob URLs, not data URLs
      if (frameToDelete && frameToDelete.startsWith('blob:')) {
        URL.revokeObjectURL(frameToDelete)
      }
      const newFrames = prev.filter((_, i) => i !== index)
      
      // Adjust current frame index
      const newCurrentFrame = (() => {
        if (currentFrame === index) {
          // If deleting current frame, go to previous or stay at last frame
          return index >= newFrames.length ? Math.max(0, newFrames.length - 1) : Math.max(0, index)
        } else if (currentFrame > index) {
          return currentFrame - 1
        }
        return currentFrame
      })()
      
      setCurrentFrame(newCurrentFrame)
      setViewMode('frame')
      setIsPlaying(false)
      // Clear refs to force rebuild after deleting frame
      frameElementRefs.current = {}
      
      return newFrames
    })
  }

  // Handle upload image to insert at specific position
  const handleInsertFrameAt = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string
      if (!imageUrl) {
        console.error('Failed to read image file')
        return
      }
      // Normalize image size if we have any frames to infer size
      let normUrl = imageUrl
      if (gifFrames.length > 0) {
        const probeImg = new window.Image()
        probeImg.onload = async () => {
          const firstFrameImg = new window.Image()
          firstFrameImg.onload = async () => {
            normUrl = await normalizeImageToGifSize(imageUrl, firstFrameImg.width, firstFrameImg.height)
            setGifFrames(prev => {
              const newFrames = [...prev]
              newFrames.splice(index, 0, normUrl)
              frameElementRefs.current = {}
              return newFrames
            })
            setCurrentFrame(index)
            setViewMode('frame')
            setIsPlaying(false)
          }
          firstFrameImg.src = gifFrames[0]
        }
        probeImg.onerror = () => {
          // fallback to original if can't load
          setGifFrames(prev => {
            const newFrames = [...prev]
            newFrames.splice(index, 0, imageUrl)
            frameElementRefs.current = {}
            return newFrames
          })
          setCurrentFrame(index)
          setViewMode('frame')
          setIsPlaying(false)
        }
        probeImg.src = imageUrl
      } else {
        setGifFrames(prev => {
          const newFrames = [...prev]
          newFrames.splice(index, 0, normUrl)
          frameElementRefs.current = {}
          return newFrames
        })
        setCurrentFrame(index)
        setViewMode('frame')
        setIsPlaying(false)
      }
    }
    reader.onerror = () => {
      console.error('Error reading image file')
      alert('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  // Handle replace frame at specific position
  const handleReplaceFrameAt = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string
      if (!imageUrl) {
        console.error('Failed to read image file')
        return
      }
      // Normalize image size if we have any frames to infer size
      let normUrl = imageUrl
      if (gifFrames.length > 0) {
        const probeImg = new window.Image()
        probeImg.onload = async () => {
          const firstFrameImg = new window.Image()
          firstFrameImg.onload = async () => {
            normUrl = await normalizeImageToGifSize(imageUrl, firstFrameImg.width, firstFrameImg.height)
            setGifFrames(prev => {
              if (prev[index] && prev[index].startsWith('blob:')) {
                URL.revokeObjectURL(prev[index])
              }
              const newFrames = [...prev]
              newFrames[index] = normUrl
              frameElementRefs.current = {}
              return newFrames
            })
            setCurrentFrame(index)
            setViewMode('frame')
            setIsPlaying(false)
          }
          firstFrameImg.src = gifFrames[0]
        }
        probeImg.onerror = () => {
          setGifFrames(prev => {
            if (prev[index] && prev[index].startsWith('blob:')) {
              URL.revokeObjectURL(prev[index])
            }
            const newFrames = [...prev]
            newFrames[index] = imageUrl
            frameElementRefs.current = {}
            return newFrames
          })
          setCurrentFrame(index)
          setViewMode('frame')
          setIsPlaying(false)
        }
        probeImg.src = imageUrl
      } else {
        setGifFrames(prev => {
          if (prev[index] && prev[index].startsWith('blob:')) {
            URL.revokeObjectURL(prev[index])
          }
          const newFrames = [...prev]
          newFrames[index] = normUrl
          frameElementRefs.current = {}
          return newFrames
        })
        setCurrentFrame(index)
        setViewMode('frame')
        setIsPlaying(false)
      }
    }
    reader.onerror = () => {
      console.error('Error reading image file')
      alert('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  // Handle zoom
  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(25, Math.min(500, prev + delta)))
  }, [])

  // Reset zoom and pan
  const resetView = useCallback(() => {
    setZoom(100)
    setPanOffset({ x: 0, y: 0 })
  }, [])

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
      
      // Frame navigation with arrow keys (when frames are available)
      if (gifFrames.length > 0) {
        if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
          e.preventDefault()
          handlePrevFrame()
        }
        if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
          e.preventDefault()
          handleNextFrame()
        }
      }
      
      // Frame editing shortcuts (only when in frame mode with frames available)
      if (gifFrames.length > 0 && viewMode === 'frame') {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          handleDeleteFrame()
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
          e.preventDefault()
          handleAddFrame()
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
          e.preventDefault()
          handleMoveFrameUp()
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
          e.preventDefault()
          handleMoveFrameDown()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleDownload, handleAddFrame, handleDeleteFrame, handleMoveFrameUp, handleMoveFrameDown, handlePrevFrame, handleNextFrame, gifFrames.length, viewMode, handleZoom, resetView])

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

  const handleGoToFrame = (frameIndex: number) => {
    if (frameIndex >= 0 && frameIndex < gifFrames.length && gifFrames.length > 0) {
      setCurrentFrame(frameIndex)
      setViewMode('frame')
      setIsPlaying(false)
    }
  }

  // Animation loop for cycling through frames
  useEffect(() => {
    // Clear any existing interval
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current)
      animationIntervalRef.current = null
    }

    // Start animation if playing and we have frames
    if (isPlaying && viewMode === 'animated' && gifFrames.length > 0) {
      const interval = setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % gifFrames.length)
      }, 100) // 100ms per frame (10 FPS), adjust as needed
      
      animationIntervalRef.current = interval
    }

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
        animationIntervalRef.current = null
      }
    }
  }, [isPlaying, viewMode, gifFrames.length])

  // Ensure frame mode is only active when frames are available
  useEffect(() => {
    if (viewMode === 'frame' && gifFrames.length === 0) {
      setViewMode('animated')
      setIsPlaying(true)
    }
  }, [viewMode, gifFrames.length])

  // Ensure currentFrame is valid when frames change
  useEffect(() => {
    if (gifFrames.length > 0) {
      if (currentFrame >= gifFrames.length) {
        setCurrentFrame(Math.max(0, gifFrames.length - 1))
      } else if (currentFrame < 0) {
        setCurrentFrame(0)
      }
    } else if (gifFrames.length === 0 && currentFrame !== 0) {
      setCurrentFrame(0)
    }
  }, [gifFrames.length, currentFrame])

  // Auto-scroll to selected frame in preview panel
  useEffect(() => {
    if (gifFrames.length > 0 && currentFrame >= 0 && currentFrame < gifFrames.length && showPreviewPanel) {
      const frameElement = frameElementRefs.current[currentFrame]
      
      if (frameElement) {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          frameElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          })
        })
      }
    }
  }, [currentFrame, gifFrames.length, showPreviewPanel])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
      }
    }
  }, [])

  // Keep ref in sync with state for cleanup
  useEffect(() => {
    gifFramesRef.current = gifFrames
  }, [gifFrames])

  // Cleanup frame URLs when component unmounts
  useEffect(() => {
    return () => {
      // Only revoke blob URLs on unmount
      gifFramesRef.current.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [])

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
        {/* Left Preview Panel */}
        {imageSrc && gifFrames.length > 0 && (
          <div 
            ref={previewPanelRef}
            className={`bg-gray-800 border-r border-gray-700 overflow-y-auto shrink-0 transition-all duration-300 ${
              showPreviewPanel ? 'w-64' : 'w-0 hidden'
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Frames</h3>
                <button
                  onClick={() => setShowPreviewPanel(!showPreviewPanel)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title={showPreviewPanel ? 'Hide Preview Panel' : 'Show Preview Panel'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPreviewPanel ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2">
                {gifFrames.map((frame, index) => (
                  <div
                    key={`frame-${frame}-${index}`}
                    ref={(el) => {
                      frameElementRefs.current[index] = el
                    }}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => handleGoToFrame(index)}
                    className={`
                      relative group cursor-move
                      border-2 rounded-lg overflow-hidden transition-all
                      ${currentFrame === index 
                        ? 'border-blue-500 bg-blue-500/30 shadow-lg shadow-blue-500/50 ring-2 ring-blue-400/50 scale-105 z-10' 
                        : 'border-gray-700 hover:border-gray-600 bg-gray-700/50'
                      }
                      ${draggedFrameIndex === index ? 'opacity-50' : ''}
                      ${dragOverIndex === index && currentFrame !== index ? 'border-blue-500 border-dashed' : ''}
                    `}
                  >
                    {/* Frame thumbnail */}
                    <div className="aspect-square w-full relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={frame}
                        alt={`Frame ${index + 1}`}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                      
                      {/* Frame number badge */}
                      <div className={`absolute top-1 left-1 text-white text-xs px-1.5 py-0.5 rounded font-semibold transition-all ${
                        currentFrame === index 
                          ? 'bg-blue-500 shadow-md shadow-blue-500/50' 
                          : 'bg-black/70'
                      }`}>
                        {index + 1}
                      </div>
                      
                      {/* Action buttons overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        {/* Insert button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const input = frameFileInputRefs.current[`insert-${index}`]
                            if (input) {
                              input.click()
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition-colors"
                          title="Insert image before this frame"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                        
                        {/* Replace button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const input = frameFileInputRefs.current[`replace-${index}`]
                            if (input) {
                              input.click()
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded-lg transition-colors"
                          title="Replace this frame"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </button>
                        
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFrameAt(index)
                          }}
                          disabled={gifFrames.length <= 1}
                          className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete frame"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Hidden file input for inserting before this frame */}
                    <input
                      type="file"
                      ref={(el) => {
                        frameFileInputRefs.current[`insert-${index}`] = el
                      }}
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleInsertFrameAt(index, file)
                        }
                        // Reset input
                        if (e.target) {
                          e.target.value = ''
                        }
                      }}
                      className="hidden"
                    />
                    
                    {/* Hidden file input for replacing this frame */}
                    <input
                      type="file"
                      ref={(el) => {
                        frameFileInputRefs.current[`replace-${index}`] = el
                      }}
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleReplaceFrameAt(index, file)
                        }
                        // Reset input
                        if (e.target) {
                          e.target.value = ''
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                ))}
                
                {/* Add frame button at the end */}
                <div className="relative group">
                  <button
                    onClick={() => {
                      const input = frameFileInputRefs.current['append']
                      if (input) {
                        input.click()
                      }
                    }}
                    className="w-full aspect-square border-2 border-dashed border-gray-600 rounded-lg hover:border-gray-500 transition-colors flex items-center justify-center"
                    title="Add frame at the end"
                  >
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  
                  {/* Hidden file input for adding at the end */}
                  <input
                    type="file"
                    ref={(el) => {
                      frameFileInputRefs.current['append'] = el
                    }}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleInsertFrameAt(gifFrames.length, file)
                      }
                      // Reset input
                      if (e.target) {
                        e.target.value = ''
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-400 text-center">
                  Drag to reorder • Click to preview • Hover for insert/replace/delete
                </p>
              </div>
            </div>
          </div>
        )}
        
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
                {gifFrames.length > 0 && (
                  <button
                    onClick={() => setShowPreviewPanel(!showPreviewPanel)}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                    title={showPreviewPanel ? 'Hide Preview Panel' : 'Show Preview Panel'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                )}
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
                {(() => {
                  // Determine which image source to use
                  let imageSource = imageSrc || ''
                  let altText = 'GIF Preview'
                  const imageKey = `img-${currentFrame}-${gifFrames.length}-${viewMode}`
                  
                  if (gifFrames.length > 0 && currentFrame >= 0 && currentFrame < gifFrames.length) {
                    const frameUrl = gifFrames[currentFrame]
                    if (frameUrl && frameUrl.trim() !== '') {
                      imageSource = frameUrl
                      altText = viewMode === 'frame'
                        ? `Frame ${currentFrame + 1} of ${gifFrames.length}`
                        : `GIF Animation - Frame ${currentFrame + 1} of ${gifFrames.length}`
                    }
                  }
                  
                  return (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={imageKey}
                      ref={gifImageRef}
                      src={imageSource}
                      alt={altText}
                      className="max-w-full h-auto block shadow-2xl"
                      draggable={false}
                      onError={(e) => {
                        console.error('Failed to load image:', imageSource)
                        // Fallback to original imageSrc if frame fails to load
                        if (imageSource !== imageSrc && imageSrc) {
                          const target = e.target as HTMLImageElement
                          target.src = imageSrc
                        }
                      }}
                    />
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

