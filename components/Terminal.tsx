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
    <div className="h-full overflow-y-auto pr-4 font-sans text-sm pb-4">
      {logs.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 opacity-50">
           <div className="w-16 h-1 bg-gray-300 rounded-full"></div>
           <p className="text-xs uppercase tracking-widest font-bold">System Idle</p>
        </div>
      )}
      
      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="group flex gap-4 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="flex-none text-[10px] font-bold text-gray-400 mt-1 select-none w-12 text-right">
                {formatTime(log.timestamp)}
            </span>
            
            <div className="flex-1 space-y-1">
                {log.type === 'visual' && (
                    <div className="text-gray-800 font-medium bg-white/50 p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl shadow-sm border border-white">
                        {log.message}
                    </div>
                )}

                {log.type === 'bridge' && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 italic pl-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-300"></span>
                        Synced with Voice Agent
                    </div>
                )}

                {log.type === 'error' && (
                    <div className="text-red-500 bg-red-50 p-2 rounded-lg text-xs font-bold border border-red-100">
                        Error: {log.message}
                    </div>
                )}

                {log.type === 'success' && (
                    <div className="text-green-600 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        {log.message}
                    </div>
                )}
                
                {log.type === 'info' && (
                    <div className="text-gray-400 text-xs pl-1">
                        {log.message}
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>
      <div ref={bottomRef} className="h-4" />
    </div>
  );
};