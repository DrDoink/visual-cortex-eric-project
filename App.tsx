import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { LiveFeed, LiveFeedHandle } from './components/LiveFeed';
import { Terminal } from './components/Terminal';
import { LogEntry, ProcessingState } from './types';
import { analyzeFrame } from './services/geminiService';
import { Activity, Square, Play, Cpu, Aperture, Disc } from 'lucide-react';
import { Conversation } from './components/Conversation';
import { KeyEntryModal } from './components/KeyEntryModal';

const CAPTURE_INTERVAL_MS = 4000;

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [hasKey, setHasKey] = useState(!!process.env.GEMINI_API_KEY);
  
  const liveFeedRef = useRef<LiveFeedHandle>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const lastSnapshotRef = useRef<string | null>(null);
  const lastTextDescriptionRef = useRef<string | null>(null);

  useEffect(() => {
     // Check for keys in local storage if not in env
     if (!process.env.GEMINI_API_KEY) {
        const stored = localStorage.getItem('GEMINI_API_KEY');
        if (stored) {
            // In a real app we'd inject this properly, here we just assume it might be available globally or set in KeyEntry
            setHasKey(true);
        } else {
            setHasKey(false);
        }
     }
  }, []);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message
    }]);
  }, []);

  const conversation = useConversation({
    onConnect: () => addLog('Voice Link Established.', 'success'),
    onDisconnect: () => addLog('Voice Link Terminated.', 'info'),
    onError: (e) => addLog(`Voice Error: ${e}`, 'error'),
    onMessage: (msg: any) => {}
  });

  const performReasoningStep = useCallback(async () => {
    if (processingState !== ProcessingState.IDLE && processingState !== ProcessingState.ANALYZING) return;
    if (processingState === ProcessingState.ANALYZING) return;

    const snapshot = liveFeedRef.current?.getSnapshot();
    if (!snapshot) return;

    setProcessingState(ProcessingState.ANALYZING);
    
    try {
      const result = await analyzeFrame(
        snapshot, 
        lastSnapshotRef.current, 
        lastTextDescriptionRef.current
      );
      
      lastSnapshotRef.current = snapshot;

      if (result.includes("NO_CHANGE") || result.trim().length === 0) {
        // no-op
      } else {
        lastTextDescriptionRef.current = result;
        addLog(result, 'visual');
        
        if (conversation.status === 'connected') {
            try {
                await conversation.sendContextualUpdate(result);
                addLog('Context synced to Agent.', 'bridge');
            } catch (bridgeError) {
                console.error("Bridge failure:", bridgeError);
                addLog('Bridge Sync Failed.', 'error');
            }
        }
      } 
      
    } catch (error) {
      const err = error as Error;
      addLog(`Observer Malfunction: ${err.message}`, 'error');
    } finally {
      setProcessingState(ProcessingState.IDLE);
    }
  }, [addLog, processingState, conversation]);
  
  const reasoningStepRef = useRef(performReasoningStep);

  useEffect(() => {
    reasoningStepRef.current = performReasoningStep;
  }, [performReasoningStep]);

  const toggleVisualSystem = () => {
    if (isActive) {
      setIsActive(false);
      setProcessingState(ProcessingState.IDLE);
      lastSnapshotRef.current = null;
      lastTextDescriptionRef.current = null;
      addLog("Visual Cortex Deactivated.", 'info');
    } else {
      setIsActive(true);
      addLog("Initializing Visual Cortex...", 'info');
    }
  };

  useEffect(() => {
    if (isActive && isStreamReady) {
      addLog(`Vision Loop active. Interval: ${CAPTURE_INTERVAL_MS}ms`, 'success');
      reasoningStepRef.current(); 
      intervalRef.current = setInterval(() => {
        reasoningStepRef.current();
      }, CAPTURE_INTERVAL_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isStreamReady, addLog]);

  return (
    <div className="h-screen w-screen bg-ikea-base text-ikea-text flex flex-col font-sans overflow-hidden">
      
      {!hasKey && (
          <KeyEntryModal 
            onConfirm={(key, agent) => {
                // simple shim to refresh state
                window.location.reload(); 
            }} 
          />
      )}

      <Conversation conversation={conversation} agentId={process.env.AGENT_ID || localStorage.getItem('AGENT_ID') || ''} />

      {/* FIXED HEADER */}
      <header className="flex-none h-20 px-8 flex items-center justify-between z-20 shadow-sm relative">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl neu-convex flex items-center justify-center text-ikea-sub">
                 <Aperture className="w-6 h-6" />
              </div>
              <div>
                  <h1 className="text-xl font-bold tracking-tight text-gray-800">Visual Connector</h1>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-widest">
                      <span>Mk.II</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span>Neumorphic</span>
                  </div>
              </div>
          </div>

          <div className="flex items-center gap-6">
               <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">System Status</span>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-400'}`}></span>
                        <span className="text-sm font-bold text-gray-700">{isActive ? 'ONLINE' : 'STANDBY'}</span>
                    </div>
               </div>
               
               <button 
                  onClick={toggleVisualSystem}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 neu-convex neu-btn ${
                      isActive ? 'text-green-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
               >
                  {isActive ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
               </button>
          </div>
      </header>

      {/* MAIN CONTENT AREA - SCROLLABLE */}
      <main className="flex-1 flex flex-col md:flex-row gap-8 p-8 min-h-0 overflow-hidden">
          
          {/* LEFT: VIDEO FEED */}
          <div className="w-full md:w-1/2 flex flex-col gap-4 min-h-0">
             <div className="flex items-center justify-between px-2">
                 <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Disc className="w-4 h-4" /> Optical Input
                 </h2>
                 {isActive && processingState === ProcessingState.ANALYZING && (
                     <span className="text-xs font-bold text-gray-400 animate-pulse">ANALYZING...</span>
                 )}
             </div>
             
             {/* The Monitor */}
             <div className="flex-1 neu-pressed p-4 relative overflow-hidden rounded-[24px]">
                 <div className="w-full h-full rounded-[16px] overflow-hidden bg-black/5 relative shadow-inner">
                    <LiveFeed 
                        ref={liveFeedRef} 
                        isActive={isActive} 
                        onStreamReady={setIsStreamReady} 
                    />
                 </div>
             </div>
             
             {/* Controls / Info */}
             <div className="h-24 neu-flat p-6 flex items-center justify-between rounded-[20px]">
                 <div className="space-y-1">
                     <p className="text-xs text-gray-400 font-bold uppercase">Active Sensor</p>
                     <p className="text-sm font-medium text-gray-700">Generic Webcam Device</p>
                 </div>
                 <div className="space-y-1 text-right">
                     <p className="text-xs text-gray-400 font-bold uppercase">Latency</p>
                     <p className="text-sm font-medium text-gray-700">{isActive ? '~4000ms' : '--'}</p>
                 </div>
             </div>
          </div>

          {/* RIGHT: CONSOLE */}
          <div className="w-full md:w-1/2 flex flex-col gap-4 min-h-0">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> Logic Stream
                 </h2>
                 <span className="px-2 py-1 rounded-md bg-gray-200 text-[10px] font-bold text-gray-500">{logs.length} EVENTS</span>
             </div>

             <div className="flex-1 neu-pressed p-6 rounded-[24px] relative overflow-hidden flex flex-col">
                  {/* Internal shading for depth */}
                  <div className="absolute inset-0 pointer-events-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] rounded-[24px]"></div>
                  
                  {/* Scrollable Container */}
                  <div className="flex-1 min-h-0 relative">
                      <Terminal logs={logs} />
                  </div>
             </div>
          </div>

      </main>
    </div>
  );
}