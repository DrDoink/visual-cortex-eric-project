import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LiveFeed, LiveFeedHandle } from './components/LiveFeed';
import { Terminal } from './components/Terminal';
import { LogEntry, ProcessingState } from './types';
import { analyzeFrame } from './services/geminiService';
import { Activity, StopCircle, PlayCircle, Eye, Settings } from 'lucide-react';
import { Conversation } from './components/Conversation';

// Hard Constraint: 4000ms Latency for Vision Loop
const CAPTURE_INTERVAL_MS = 4000;

export default function App() {
  // System State
  const [isActive, setIsActive] = useState(false); // Controls Visual Loop
  
  // Operational State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [isStreamReady, setIsStreamReady] = useState(false);
  
  const liveFeedRef = useRef<LiveFeedHandle>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSnapshotRef = useRef<string | null>(null);

  // Helper to add logs safely
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message
    }]);
  }, []);

  // --- Vision Logic (The Eye) ---

  const performReasoningStep = useCallback(async () => {
    // Prevent overlapping logic if previous step is still crunching
    if (processingState !== ProcessingState.IDLE && processingState !== ProcessingState.ANALYZING) return;
    if (processingState === ProcessingState.ANALYZING) return;

    // 1. CAPTURE
    const snapshot = liveFeedRef.current?.getSnapshot();
    if (!snapshot) {
      // Stream is initializing or camera is not ready yet. 
      return;
    }

    setProcessingState(ProcessingState.ANALYZING);
    
    try {
      // 2. INFERENCE (Context: Previous + Current)
      const result = await analyzeFrame(snapshot, lastSnapshotRef.current);
      
      // Update context for the next loop
      lastSnapshotRef.current = snapshot;

      // 3. GATEKEEPING
      if (result.includes("NO_CHANGE")) {
        // Passive Protocol: Do nothing.
      } else {
        // Visual Change Detected
        addLog(result, 'visual');
        
        // NOTE: Bridge protocol temporarily suspended as Conversation component
        // now manages its own isolated session.
      } 
      
    } catch (error) {
      const err = error as Error;
      const errMsg = (err.message || "Unknown error").toLowerCase();

      // Error Classification
      if (errMsg.includes("429") || errMsg.includes("quota")) {
        addLog("Rate limit hit (429).", 'error');
      } else if (errMsg.includes("network") || errMsg.includes("fetch")) {
        addLog("Network instability detected.", 'error');
      } else if (errMsg.includes("safety") || errMsg.includes("blocked")) {
        addLog("Visual input blocked by Safety Filters.", 'error');
      } else {
        addLog(`Observer Malfunction: ${err.message}`, 'error');
      }
    } finally {
      setProcessingState(ProcessingState.IDLE);
    }
  }, [addLog, processingState]);

  // --- Main Control Loop (The Orchestrator) ---
  
  // Ref to hold the latest version of the reasoning function
  const reasoningStepRef = useRef(performReasoningStep);

  useEffect(() => {
    reasoningStepRef.current = performReasoningStep;
  }, [performReasoningStep]);

  const toggleVisualSystem = () => {
    if (isActive) {
      // Stop sequence
      setIsActive(false);
      setProcessingState(ProcessingState.IDLE);
      lastSnapshotRef.current = null;
      addLog("Visual Cortex Deactivated.", 'info');
    } else {
      // Start sequence
      setIsActive(true);
      addLog("Initializing Visual Cortex...", 'info');
    }
  };

  // The Heartbeat
  useEffect(() => {
    if (isActive && isStreamReady) {
      addLog(`Vision Loop active. Interval: ${CAPTURE_INTERVAL_MS}ms`, 'success');
      
      // Immediate first tick
      reasoningStepRef.current(); 
      
      // Interval tick
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
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col md:flex-row overflow-hidden font-sans">
      
      <Conversation />

      {/* Left Panel: Visual Feed */}
      <div className="w-full md:w-1/2 p-4 md:p-6 flex flex-col gap-4 border-r border-gray-800 relative">
        <header className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
             <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                <Eye className="w-6 h-6 text-purple-400" />
             </div>
             <div>
                <h1 className="font-bold text-xl tracking-tight text-gray-100">Eric's Visual Cortex</h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    v3.5
                    <span className="text-gray-700">|</span>
                    Gemini Flash 2.0
                </div>
             </div>
          </div>
          
          <button 
            className="p-2 text-gray-500 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 min-h-[300px] relative">
            <LiveFeed 
                ref={liveFeedRef} 
                isActive={isActive} 
                onStreamReady={setIsStreamReady} 
            />
            
            {/* Analyzing Indicator */}
            {isActive && processingState === ProcessingState.ANALYZING && (
                <div className="absolute bottom-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur text-purple-400 text-xs font-mono rounded-full border border-purple-500/30 animate-pulse z-10">
                    <Activity className="w-3 h-3" />
                    VISUAL REASONING
                </div>
            )}
        </div>

        {/* Control Grid */}
        <div className="grid grid-cols-1 gap-4">
            {/* Master Power (Vision) */}
            <button 
                onClick={toggleVisualSystem}
                className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
                  isActive 
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                    : 'bg-gray-800/30 border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
            >
                {isActive ? <StopCircle className="w-6 h-6" /> : <PlayCircle className="w-6 h-6" />}
                <span className="text-xs font-bold uppercase tracking-widest">
                    {isActive ? 'Terminate Visuals' : 'Initialize System'}
                </span>
            </button>
        </div>

        {/* System Status Bar */}
        <div className="bg-black/40 p-3 rounded border border-gray-800 flex justify-between items-center text-xs font-mono">
            <div className="flex items-center gap-4">
                <span className={isActive ? "text-emerald-500" : "text-gray-600"}>VISION: {isActive ? 'ACTIVE' : 'OFFLINE'}</span>
            </div>
            <div className="text-gray-500">
                LATENCY: {CAPTURE_INTERVAL_MS}ms
            </div>
        </div>
      </div>

      {/* Right Panel: Logic Console */}
      <div className="w-full md:w-1/2 p-4 md:p-6 bg-black/40 flex flex-col h-[50vh] md:h-screen">
        <div className="mb-4 flex items-center justify-between">
             <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                System Logic Log
             </h2>
             <span className="text-xs text-gray-600 font-mono">events: {logs.length}</span>
        </div>
        <div className="flex-1 overflow-hidden rounded-lg">
            <Terminal logs={logs} />
        </div>
      </div>

    </div>
  );
}