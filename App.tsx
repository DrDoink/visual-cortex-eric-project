import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { LiveFeed, LiveFeedHandle } from './components/LiveFeed';
import { Terminal } from './components/Terminal';
import { LogEntry, ProcessingState } from './types';
import { analyzeFrame } from './services/geminiService';
import { Activity, Square, Play, Eye, Settings, Cpu } from 'lucide-react';
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
  
  // State Refs for Logic Loop
  const lastSnapshotRef = useRef<string | null>(null);
  const lastTextDescriptionRef = useRef<string | null>(null);

  // Helper to add logs safely
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message
    }]);
  }, []);

  // --- Voice Agent System (ElevenLabs) ---
  const conversation = useConversation({
    onConnect: () => addLog('Voice Link Established.', 'success'),
    onDisconnect: () => addLog('Voice Link Terminated.', 'info'),
    onError: (e) => addLog(`Voice Error: ${e}`, 'error'),
    onMessage: (msg: any) => {
       // optional log
    }
  });

  // --- Vision Logic (Gemini) ---

  const performReasoningStep = useCallback(async () => {
    // Prevent overlapping logic
    if (processingState !== ProcessingState.IDLE && processingState !== ProcessingState.ANALYZING) return;
    if (processingState === ProcessingState.ANALYZING) return;

    // 1. CAPTURE
    const snapshot = liveFeedRef.current?.getSnapshot();
    if (!snapshot) return;

    setProcessingState(ProcessingState.ANALYZING);
    
    try {
      // 2. INFERENCE (Context: Previous Frame + Last Textual Description)
      const result = await analyzeFrame(
        snapshot, 
        lastSnapshotRef.current, 
        lastTextDescriptionRef.current
      );
      
      // Update visual context
      lastSnapshotRef.current = snapshot;

      // 3. GATEKEEPING (Deduplication)
      if (result.includes("NO_CHANGE") || result.trim().length === 0) {
        // Passive Protocol: Do nothing.
      } else {
        // Visual Change Detected
        // Update textual context so next prompt knows what was just said
        lastTextDescriptionRef.current = result;
        
        addLog(result, 'visual');
        
        // 4. BRIDGE PROTOCOL
        if (conversation.status === 'connected') {
            try {
                // Send the visual observation as context to the ElevenLabs agent
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

  // --- Main Control Loop ---
  
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

  // --- Render ---

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row overflow-hidden p-3 gap-3">
      
      <Conversation conversation={conversation} agentId={process.env.AGENT_ID || ''} />

      {/* Left Panel: Visual Feed */}
      <div className="w-full md:w-1/2 flex flex-col gap-3 relative">
        {/* Header Block */}
        <header className="acid-border p-5 flex justify-between items-start bg-black">
          <div>
            <div className="flex items-baseline gap-3 mb-1">
                 <h1 className="text-4xl font-serif font-bold tracking-tighter italic acid-text-shadow leading-none text-white">
                    Visual Connector
                 </h1>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase mt-2">
                <span className="text-acid-red">System.v0.2</span>
                <span className="text-gray-600">/</span>
                <span>Gemini Flash</span>
                <span className="text-gray-600">/</span>
                <span>ElevenLabs</span>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-1">
            <Cpu className="w-6 h-6 text-gray-600" />
          </div>
        </header>

        {/* Viewport Block */}
        <div className="flex-1 relative acid-border p-1 bg-[#0a0a0a] min-h-[400px]">
            <LiveFeed 
                ref={liveFeedRef} 
                isActive={isActive} 
                onStreamReady={setIsStreamReady} 
            />
            
            {/* Overlay Status Badge */}
            <div className="absolute bottom-4 right-4 z-20">
                {isActive && processingState === ProcessingState.ANALYZING ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-acid-red text-black text-xs font-bold uppercase animate-pulse border border-black shadow-[2px_2px_0px_black]">
                        <Activity className="w-3 h-3" />
                        Analyzing Input
                    </div>
                ) : null}
            </div>
        </div>

        {/* Controls Block */}
        <div className="acid-border p-4 bg-black flex items-center justify-between">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">Cortex Status</span>
                <span className={`text-2xl font-serif italic font-bold ${isActive ? 'text-white chromatic-text' : 'text-gray-700'}`}>
                    {isActive ? 'ONLINE' : 'OFFLINE'}
                </span>
            </div>

            <button 
                onClick={toggleVisualSystem}
                className={`group px-8 py-3 font-mono font-bold uppercase tracking-widest text-xs border-2 transition-all relative overflow-hidden ${
                  isActive 
                    ? 'bg-acid-red border-acid-red text-black hover:brightness-110' 
                    : 'bg-transparent border-white text-white hover:bg-white hover:text-black'
                }`}
            >
                <span className="relative z-10 flex items-center gap-3">
                    {isActive ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    {isActive ? 'Terminate' : 'Initialize'}
                </span>
            </button>
        </div>
      </div>

      {/* Right Panel: Logic Console */}
      <div className="w-full md:w-1/2 acid-border bg-black flex flex-col p-2 relative">
        <div className="mb-2 px-3 pt-3 flex items-center justify-between border-b-2 border-[#222] pb-3">
             <h2 className="text-xl font-serif font-bold italic text-white tracking-tight">
                Process Log
             </h2>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-acid-red rounded-full animate-pulse"></div>
                <span className="text-xs font-mono text-gray-500">{logs.length} EVENTS</span>
             </div>
        </div>
        <div className="flex-1 overflow-hidden relative p-1">
            <Terminal logs={logs} />
        </div>
      </div>

    </div>
  );
}