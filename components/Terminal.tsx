import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalProps {
  logs: LogEntry[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  const getColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'visual': return 'text-cyan-400';
      case 'bridge': return 'text-purple-400 font-semibold'; // New bridge color
      case 'error': return 'text-red-500';
      case 'success': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/90 font-mono text-sm p-4 border border-gray-800 rounded-lg shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-2 flex items-center justify-between z-10">
        <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">Console Output</span>
        <div className="flex space-x-2">
          <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
          <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto terminal-scroll mt-8 space-y-2 pr-2">
        {logs.length === 0 && (
          <div className="text-gray-600 italic text-center mt-10">
            System ready. Initialize "Visual Cortex" to begin stream.
          </div>
        )}
        
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 animate-fade-in break-words">
            <span className="text-gray-600 shrink-0 select-none">[{formatTime(log.timestamp)}]</span>
            <span className={`${getColor(log.type)}`}>
              {log.type === 'visual' && <span className="font-bold mr-2">❯</span>}
              {log.type === 'bridge' && <span className="font-bold mr-2">⚡</span>}
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};