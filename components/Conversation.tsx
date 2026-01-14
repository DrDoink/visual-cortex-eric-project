import { Mic, Square, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConversationProps {
  conversation: any; 
  agentId: string;
}

// Simple pixelated representation of an 'E' or digital waveform
const PixelLogo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect x="4" y="4" width="4" height="4" fill="currentColor"/>
        <rect x="8" y="4" width="4" height="4" fill="currentColor"/>
        <rect x="12" y="4" width="4" height="4" fill="currentColor"/>
        <rect x="4" y="8" width="4" height="4" fill="currentColor"/>
        <rect x="4" y="12" width="4" height="4" fill="currentColor"/>
        <rect x="8" y="12" width="4" height="4" fill="currentColor"/>
        <rect x="4" y="16" width="4" height="4" fill="currentColor"/>
        <rect x="4" y="20" width="4" height="4" fill="currentColor"/>
        <rect x="8" y="20" width="4" height="4" fill="currentColor"/>
        <rect x="12" y="20" width="4" height="4" fill="currentColor"/>
        {/* Accent pixel */}
        <rect x="16" y="8" width="4" height="4" fill="#ff2a2a"/>
    </svg>
);

export function Conversation({ conversation, agentId }: ConversationProps) {
  const { status, isSpeaking } = conversation;
  const [error, setError] = useState<string | null>(null);

  const toggleConversation = useCallback(async () => {
    setError(null);
    if (!agentId) {
      setError("NO_AGENT_ID");
      return;
    }
    try {
      if (status === 'connected') {
        await conversation.endSession();
      } else {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        await conversation.startSession({ agentId: agentId });
      }
    } catch (err: any) {
      setError(err.message || "CONN_FAIL");
    }
  }, [conversation, status, agentId]);

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3 font-mono">
      
      {/* Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-black border-2 border-red-500 text-red-500 px-4 py-2 text-xs font-bold uppercase shadow-[4px_4px_0px_#ff2a2a]"
          >
            ERR: {error}
          </motion.div>
        )}
        
        {status === 'connected' && (
           <motion.div
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 20 }}
             className="bg-black border border-white text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-3 shadow-[4px_4px_0px_#ff2a2a]"
           >
             <div className="w-2 h-2 bg-red-600 animate-pulse rounded-full"></div>
             VOICE LINK ESTABLISHED
           </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={toggleConversation}
        disabled={status === 'connecting'}
        className={`relative w-20 h-20 border-2 flex items-center justify-center transition-all duration-200 ${
          status === 'connected' 
            ? 'bg-white border-white text-black shadow-[6px_6px_0px_#ff2a2a]'
            : status === 'connecting'
            ? 'bg-gray-900 border-gray-700 text-gray-500 cursor-wait'
            : 'bg-black border-white text-white shadow-[6px_6px_0px_white] hover:bg-gray-900'
        }`}
      >
        {status === 'connected' && isSpeaking && (
             <div className="absolute inset-0 border-2 border-red-500 animate-ping opacity-50"></div>
        )}

        {status === 'connecting' ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : status === 'connected' ? (
          <div className="flex flex-col items-center">
             <PixelLogo />
          </div>
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </motion.button>
      
      <div className="text-center w-20">
        <span className={`text-[9px] font-bold px-1 tracking-widest ${status === 'connected' ? 'bg-acid-red text-black' : 'bg-black text-white'}`}>
            {status === 'connected' ? 'ACTIVE' : 'READY'}
        </span>
      </div>
    </div>
  );
}