'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'


interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

type Tool = 'select' | 'crop' | 'resize' | 'format' | 'compress'

interface HistoryState {
  imageSrc: string
  timestamp: number
}

export default function ImageEditor() {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [cropMode, setCropMode] = useState(false)
  const [cropArea, setCropArea] = useState<CropArea | null>(null)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [resizeWidth, setResizeWidth] = useState<string>('')
  const [resizeHeight, setResizeHeight] = useState<string>('')
  const [outputFormat, setOutputFormat] = useState<string>('png')
  const [compressionQuality, setCompressionQuality] = useState<number>(80)
  const [zoom, setZoom] = useState<number>(100)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null)
  const [isCropping, setIsCropping] = useState(false)
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [showProperties, setShowProperties] = useState(true)
  
  // GIF-specific state
  const [isGif, setIsGif] = useState(false)
  const [gifFrames, setGifFrames] = useState<string[]>([])
  const [currentFrame, setCurrentFrame] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [viewMode, setViewMode] = useState<'animated' | 'frame'>('animated')
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
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
        // Create FFmpeg instance
        const ffmpeg = new FFmpeg()
        ffmpegRef.current = ffmpeg

        // Enable logging for debugging
        ffmpeg.on('log', ({ message }) => {
          console.log(message)
        })

        // Load if not already loaded
        if (!ffmpeg.loaded) {
          console.log('Loading FFmpeg core...')
          const loadPromise = ffmpeg.load()
          ffmpegLoadPromiseRef.current = loadPromise
          await loadPromise
        }

        // Verify FFmpeg is actually loaded before setting state
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

  // History management
  const addToHistory = (src: string) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ imageSrc: src, timestamp: Date.now() })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    // Limit history to last 50 states
    if (newHistory.length > 50) {
      setHistory(newHistory.slice(-50))
      setHistoryIndex(49)
    }
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const handleUndo = useCallback(() => {
    setHistoryIndex((prevIndex) => {
      if (prevIndex <= 0) return prevIndex
      const newIndex = prevIndex - 1
      setHistory((h) => {
        setImageSrc(h[newIndex].imageSrc)
        return h
      })
      return newIndex
    })
  }, [])

  const handleRedo = useCallback(() => {
    setHistoryIndex((prevIndex) => {
      setHistory((h) => {
        if (prevIndex >= h.length - 1) return h
        const newIndex = prevIndex + 1
        setImageSrc(h[newIndex].imageSrc)
        return h
      })
      return prevIndex
    })
  }, [])

  // Extract frames from GIF using FFmpeg
  const extractGifFrames = async (file: File) => {
    // Wait for FFmpeg to be loaded if it's still loading
    if (!ffmpegLoaded && ffmpegLoadPromiseRef.current) {
      try {
        await ffmpegLoadPromiseRef.current
        // Update state after promise resolves
        if (ffmpegRef.current?.loaded) {
          setFfmpegLoaded(true)
        }
      } catch (error) {
        console.warn('FFmpeg failed to load, skipping frame extraction:', error)
        setGifFrames([])
        return
      }
    }

    // Verify FFmpeg instance exists and is actually loaded
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
      
      // Extract all frames as PNG images
      const extractArgs = ['-i', inputFile, '-vsync', '0', 'frame_%03d.png']
      
      await ffmpeg.exec(extractArgs)
      
      // Try to read frames (up to 100 frames to avoid performance issues)
      const frames: string[] = []
      
      let frameIndex = 0
      while (frameIndex < 100) {
        try {
          const frameFile = `frame_${String(frameIndex + 1).padStart(3, '0')}.png`
          const data = await ffmpeg.readFile(frameFile)
          
          const blob = new Blob([data], { type: 'image/png' })
          const frameUrl = URL.createObjectURL(blob)
          frames.push(frameUrl)
          
          await ffmpeg.deleteFile(frameFile).catch(() => {})
          frameIndex++
        } catch {
          // No more frames
          break
        }
      }
      
      setGifFrames(frames)
      setCurrentFrame(0)
      
      // Cleanup
      await ffmpeg.deleteFile(inputFile).catch(() => {})
      
      // Note: isGif is already set to true when file is loaded
      // Frame extraction is optional - GIF will work even without extracted frames
    } catch (error) {
      console.error('Error extracting GIF frames:', error)
      // Don't set isGif to false - the GIF can still be displayed animated
      // Just clear the frames array
      setGifFrames([])
    } finally {
      setLoading(false)
    }
  }

  // Load image from file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      // Reset GIF state
      setIsGif(false)
      setGifFrames([])
      setCurrentFrame(0)
      setIsPlaying(false)
      setViewMode('animated')
      
      // Stop any running animation
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
        animationIntervalRef.current = null
      }
      
      // Check if it's a GIF
      if (file.type === 'image/gif') {
        // Set GIF state immediately so UI controls appear
        setIsGif(true)
        setViewMode('animated')
        setIsPlaying(true)
        
        const reader = new FileReader()
        reader.onload = async (e) => {
          const newSrc = e.target?.result as string
          setImageSrc(newSrc)
          setHistory([{ imageSrc: newSrc, timestamp: Date.now() }])
          setHistoryIndex(0)
          resetView()
          
          // Extract frames in background (non-blocking)
          extractGifFrames(file).catch((error) => {
            console.warn('Frame extraction failed, but GIF will still display:', error)
            // Keep isGif true so controls still work for animated view
          })
        }
        reader.readAsDataURL(file)
      } else {
        const reader = new FileReader()
        reader.onload = (e) => {
          const newSrc = e.target?.result as string
          setImageSrc(newSrc)
          setHistory([{ imageSrc: newSrc, timestamp: Date.now() }])
          setHistoryIndex(0)
          resetView()
        }
        reader.readAsDataURL(file)
      }
    }
  }

  // Download image
  const handleDownload = useCallback(() => {
    if (!imageSrc) return

    const link = document.createElement('a')
    link.download = `edited-image.${outputFormat}`
    link.href = imageSrc
    link.click()
  }, [imageSrc, outputFormat])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input/textarea is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault()
        handleRedo()
      }
      // Ctrl/Cmd + O for open
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        fileInputRef.current?.click()
      }
      // Ctrl/Cmd + S for save/download
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleDownload()
      }
      // 1-5 for tool shortcuts
      if (e.key === '1') {
        e.preventDefault()
        setActiveTool('select')
        setCropMode(false)
      }
      if (e.key === '2') {
        e.preventDefault()
        handleToolSelect('crop')
      }
      if (e.key === '3') {
        e.preventDefault()
        handleToolSelect('resize')
      }
      if (e.key === '4') {
        e.preventDefault()
        handleToolSelect('format')
      }
      if (e.key === '5') {
        e.preventDefault()
        handleToolSelect('compress')
      }
      // +/- for zoom
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault()
        handleZoom(25)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        handleZoom(-25)
      }
      // 0 for reset zoom
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        resetView()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, handleDownload])

  // Draw image on canvas
  const drawImage = () => {
    if (!imageRef.current || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const img = imageRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return

    // Set canvas to match displayed image size
    const displayedWidth = img.width
    const displayedHeight = img.height
    
    canvas.width = displayedWidth
    canvas.height = displayedHeight
    ctx.drawImage(img, 0, 0, displayedWidth, displayedHeight)
  }

  // Get canvas coordinates from mouse event
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLElement>) => {
    // Use the image's parent element (the transformed div) for both modes
    const element = imageRef.current?.parentElement
    if (!element || !imageRef.current) return null
    
    const rect = element.getBoundingClientRect()
    // Calculate scale accounting for zoom
    const displayedWidth = rect.width
    const displayedHeight = rect.height
    const scaleX = imageRef.current.naturalWidth / displayedWidth
    const scaleY = imageRef.current.naturalHeight / displayedHeight
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      scaleX,
      scaleY
    }
  }

  // Handle crop
  const handleCropStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropMode || !imageRef.current) return
    
    const coords = getCanvasCoordinates(e)
    if (!coords) return
    
    setIsCropping(true)
    setStartPos({ x: coords.x, y: coords.y })
    setCropArea({ x: coords.x, y: coords.y, width: 0, height: 0 })
  }

  const handleCropMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropMode || !isCropping || !startPos || !imageRef.current) return
    
    const coords = getCanvasCoordinates(e)
    if (!coords) return
    
    setCropArea({
      x: Math.min(startPos.x, coords.x),
      y: Math.min(startPos.y, coords.y),
      width: Math.abs(coords.x - startPos.x),
      height: Math.abs(coords.y - startPos.y),
    })
  }

  const handleCropEnd = () => {
    if (!isCropping) return
    
    setIsCropping(false)
    
    if (!cropArea || !cropArea.width || !cropArea.height) {
      setCropArea(null)
      setStartPos(null)
      return
    }
    
    applyCrop()
  }

  const applyCrop = () => {
    if (!cropArea || !canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw full image first
    canvas.width = imageRef.current.naturalWidth
    canvas.height = imageRef.current.naturalHeight
    ctx.drawImage(imageRef.current, 0, 0)
    
    // Crop the area
    const { x, y, width, height } = cropArea
    const imageData = ctx.getImageData(Math.round(x), Math.round(y), Math.round(width), Math.round(height))
    
    // Create new canvas with cropped dimensions
    canvas.width = Math.round(width)
    canvas.height = Math.round(height)
    ctx.putImageData(imageData, 0, 0)
    
    const newSrc = canvas.toDataURL()
    setImageSrc(newSrc)
    addToHistory(newSrc)
    setCropMode(false)
    setIsCropping(false)
    setCropArea(null)
    setStartPos(null)
  }

  // Resize image
  const handleResize = () => {
    if (!imageRef.current || !canvasRef.current) return
    
    const originalWidth = imageRef.current.naturalWidth
    const originalHeight = imageRef.current.naturalHeight
    
    let width = parseInt(resizeWidth)
    let height = parseInt(resizeHeight)
    
    // Maintain aspect ratio if only one dimension is provided
    if (width && !height) {
      height = Math.round((width / originalWidth) * originalHeight)
    } else if (height && !width) {
      width = Math.round((height / originalHeight) * originalWidth)
    } else if (!width && !height) {
      width = originalWidth
      height = originalHeight
    }
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width
    canvas.height = height
    ctx.drawImage(imageRef.current, 0, 0, width, height)
    
    const newSrc = canvas.toDataURL()
    setImageSrc(newSrc)
    addToHistory(newSrc)
    setResizeWidth('')
    setResizeHeight('')
  }

  // Convert format and compress using FFmpeg
  const handleConvertAndCompress = async () => {
    if (!imageSrc) {
      alert('Please load an image first')
      return
    }

    // Wait for FFmpeg to be loaded if it's still loading
    if (!ffmpegLoaded && ffmpegLoadPromiseRef.current) {
      try {
        await ffmpegLoadPromiseRef.current
        // Update state after promise resolves
        if (ffmpegRef.current?.loaded) {
          setFfmpegLoaded(true)
        }
      } catch (error) {
        console.warn('FFmpeg failed to load, using fallback method:', error)
        fallbackCompress()
        return
      }
    }

    // Verify FFmpeg instance exists and is actually loaded
    const ffmpeg = ffmpegRef.current
    if (!ffmpeg || !ffmpeg.loaded || !ffmpegLoaded) {
      console.warn('FFmpeg not loaded yet, using fallback method')
      fallbackCompress()
      return
    }

    setLoading(true)
    try {
      
      // Get the original file format from the image source
      const response = await fetch(imageSrc)
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      
      // Determine input format from blob type
      let inputFormat = 'png'
      if (blob.type.includes('jpeg') || blob.type.includes('jpg')) {
        inputFormat = 'jpg'
      } else if (blob.type.includes('webp')) {
        inputFormat = 'webp'
      } else if (blob.type.includes('png')) {
        inputFormat = 'png'
      } else if (blob.type.includes('bmp')) {
        inputFormat = 'bmp'
      } else if (blob.type.includes('gif')) {
        inputFormat = 'gif'
      } else if (blob.type.includes('tiff') || blob.type.includes('tif')) {
        inputFormat = 'tiff'
      }
      
      const inputFile = `input.${inputFormat}`
      await ffmpeg.writeFile(inputFile, new Uint8Array(arrayBuffer))

      // Build FFmpeg command arguments
      const args: string[] = ['-i', inputFile]
      
      // Determine quality based on format
      if (outputFormat === 'jpg' || outputFormat === 'jpeg') {
        // FFmpeg quality for JPEG: 2-31, where 2 is best quality
        // Convert 1-100 to 31-2 (inverse scale)
        const qv = Math.max(2, Math.min(31, Math.round(31 - (compressionQuality * 29 / 100))))
        args.push('-q:v', qv.toString())
      } else if (outputFormat === 'png') {
        // PNG compression: 0-9, where 9 is best compression
        const compressionLevel = Math.max(0, Math.min(9, Math.round((100 - compressionQuality) / 11)))
        args.push('-compression_level', compressionLevel.toString())
      } else if (outputFormat === 'webp') {
        // WebP quality: 0-100
        args.push('-quality', compressionQuality.toString())
      } else if (outputFormat === 'bmp') {
        // BMP is lossless, no quality setting needed
        // But we can specify pixel format for optimization
        args.push('-pix_fmt', 'bgr24')
      } else if (outputFormat === 'gif') {
        // GIF is lossless, no quality setting needed
        // Note: For animated GIFs, would need palettegen filter, but for static conversion this works
      } else if (outputFormat === 'tiff' || outputFormat === 'tif') {
        // TIFF compression: can use LZW, ZIP, or JPEG compression
        args.push('-compression_algo', 'lzw')
      }

      // Convert and compress
      const outputFile = `output.${outputFormat}`
      args.push(outputFile)
      
      await ffmpeg.exec(args)

      // Read output file
      const data = await ffmpeg.readFile(outputFile)
      // Determine MIME type for blob
      let mimeType = `image/${outputFormat}`
      if (outputFormat === 'jpg' || outputFormat === 'jpeg') {
        mimeType = 'image/jpeg'
      } else if (outputFormat === 'tiff' || outputFormat === 'tif') {
        mimeType = 'image/tiff'
      }
      const outputBlob = new Blob([data], { type: mimeType })
      
      // Update image display
      const reader = new FileReader()
      reader.onload = (e) => {
        const newSrc = e.target?.result as string
        setImageSrc(newSrc)
        addToHistory(newSrc)
      }
      reader.readAsDataURL(outputBlob)

      // Cleanup
      await ffmpeg.deleteFile(inputFile).catch(() => {})
      await ffmpeg.deleteFile(outputFile).catch(() => {})
    } catch (error) {
      console.error('Error converting/compressing with FFmpeg:', error)
      // Fallback: use canvas compression
      fallbackCompress()
    } finally {
      setLoading(false)
    }
  }

  // Fallback compression using canvas
  const fallbackCompress = () => {
    if (!canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions to match image
    canvas.width = imageRef.current.naturalWidth
    canvas.height = imageRef.current.naturalHeight

    const quality = compressionQuality / 100
    let mimeType = 'image/png'
    
    // Canvas only supports PNG, JPEG, and WebP
    // For other formats, convert to PNG or JPEG as fallback
    if (outputFormat === 'jpg' || outputFormat === 'jpeg') {
      mimeType = 'image/jpeg'
    } else if (outputFormat === 'webp') {
      mimeType = 'image/webp'
    } else if (outputFormat === 'bmp' || outputFormat === 'gif' || outputFormat === 'tiff' || outputFormat === 'tif') {
      // Browser canvas doesn't support these formats directly
      // Fall back to PNG for lossless conversion
      mimeType = 'image/png'
      console.warn(`Browser canvas doesn't support ${outputFormat.toUpperCase()} format. Using PNG as fallback. For ${outputFormat.toUpperCase()} conversion, please ensure FFmpeg is loaded.`)
    }

    ctx.drawImage(imageRef.current, 0, 0)
    const dataUrl = canvas.toDataURL(mimeType, quality)
    setImageSrc(dataUrl)
    addToHistory(dataUrl)
  }

  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(25, Math.min(500, prev + delta)))
  }

  // Handle pan start
  const handlePanStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'select' || !imageSrc) return
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
      // Currently playing - pause by showing a static frame
      if (gifFrames.length > 0) {
        // Show current frame (or first frame if at start)
        setViewMode('frame')
        setIsPlaying(false)
      } else {
        // No frames extracted yet - can't pause, but we can stop the animation
        // by temporarily removing the src (but this is a hack)
        // Better: show message that frame extraction is needed
        console.warn('Cannot pause: frames not extracted yet')
      }
    } else {
      // Currently paused - play by showing animated GIF
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
    if (isGif && viewMode === 'frame' && gifFrames.length === 0) {
      // Auto-switch to animated mode if no frames available
      setViewMode('animated')
      setIsPlaying(true)
    }
  }, [isGif, viewMode, gifFrames.length])

  // Ensure currentFrame is valid when frames change
  useEffect(() => {
    if (gifFrames.length > 0 && currentFrame >= gifFrames.length) {
      setCurrentFrame(0)
    }
  }, [gifFrames.length, currentFrame])

  // Handle GIF animation playback
  // Note: Browser handles GIF animation automatically, this effect just manages state
  useEffect(() => {
    if (!isGif || viewMode !== 'animated') {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
        animationIntervalRef.current = null
      }
      return
    }

    // Browser handles GIF animation natively - no need for interval
    // Just ensure playing state is correct
    if (viewMode === 'animated' && !isPlaying) {
      // If user wants to play but isPlaying is false, we don't need to do anything
      // The browser will animate the GIF automatically when src is set
    }

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
        animationIntervalRef.current = null
      }
    }
  }, [isGif, isPlaying, viewMode])

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
    if (canvasContainerRef.current && imageRef.current) {
      const container = canvasContainerRef.current
      const img = imageRef.current
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

  // Handle tool selection
  const handleToolSelect = (tool: Tool) => {
    setActiveTool(tool)
    if (tool === 'crop') {
      setCropMode(true)
    } else {
      setCropMode(false)
      setIsCropping(false)
      setCropArea(null)
      setStartPos(null)
    }
    if (tool === 'resize') {
      if (imageRef.current) {
        setResizeWidth(imageRef.current.naturalWidth.toString())
        setResizeHeight(imageRef.current.naturalHeight.toString())
      }
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Menu Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-1.5 flex items-center gap-1 text-sm">
        {/* File Group */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 hover:bg-gray-700 rounded transition-colors tooltip-wrapper-top group"
          data-tooltip="Open Image (Ctrl+O)"
          title="Open Image (Ctrl+O)"
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

        {/* Edit Group */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:hover:bg-gray-800 tooltip-wrapper-top group"
          data-tooltip="Undo (Ctrl+Z)"
          title="Undo (Ctrl+Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span className="text-[9px] text-gray-400 group-hover:text-gray-300 leading-none">Undo</span>
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:hover:bg-gray-800 tooltip-wrapper-top group"
          data-tooltip="Redo (Ctrl+Shift+Z)"
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6-6m6 6l-6 6" />
          </svg>
          <span className="text-[9px] text-gray-400 group-hover:text-gray-300 leading-none">Redo</span>
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

        {/* Tool shortcuts info */}
        <div className="ml-auto text-xs text-gray-400 hidden lg:block">
          <span>Tools: 1-5 | Zoom: Ctrl+/- | Undo: Ctrl+Z</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar - Vertical */}
        <div className="w-14 sm:w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-2 gap-1 shrink-0">
          <button
            onClick={() => handleToolSelect('select')}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg transition-all flex items-center justify-center touch-manipulation tooltip-wrapper ${
              activeTool === 'select' 
                ? 'bg-primary-600 text-white shadow-lg' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white active:bg-gray-600'
            }`}
            data-tooltip="Select Tool (1)"
            title="Select Tool (1)"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </button>
          <button
            onClick={() => handleToolSelect('crop')}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg transition-all flex items-center justify-center touch-manipulation tooltip-wrapper ${
              activeTool === 'crop' 
                ? 'bg-primary-600 text-white shadow-lg' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white active:bg-gray-600'
            }`}
            data-tooltip="Crop Tool (2)"
            title="Crop Tool (2)"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => handleToolSelect('resize')}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg transition-all flex items-center justify-center touch-manipulation tooltip-wrapper ${
              activeTool === 'resize' 
                ? 'bg-primary-600 text-white shadow-lg' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white active:bg-gray-600'
            }`}
            data-tooltip="Resize Tool (3)"
            title="Resize Tool (3)"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <button
            onClick={() => handleToolSelect('format')}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg transition-all flex items-center justify-center touch-manipulation tooltip-wrapper ${
              activeTool === 'format' 
                ? 'bg-primary-600 text-white shadow-lg' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white active:bg-gray-600'
            }`}
            data-tooltip="Format Settings (4)"
            title="Format Settings (4)"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
          <button
            onClick={() => handleToolSelect('compress')}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg transition-all flex items-center justify-center touch-manipulation tooltip-wrapper ${
              activeTool === 'compress' 
                ? 'bg-primary-600 text-white shadow-lg' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white active:bg-gray-600'
            }`}
            data-tooltip="Compression Settings (5)"
            title="Compression Settings (5)"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>
          <div className="mt-auto flex flex-col gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg transition-all flex items-center justify-center text-gray-300 hover:bg-gray-700 hover:text-white active:bg-gray-600 disabled:opacity-30 disabled:hover:bg-gray-800 disabled:hover:text-gray-300 touch-manipulation tooltip-wrapper"
              data-tooltip="Undo (Ctrl+Z)"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg transition-all flex items-center justify-center text-gray-300 hover:bg-gray-700 hover:text-white active:bg-gray-600 disabled:opacity-30 disabled:hover:bg-gray-800 disabled:hover:text-gray-300 touch-manipulation tooltip-wrapper"
              data-tooltip="Redo (Ctrl+Shift+Z)"
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6-6m6 6l-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Central Canvas Area - Largest part */}
        <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden min-w-0">
          {/* Status Bar */}
          {imageSrc && (
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-1.5 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2 sm:gap-4">
                {imageRef.current && (
                  <span className="font-mono text-xs sm:text-sm">
                    <span className="hidden sm:inline">{imageRef.current.naturalWidth} × {imageRef.current.naturalHeight}px</span>
                    <span className="sm:hidden">{imageRef.current.naturalWidth}×{imageRef.current.naturalHeight}</span>
                  </span>
                )}
                <span className="text-gray-500 hidden sm:inline">|</span>
                <span className="uppercase text-xs sm:text-sm">{outputFormat}</span>
                {isGif && (
                  <>
                    <span className="text-gray-500 hidden sm:inline">|</span>
                    <span className="text-xs sm:text-sm">
                      {viewMode === 'frame' && gifFrames.length > 0 
                        ? `Frame ${currentFrame + 1}/${gifFrames.length}` 
                        : 'GIF Animation'}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isGif && (
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
                )}
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

          {/* Canvas Container - Central focal point */}
          <div
            ref={canvasContainerRef}
            className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-8"
            onMouseDown={activeTool === 'select' ? handlePanStart : (cropMode ? handleCropStart : undefined)}
            onMouseMove={activeTool === 'select' ? handlePanMove : (cropMode ? handleCropMove : undefined)}
            onMouseUp={activeTool === 'select' ? handlePanEnd : (cropMode ? handleCropEnd : undefined)}
            onMouseLeave={activeTool === 'select' ? handlePanEnd : (cropMode ? handleCropEnd : undefined)}
            style={{ cursor: cropMode ? 'crosshair' : (activeTool === 'select' ? (isPanning ? 'grabbing' : 'grab') : 'default') }}
          >
            {!imageSrc ? (
              <div className="text-center text-gray-500">
                <svg className="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg mb-2">No image loaded</p>
                <p className="text-sm text-gray-600">Click &quot;Open Image&quot; to get started</p>
              </div>
            ) : (
              <div
                className="relative inline-block"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                  transition: isPanning || isCropping ? 'none' : 'transform 0.1s ease-out',
                }}
              >
                {/* Hidden image for canvas operations */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={isGif && viewMode === 'frame' && gifFrames[currentFrame] ? gifFrames[currentFrame] : imageSrc}
                  alt="Preview"
                  onLoad={drawImage}
                  className="hidden"
                />
                {/* Display image - animated GIF or frame */}
                {isGif && viewMode === 'frame' && gifFrames.length > 0 && gifFrames[currentFrame] ? (
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
                    alt="Preview"
                    className="max-w-full h-auto block shadow-2xl"
                    draggable={false}
                  />
                )}
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                {cropMode && cropArea && imageRef.current && (
                  <div
                    className="absolute border-2 border-primary-500 bg-primary-500 bg-opacity-20 pointer-events-none shadow-lg"
                    style={{
                      left: `${(cropArea.x / imageRef.current.naturalWidth) * 100}%`,
                      top: `${(cropArea.y / imageRef.current.naturalHeight) * 100}%`,
                      width: `${(cropArea.width / imageRef.current.naturalWidth) * 100}%`,
                      height: `${(cropArea.height / imageRef.current.naturalHeight) * 100}%`,
                    }}
                  >
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary-500 border border-white rounded-full"></div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 border border-white rounded-full"></div>
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary-500 border border-white rounded-full"></div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary-500 border border-white rounded-full"></div>
                  </div>
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
              {/* Crop Properties */}
              {activeTool === 'crop' && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Crop Tool
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Click and drag on the canvas to select the area to crop
                  </p>
                </div>
              )}

              {/* Resize Properties */}
              {activeTool === 'resize' && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Resize Image
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Width (px)</label>
                      <input
                        type="number"
                        value={resizeWidth}
                        onChange={(e) => setResizeWidth(e.target.value)}
                        placeholder="Width"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Height (px)</label>
                      <input
                        type="number"
                        value={resizeHeight}
                        onChange={(e) => setResizeHeight(e.target.value)}
                        placeholder="Height"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
                      />
                    </div>
                    <button
                      onClick={handleResize}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Apply Resize
                    </button>
                  </div>
                </div>
              )}

              {/* Format Properties */}
              {activeTool === 'format' && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Output Format
                  </h3>
                  <div className="space-y-3">
                    <label className="text-sm text-gray-400 mb-1 block">File Format</label>
                    <select
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
                    >
                      <option value="png">PNG - Portable Network Graphics</option>
                      <option value="jpg">JPG - JPEG Image</option>
                      <option value="jpeg">JPEG - Joint Photographic Experts Group</option>
                      <option value="webp">WebP - Modern Web Format</option>
                      <option value="bmp">BMP - Bitmap Image</option>
                      <option value="gif">GIF - Graphics Interchange Format</option>
                      <option value="tiff">TIFF - Tagged Image File Format</option>
                    </select>
                    <button
                      onClick={handleConvertAndCompress}
                      disabled={loading}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Converting...' : 'Convert Format'}
                    </button>
                  </div>
                </div>
              )}

              {/* Compression Properties */}
              {activeTool === 'compress' && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Compression
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm text-gray-400">Quality</label>
                        <span className="text-sm font-medium text-white">{compressionQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={compressionQuality}
                        onChange={(e) => setCompressionQuality(parseInt(e.target.value))}
                        className="w-full accent-primary-500"
                      />
                    </div>
                    <button
                      onClick={handleConvertAndCompress}
                      disabled={loading}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processing...' : 'Apply Compression'}
                    </button>
                  </div>
                </div>
              )}

              {/* GIF Controls */}
              {isGif && (
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
              )}

              {/* Default/Select Tool View */}
              {activeTool === 'select' && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Image Info</h3>
                  {imageRef.current && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Dimensions:</span>
                        <span className="text-white font-mono">
                          {imageRef.current.naturalWidth} × {imageRef.current.naturalHeight}px
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Output Format:</span>
                        <span className="text-white uppercase">{outputFormat}</span>
                      </div>
                      {isGif && gifFrames.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Frames:</span>
                          <span className="text-white font-mono">{gifFrames.length}</span>
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t border-gray-600">
                        <p className="text-gray-400 text-xs">
                          Use the tools in the toolbar above to edit your image. Click and drag to pan when using the select tool.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

