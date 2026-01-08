import { Mic, Square, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AGENT_ID = 'iJe1uzMwAfkHeAqiCZJc'; // Eric

interface ConversationProps {
  conversation: any; // Typed as any to match the dynamic return of the ElevenLabs hook
}

export function Conversation({ conversation }: ConversationProps) {
  const { status, isSpeaking } = conversation;
  const [error, setError] = useState<string | null>(null);

  const toggleConversation = useCallback(async () => {
    setError(null);
    try {
      if (status === 'connected') {
        await conversation.endSession();
      } else {
        // Request mic permission explicitly first to fail fast if denied
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        await conversation.startSession({
          agentId: AGENT_ID,
        });
      }
    } catch (err: any) {
      console.error('Failed to toggle conversation:', err);
      setError(err.message || "Connection failed");
    }
  }, [conversation, status]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      
      {/* Status / Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-red-950/90 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-xs font-mono flex items-center gap-2 backdrop-blur-md"
          >
            <AlertCircle className="w-3 h-3" />
            {error}
          </motion.div>
        )}
        
        {status === 'connected' && (
           <motion.div
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 20 }}
             className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-full text-xs font-mono backdrop-blur-md flex items-center gap-2"
           >
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
             LINK ESTABLISHED
           </motion.div>
        )}
      </AnimatePresence>

      {/* Main Control Orb */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleConversation}
        disabled={status === 'connecting'}
        className={`relative h-16 w-16 rounded-full flex items-center justify-center shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] border transition-all duration-300 ${
          status === 'connected' 
            ? 'bg-red-500 border-red-400 text-white'
            : status === 'connecting'
            ? 'bg-neutral-800 border-neutral-700 text-neutral-400 cursor-not-allowed'
            : 'bg-white border-white text-black hover:bg-neutral-200'
        }`}
      >
        {/* Speaking Ripple Effect */}
        {status === 'connected' && isSpeaking && (
           <span className="absolute -inset-1 rounded-full border border-red-500/50 animate-ping opacity-50 pointer-events-none"></span>
        )}

        {/* Icon Logic */}
        {status === 'connecting' ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : status === 'connected' ? (
          <Square className="w-6 h-6 fill-current" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </motion.button>
      
      {/* Label */}
      <div className="absolute -bottom-6 left-0 right-0 text-center pointer-events-none">
        <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
            {status === 'connected' ? 'Agent Active' : 'Voice Link'}
        </span>
      </div>
    </div>
  );
}