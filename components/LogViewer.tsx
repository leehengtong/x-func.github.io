"use client";

import React, { useState, useRef, useEffect } from 'react';

type LogLevel = 'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'BLANK_LINES';

interface LogLine {
  lineNumber: number;
  content: string;
  level: LogLevel;
  isContextLine?: boolean;
}

interface SelectedLevels {
  FATAL: boolean;
  ERROR: boolean;
  WARN: boolean;
  INFO: boolean;
  DEBUG: boolean;
  BLANK_LINES: boolean;
  [level: string]: boolean;
}

export default function LogViewer() {
  const [logContent, setLogContent] = useState<string>('');
  const [parsedLog, setParsedLog] = useState<LogLine[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLevels, setSelectedLevels] = useState<SelectedLevels>({
    FATAL: true,
    ERROR: true,
    WARN: true,
    INFO: true,
    DEBUG: true,
    BLANK_LINES: true,
  });
  const [blankLineDistance, setBlankLineDistance] = useState<number>(5);
  const [showDistancePopup, setShowDistancePopup] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const distancePopupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePaste(e: Event) {
      if (!(e instanceof window.Event) || !(e as ClipboardEvent).clipboardData) return;
      const clipboardEvent = e as ClipboardEvent;
      const target = clipboardEvent.target as HTMLElement;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      clipboardEvent.preventDefault();
      const text = clipboardEvent.clipboardData?.getData('text');
      if (text) {
        setLogContent(text);
        setParsedLog(parseLogContent(text));
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
    // parseLogContent does not depend on anything external affecting output aside from blankLineDistance (closure ok here)
    // eslint-disable-next-line
  }, [blankLineDistance]);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showDistancePopup && distancePopupRef.current && !distancePopupRef.current.contains(event.target as Node)) {
        // Check if click is on the button that opens the popup
        const target = event.target as HTMLElement;
        if (!target.closest('button[title="Distance Settings"]')) {
          setShowDistancePopup(false);
        }
      }
    }
    if (showDistancePopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDistancePopup]);

  const parseLogContent = (content: string, distance?: number): LogLine[] => {
    if (!content) return [];
    // Use provided distance or fall back to current blankLineDistance state
    const currentDistance = distance !== undefined ? distance : blankLineDistance;
    let cleanContent = content;
    if (content.startsWith("b'")) {
      cleanContent = content.slice(2, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"');
    }
    const lines = cleanContent.split('\n');
    
    // First pass: identify lines with actual log levels
    interface LineWithLevel {
      lineNumber: number;
      content: string;
      level: LogLevel | null;
      hasLogLevel: boolean;
    }
    
    const parsedLines: LineWithLevel[] = lines.map((line, index): LineWithLevel => {
      let level: LogLevel | null = null;
      if (line.includes('FATAL')) level = 'FATAL';
      else if (line.includes('ERROR')) level = 'ERROR';
      else if (line.includes('WARN')) level = 'WARN';
      else if (line.includes('DEBUG')) level = 'DEBUG';
      else if (line.includes('INFO')) level = 'INFO';
      
      return { 
        lineNumber: index + 1, 
        content: line, 
        level: level || 'INFO', 
        hasLogLevel: level !== null 
      };
    });
    
    // Find all lines that have actual log levels (FATAL, ERROR, WARN, INFO, DEBUG)
    const logLevelLineIndices = parsedLines
      .map((log, idx) => log.hasLogLevel ? idx : -1)
      .filter(idx => idx !== -1);
    
    return parsedLines.map((log, idx): LogLine => {
      // Check if this line has a log level
      if (log.hasLogLevel) {
        // This line has a log level, so it's not a blank line or context line
        return { lineNumber: log.lineNumber, content: log.content, level: log.level as LogLevel, isContextLine: false };
      } else {
        // This line doesn't have a log level, check if it's a context line
        // Only consider it a context line if distance > 0 and <= currentDistance
        const isContextLine = currentDistance > 0 && logLevelLineIndices.some(logIdx => {
          const distance = Math.abs(idx - logIdx);
          return distance > 0 && distance <= currentDistance;
        });
        
        if (isContextLine) {
          // It's a context line - find the nearest log level line and use its level
          let nearestLevel: LogLevel = 'INFO';
          let minDistance = Infinity;
          for (const logIdx of logLevelLineIndices) {
            const distance = Math.abs(idx - logIdx);
            if (distance < minDistance) {
              minDistance = distance;
              nearestLevel = parsedLines[logIdx].level as LogLevel;
            }
          }
          return { lineNumber: log.lineNumber, content: log.content, level: nearestLevel, isContextLine: true };
        } else {
          // It's a blank line - doesn't belong to any log level and not within distance
          return { lineNumber: log.lineNumber, content: log.content, level: 'BLANK_LINES', isContextLine: false };
        }
      }
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setLogContent(content);
    setParsedLog(parseLogContent(content));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const content = event.target?.result as string;
        setLogContent(content);
        setParsedLog(parseLogContent(content));
      };
      reader.readAsText(file);
    }
  };

  const handleClear = () => {
    setLogContent('');
    setParsedLog([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleLevel = (level: LogLevel) => {
    setSelectedLevels(prev => ({ ...prev, [level]: !prev[level] }));
  };

  const toggleAllLevels = () => {
    const allEnabled = Object.values(selectedLevels).every(val => val === true);
    const newState = allEnabled ? false : true;
    setSelectedLevels({
      FATAL: newState,
      ERROR: newState,
      WARN: newState,
      INFO: newState,
      DEBUG: newState,
      BLANK_LINES: newState,
    });
  };

  const filteredLogs = parsedLog.filter(log => {
    const matchesSearch = searchTerm
      ? log.content.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const matchesLevel = selectedLevels[log.level];
    // When blankLineDistance is 0, exclude all context lines
    const isContextLineExcluded = blankLineDistance === 0 && log.isContextLine === true;
    return matchesSearch && matchesLevel && !isContextLineExcluded;
  });

  const highlightSearchTerm = (content: string, searchTerm: string) => {
    if (!searchTerm) return content;
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    const parts = content.split(regex);
    return parts.map((part, i) => (
      part && part.toLowerCase() === searchTerm.toLowerCase()
        ? <span key={i} className="highlight">{part}</span>
        : part
    ));
  };

  // Single source of truth for level colors
  const levelColorConfig: Record<LogLevel, {
    bg: string;
    text: string;
    border?: string;
    contextText?: string;
  }> = {
    FATAL: {
      bg: 'bg-red-800',
      text: 'text-red-100',
      border: 'border-red-900',
      contextText: 'text-red-400',
    },
    ERROR: {
      bg: 'bg-purple-100',
      text: 'text-purple-900',
      border: 'border-purple-900',
      contextText: 'text-purple-600',
    },
    WARN: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-900',
      border: 'border-yellow-900',
      contextText: 'text-yellow-500',
    },
    INFO: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-800',
      contextText: 'text-blue-500',
    },
    DEBUG: {
      bg: 'bg-teal-100',
      text: 'text-teal-800',
      border: 'border-teal-600',
      contextText: 'text-teal-600',
    },
    BLANK_LINES: {
      bg: 'bg-transparent',
      text: 'text-gray-600',
      border: 'border-purple-500',
      contextText: 'text-gray-600',
    },
  };

  const getLevelColor = (level: LogLevel, isContextLine?: boolean) => {
    const config = levelColorConfig[level];
    
    // Blank lines have no background color
    if (level === 'BLANK_LINES') {
      return `${config.bg} ${config.text}`;
    }
    
    // Context lines use no background, only lighter text colors
    if (isContextLine) {
      return `bg-transparent ${config.contextText || config.text}`;
    }
    
    // Regular log level lines use normal colors
    return `${config.bg} ${config.text}`;
  };

  const getLevelButtonColors = (level: LogLevel, isSelected: boolean) => {
    if (!isSelected) {
      return {
        container: 'bg-gray-100 opacity-50 border-2 border-gray-300',
        label: 'text-gray-500',
        count: 'text-gray-600',
      };
    }

    const config = levelColorConfig[level];
    
    // Special handling for BLANK_LINES
    if (level === 'BLANK_LINES') {
      return {
        container: 'bg-transparent border-2 border-gray-800',
        label: 'text-gray-600',
        count: 'text-gray-700',
      };
    }

    return {
      container: `${config.bg} border-2 ${config.border || ''}`,
      label: config.text,
      count: config.text,
    };
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 rounded-lg shadow-lg relative">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-2">
        {parsedLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center max-w-2xl">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Logs Loaded</h2>
              <p className="text-gray-500 mb-6">
                Open a log file, or press <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Ctrl+V</kbd> to paste
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >Open File</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col">
            {/* Search Bar */}
            <div className="mb-2 px-2">
              <input
                type="text"
                placeholder="🔍 Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Stats Bar */}
            <div className="grid grid-cols-7 gap-2 mb-2 px-2">
              <div
                onClick={toggleAllLevels}
                className="bg-white p-2 rounded-lg shadow cursor-pointer transition-all hover:scale-105 hover:bg-blue-50 border-2 border-blue-300"
                title="Click to toggle all levels"
              >
                <div className="text-xs text-gray-500">Total Lines</div>
                <div className="text-xl font-bold text-gray-800">{parsedLog.length}</div>
              </div>
              {(['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'BLANK_LINES'] as LogLevel[]).map((level) => {
                const colors = getLevelButtonColors(level, selectedLevels[level]);
                const levelLabels: Record<LogLevel, string> = {
                  FATAL: 'Fatal',
                  ERROR: 'Errors',
                  WARN: 'Warnings',
                  INFO: 'Info',
                  DEBUG: 'Debug',
                  BLANK_LINES: '📏 Blank Lines',
                };
                return (
                  <div
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={`p-2 rounded-lg shadow cursor-pointer transition-all hover:scale-105 ${colors.container}`}
                  >
                    <div className={`text-xs ${colors.label}`}>{levelLabels[level]} {selectedLevels[level] ? '✓' : '✗'}</div>
                    <div className={`text-xl font-bold ${colors.count}`}>{parsedLog.filter(log => log.level === level).length}</div>
                  </div>
                );
              })}
            </div>
            {/* Log Display */}
            <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden mx-2">
              <div className="log-container font-mono text-sm">
                {filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`log-line ${getLevelColor(log.level, log.isContextLine)} border-b border-gray-200 hover:bg-opacity-80 transition-colors`}
                  >
                    <span className="line-number opacity-50 select-none">{log.lineNumber}</span>
                    <span className="line-content whitespace-pre-wrap break-all">
                      {highlightSearchTerm(log.content || ' ', searchTerm)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Floating Action Buttons */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-50">
        <button
          onClick={handleClear}
          className="bg-red-600 text-white p-4 rounded-full shadow-2xl hover:bg-red-700 transition-all hover:scale-110"
          title="Clear All"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          className="bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-700 transition-all hover:scale-110"
          title="Open File"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
        </button>
        <button
          onClick={() => setShowDistancePopup(!showDistancePopup)}
          className="bg-purple-600 text-white p-4 rounded-full shadow-2xl hover:bg-purple-700 transition-all hover:scale-110"
          title="Distance Settings"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      </div>
      {/* Distance Settings Popup */}
      {showDistancePopup && (
        <div ref={distancePopupRef} className="absolute bottom-24 right-6 bg-white rounded-lg shadow-2xl p-4 z-50 min-w-[280px] border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span>📏</span>
              <span>Context Line Distance</span>
            </label>
            <button
              onClick={() => setShowDistancePopup(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Value</span>
              <span className="text-lg font-bold text-blue-600">{blankLineDistance}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={blankLineDistance}
              onChange={(e) => {
                const newDistance = parseInt(e.target.value);
                if (!isNaN(newDistance)) {
                  setBlankLineDistance(newDistance);
                  if (logContent) setParsedLog(parseLogContent(logContent, newDistance));
                }
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              title="Blank line distance (lines far from errors/warnings)"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Lines far from errors/warnings are considered blank
          </p>
        </div>
      )}
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".log,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />
      {/* Hidden Textarea for manual editing / support manual paste */}
      <textarea
        value={logContent}
        onChange={handleTextChange}
        className="hidden"
        spellCheck={false}
      />
      {/* Inline global styles for highlight and log lines if necessary */}
      <style jsx global>{`
        .log-container {
          height: 100%;
          overflow-y: auto;
        }
        .log-line {
          display: flex;
          padding: 8px 12px;
          min-height: 32px;
          align-items: flex-start;
          animation: fadeIn 0.2s ease-out;
        }
        .line-number {
          min-width: 60px;
          padding-right: 16px;
          text-align: right;
          font-weight: 600;
          user-select: none;
          flex-shrink: 0;
        }
        .line-content {
          flex: 1;
          word-break: break-word;
        }
        .highlight {
          background-color: #ffeb3b;
          color: #000;
          padding: 2px 4px;
          border-radius: 3px;
          font-weight: 600;
          box-shadow: 0 0 0 2px rgba(255, 235, 59, 0.3);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .log-container { font-size: 12px; }
          .line-number { min-width: 40px; padding-right: 8px; }
        }
      `}</style>
    </div>
  );
}
