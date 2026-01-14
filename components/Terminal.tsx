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
    <div className="h-full bg-black font-mono text-sm p-2 relative overflow-hidden">
      {/* Scanline overlay specific to terminal */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:16px_16px]"></div>

      <div className="h-full overflow-y-auto pr-2 relative z-10 scrollbar-hide">
        {logs.length === 0 && (
          <div className="text-gray-700 mt-4 uppercase">
            > System Ready...
            <br/>
            > Awaiting Visual Input...
          </div>
        )}
        
        {logs.map((log) => (
          <div key={log.id} className="mb-2 font-mono break-words leading-tight">
            <span className="text-gray-600 mr-2">[{formatTime(log.timestamp)}]</span>
            
            {log.type === 'visual' && (
                <span className="text-white">
                    <span className="text-red-500 font-bold mr-1">{'>'}</span>
                    {log.message}
                </span>
            )}

            {log.type === 'bridge' && (
                <span className="text-gray-400 italic">
                     {'>>'} SYNC_AGENT: {log.message}
                </span>
            )}

            {log.type === 'error' && (
                <span className="bg-red-900/30 text-red-500 px-1 border border-red-900/50">
                    ERR: {log.message}
                </span>
            )}

            {log.type === 'success' && (
                <span className="text-white uppercase font-bold">
                    {log.message}
                </span>
            )}
            
            {log.type === 'info' && (
                <span className="text-gray-500">
                    {log.message}
                </span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};