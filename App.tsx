import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LiveFeed, LiveFeedHandle } from './components/LiveFeed';
import { Terminal } from './components/Terminal';
import { LogEntry, ProcessingState, ConnectionStatus } from './types';
import { analyzeFrame } from './services/geminiService';
import { Zap, Activity, StopCircle, PlayCircle, Eye, Mic, Network, Settings, Key, X, Lock } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';
import { Conversation } from './components/Conversation';

// Hard Constraint: 4000ms Latency for Vision Loop
const CAPTURE_INTERVAL_MS = 4000;

export default function App() {
  // System State
  const [isActive, setIsActive] = useState(false); // Controls Visual Loop
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [agentId, setAgentId] = useState(process.env.AGENT_ID || '');
  
  // Operational State
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
      setShowAuthModal(false);
      addLog("Voice Uplink Established", 'success');
    },
    onDisconnect: () => {
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
      addLog("Voice Uplink Terminated", 'info');
    },
    onMessage: (message: any) => {
      // console.log("Message:", message);
    },
    onError: (error: any) => {
      console.error("ElevenLabs Error:", error);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
      addLog(`Voice Error: ${error}`, 'error');
    }
  });

  const handleConnectVoice = useCallback(async () => {
    if (!agentId) {
      addLog("Connection Failed: Missing Agent ID", 'error');
      return;
    }

    try {
      setConnectionStatus(ConnectionStatus.CONNECTING);
      addLog(`Attempting handshake with Agent: ${agentId.slice(0, 8)}...`, 'info');

      // Note: Microphone access is no longer explicitly requested here.
      // The application focuses on Visual Context injection.
      
      await conversation.startSession({ agentId } as any);
      
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
      addLog(`Connection Failed: ${(error as Error).message}`, 'error');
    }
  }, [addLog, conversation, agentId]);

  const disconnectVoice = useCallback(async () => {
      await conversation.endSession();
  }, [conversation]);

  // --- Vision & Bridge Logic (The Eye) ---

  const performReasoningStep = useCallback(async () => {
    // Prevent overlapping logic if previous step is still crunching
    if (processingState !== ProcessingState.IDLE && processingState !== ProcessingState.ANALYZING) return;
    if (processingState === ProcessingState.ANALYZING) return;

    // 1. CAPTURE
    const snapshot = liveFeedRef.current?.getSnapshot();
    if (!snapshot) {
      // Stream is initializing or camera is not ready yet. 
      // Silently return to avoid spamming errors during warmup.
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
                addLog(`>> Bridge: Context injected to Agent`, 'bridge');
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
      disconnectVoice(); // Safety: kill voice if vision dies
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
      
      <Conversation conversation={conversation} agentId={agentId} />

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-md bg-neutral-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                <div className="bg-neutral-800 p-4 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-white">
                        <Lock className="w-4 h-4 text-emerald-500" />
                        <span className="font-mono text-sm tracking-wider uppercase">Security Clearance</span>
                    </div>
                    <button onClick={() => setShowAuthModal(false)} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-gray-400 text-sm">
                        To establish a neural uplink with the Agent, please verify the Connection ID.
                    </p>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">ElevenLabs Agent ID</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                            <input 
                                type="text" 
                                value={agentId}
                                onChange={(e) => setAgentId(e.target.value)}
                                placeholder="Enter Agent ID"
                                className="w-full bg-black/50 border border-gray-700 rounded p-2 pl-10 text-emerald-400 font-mono text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleConnectVoice}
                        disabled={!agentId}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded flex items-center justify-center gap-2 transition-all"
                    >
                        {connectionStatus === ConnectionStatus.CONNECTING ? 'Handshaking...' : 'Establish Uplink'}
                        <Network className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
      )}

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
                    v3.4
                    <span className="text-gray-700">|</span>
                    Gemini Flash 2.0
                </div>
             </div>
          </div>
          
          <button 
            onClick={() => setShowAuthModal(true)}
            className="p-2 text-gray-500 hover:text-white transition-colors"
            title="Connection Settings"
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
        <div className="grid grid-cols-2 gap-4">
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

            {/* Voice Uplink */}
            <button 
                onClick={() => connectionStatus === ConnectionStatus.CONNECTED ? disconnectVoice() : setShowAuthModal(true)}
                disabled={!isActive} // Can't connect voice if system is off
                className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
                    !isActive ? 'opacity-30 cursor-not-allowed border-gray-800 bg-black' :
                    connectionStatus === ConnectionStatus.CONNECTED
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-500' // Hover to disconnect
                        : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20'
                }`}
            >
                {connectionStatus === ConnectionStatus.CONNECTING ? (
                    <Activity className="w-6 h-6 animate-spin" />
                ) : connectionStatus === ConnectionStatus.CONNECTED ? (
                    <Mic className="w-6 h-6" />
                ) : (
                    <Network className="w-6 h-6" />
                )}
                
                <span className="text-xs font-bold uppercase tracking-widest">
                    {connectionStatus === ConnectionStatus.CONNECTED 
                        ? 'Voice Online' 
                        : connectionStatus === ConnectionStatus.CONNECTING 
                            ? 'Negotiating...' 
                            : 'Connect Agent'}
                </span>
            </button>
        </div>

        {/* System Status Bar */}
        <div className="bg-black/40 p-3 rounded border border-gray-800 flex justify-between items-center text-xs font-mono">
            <div className="flex items-center gap-4">
                <span className={isActive ? "text-emerald-500" : "text-gray-600"}>VISION: {isActive ? 'ACTIVE' : 'OFFLINE'}</span>
                <span className="text-gray-700">|</span>
                <span className={connectionStatus === ConnectionStatus.CONNECTED ? "text-indigo-400" : "text-gray-600"}>
                    VOICE: {connectionStatus.toUpperCase()}
                </span>
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