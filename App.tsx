import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LiveFeed, LiveFeedHandle } from './components/LiveFeed';
import { Terminal } from './components/Terminal';
import { LogEntry, ProcessingState, ConnectionStatus } from './types';
import { analyzeFrame } from './services/geminiService';
import { Zap, Activity, StopCircle, PlayCircle, Eye, Mic, Network } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';

// Hard Constraint: 4000ms Latency for Vision Loop
const CAPTURE_INTERVAL_MS = 4000;

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  
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

  // --- Voice Agent Management (The Voice) ---
  
  const conversation = useConversation({
    onConnect: () => {
      setConnectionStatus(ConnectionStatus.CONNECTED);
      addLog("Voice Agent Connected", 'success');
    },
    onDisconnect: () => {
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
      addLog("Voice Agent Disconnected", 'info');
    },
    onMessage: (message: any) => {
      // console.log("Message:", message);
    },
    onError: (error: any) => {
      console.error("ElevenLabs Error:", error);
      addLog(`Voice Error: ${error}`, 'error');
    }
  });

  const startConversation = useCallback(async () => {
    try {
      setConnectionStatus(ConnectionStatus.CONNECTING);
      // Explicitly request mic permission first to ensure browser doesn't block audio context
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // SECURITY: Access ID from process.env, never hardcoded
      const agentId = process.env.AGENT_ID;
      if (!agentId) {
        throw new Error("AGENT_ID is missing in environment variables.");
      }

      await conversation.startSession({ agentId } as any);
      
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
      addLog(`Failed to connect Agent: ${(error as Error).message}`, 'error');
    }
  }, [addLog, conversation]);

  const stopConversation = useCallback(async () => {
      await conversation.endSession();
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
  }, [conversation]);

  // --- Vision & Bridge Logic (The Eye) ---

  const performReasoningStep = useCallback(async () => {
    // Prevent overlapping logic if previous step is still crunching
    if (processingState !== ProcessingState.IDLE && processingState !== ProcessingState.ANALYZING) return;
    if (processingState === ProcessingState.ANALYZING) return;

    // 1. CAPTURE
    const snapshot = liveFeedRef.current?.getSnapshot();
    if (!snapshot) {
      addLog("Failed to capture visual frame", 'error');
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

        // 4. BRIDGE PROTOCOL
        if (connectionStatus === ConnectionStatus.CONNECTED) {
            try {
                // Silently push the visual context to the Agent's "mind"
                await conversation.sendContextualUpdate(result);
                addLog(`>> Bridge: Sent context to Agent`, 'bridge');
            } catch (bridgeErr) {
                console.error("Bridge Error:", bridgeErr);
                addLog("Bridge failed to send context", 'error');
            }
        }
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
  }, [addLog, processingState, connectionStatus, conversation]);

  // --- Main Control Loop (The Orchestrator) ---
  
  // Ref to hold the latest version of the reasoning function
  // This prevents the interval useEffect from resetting whenever the function identity changes
  const reasoningStepRef = useRef(performReasoningStep);

  useEffect(() => {
    reasoningStepRef.current = performReasoningStep;
  }, [performReasoningStep]);

  const toggleSystem = () => {
    if (isActive) {
      // Stop sequence
      setIsActive(false);
      setProcessingState(ProcessingState.IDLE);
      lastSnapshotRef.current = null;
      stopConversation();
      addLog("System deactivated.", 'info');
    } else {
      // Start sequence
      setIsActive(true);
      startConversation();
      addLog("Initializing Multimodal System...", 'info');
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
  }, [isActive, isStreamReady, addLog]); // Intentionally removed performReasoningStep

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col md:flex-row overflow-hidden">
      
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
                    Gemini Flash 2.0
                    <span className="text-gray-700">|</span>
                    Multimodal Bridge
                </div>
             </div>
          </div>
          
          <button 
            onClick={toggleSystem}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-200 border ${
              isActive 
                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {isActive ? (
                <>
                    <StopCircle className="w-4 h-4" />
                    <span>Terminate</span>
                </>
            ) : (
                <>
                    <PlayCircle className="w-4 h-4" />
                    <span>Start Session</span>
                </>
            )}
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

        {/* System Status Grid */}
        <div className="grid grid-cols-3 gap-4">
             {/* Visual Status */}
             <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                <div className="text-gray-500 text-xs uppercase font-bold mb-1 flex items-center gap-2">
                    <Eye className="w-3 h-3" /> Vision
                </div>
                <div className="flex items-center gap-2">
                    {isActive ? (
                        <span className="text-emerald-400 font-mono text-sm">WATCHING</span>
                    ) : (
                        <span className="text-gray-500 font-mono text-sm">OFFLINE</span>
                    )}
                </div>
             </div>

             {/* Voice Status */}
             <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                <div className="text-gray-500 text-xs uppercase font-bold mb-1 flex items-center gap-2">
                    <Mic className="w-3 h-3" /> Voice Agent
                </div>
                <div className="flex items-center gap-2">
                    {connectionStatus === ConnectionStatus.CONNECTED && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>}
                    {connectionStatus === ConnectionStatus.CONNECTING && <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>}
                    {connectionStatus === ConnectionStatus.DISCONNECTED && <span className="w-2 h-2 bg-gray-500 rounded-full"></span>}
                    <span className={`font-mono text-sm ${
                        connectionStatus === ConnectionStatus.CONNECTED ? 'text-emerald-400' : 
                        connectionStatus === ConnectionStatus.CONNECTING ? 'text-yellow-400' : 'text-gray-500'
                    }`}>
                        {connectionStatus.toUpperCase()}
                    </span>
                </div>
             </div>

             {/* Bridge Status */}
             <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                <div className="text-gray-500 text-xs uppercase font-bold mb-1 flex items-center gap-2">
                    <Network className="w-3 h-3" /> Bridge
                </div>
                <div className="flex items-center gap-2">
                    <Zap className={`w-3 h-3 ${connectionStatus === ConnectionStatus.CONNECTED ? 'text-yellow-500' : 'text-gray-700'}`} />
                    <span className="text-gray-300 font-mono text-sm">
                        {CAPTURE_INTERVAL_MS}ms
                    </span>
                </div>
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