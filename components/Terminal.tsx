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
    });
  };

  return (
    <div className="h-full w-full relative bg-[#121212] rounded-xl overflow-hidden font-mono text-lg crt-overlay shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] border border-gray-800/50">
      
      {/* Screen Effects */}
      <div className="scanline-anim opacity-10 pointer-events-none absolute inset-0 z-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_50%,_rgba(0,0,0,0.4)_100%)] pointer-events-none z-10"></div>
      
      {/* Content Container with Fade Mask */}
      <div className="h-full overflow-y-auto p-4 pb-4 space-y-3 relative z-20" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%)' }}>
        
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2 opacity-50">
             <div className="w-12 h-1 bg-gray-600/50 rounded-full animate-pulse"></div>
             <p className="text-sm uppercase tracking-widest font-bold">Awaiting Data Stream</p>
          </div>
        )}
        
        <div className="space-y-3 pt-4">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300 items-start">
              
              {/* Timestamp */}
              <span className="flex-none text-gray-600 font-bold select-none pt-0.5 text-base opacity-70">
                  [{formatTime(log.timestamp)}]
              </span>
              
              {/* Message Body */}
              <div className="flex-1 leading-tight break-words">
                  {log.type === 'visual' && (
                      <div className="text-white text-xl tracking-wide drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                          <span className="text-purple-400 mr-2">›</span>
                          {log.message}
                      </div>
                  )}

                  {log.type === 'bridge' && (
                      <div className="text-cyan-300 text-base italic opacity-80 flex items-center gap-2">
                          <span className="text-xs border border-cyan-800 px-1 rounded bg-cyan-950/30">SYNC</span>
                          {log.message}
                      </div>
                  )}

                  {log.type === 'error' && (
                      <div className="text-pink-500 font-bold tracking-wider drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]">
                          [ERR] {log.message}
                      </div>
                  )}

                  {log.type === 'success' && (
                      <div className="text-green-400 font-bold flex items-center gap-2 tracking-wide drop-shadow-[0_0_5px_rgba(74,222,128,0.4)]">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          {log.message}
                      </div>
                  )}
                  
                  {log.type === 'info' && (
                      <div className="text-gray-400 text-base">
                          {log.message}
                      </div>
                  )}
              </div>
            </div>
          ))}
        </div>
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
};