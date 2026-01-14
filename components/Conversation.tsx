import { Mic, MicOff, Loader2, Radio } from 'lucide-react';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConversationProps {
  conversation: any; 
  agentId: string;
}

export function Conversation({ conversation, agentId }: ConversationProps) {
  const { status, isSpeaking } = conversation;
  const [error, setError] = useState<string | null>(null);

  const toggleConversation = useCallback(async () => {
    setError(null);
    if (!agentId) {
      setError("No Agent ID configured.");
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
      setError(err.message || "Connection Failed");
    }
  }, [conversation, status, agentId]);

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4 pointer-events-none">
      
      {/* Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="neu-flat px-4 py-2 text-xs font-bold text-red-500 rounded-lg pointer-events-auto"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <div className="pointer-events-auto group">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleConversation}
            disabled={status === 'connecting'}
            className={`w-20 h-20 rounded-[24px] flex items-center justify-center transition-all duration-300 relative ${
                status === 'connected'
                ? 'neu-pressed text-blue-500'
                : 'neu-convex text-gray-500 hover:text-gray-700'
            }`}
          >
            {status === 'connected' && isSpeaking && (
                <div className="absolute inset-0 rounded-[24px] border-2 border-blue-400/30 animate-ping"></div>
            )}

            {status === 'connecting' ? (
              <Loader2 className="w-8 h-8 animate-spin opacity-50" />
            ) : status === 'connected' ? (
               <Radio className={`w-8 h-8 ${isSpeaking ? 'animate-pulse' : ''}`} />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </motion.button>
      </div>
      
    </div>
  );
}