import { Mic, Square } from 'lucide-react';
import { useCallback } from 'react';

interface ConversationProps {
  conversation: any; // Accepting the active conversation instance from App
  agentId: string;
}

export function Conversation({ conversation, agentId }: ConversationProps) {
  // Derived state from the shared conversation object
  const isConnected = conversation.status === 'connected';

  const toggleConversation = useCallback(async () => {
    if (isConnected) {
      await conversation.endSession();
    } else {
      await conversation.startSession({
        agentId: agentId || import.meta.env.VITE_ELEVENLABS_AGENT_ID, // Use prop ID or fallback
      } as any);
    }
  }, [isConnected, conversation, agentId]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <div className={`px-3 py-1 rounded-full text-xs font-mono backdrop-blur-md border ${
        isConnected 
          ? 'bg-green-500/10 border-green-500/50 text-green-400' 
          : 'bg-black/40 border-white/10 text-white/40'
      }`}>
        {isConnected ? '● LIVE LINK' : '○ DISCONNECTED'}
      </div>

      <button 
        onClick={toggleConversation}
        className={`h-14 w-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 ${
          isConnected 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-white text-black hover:bg-gray-200'
        }`}
      >
        {isConnected ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
      </button>
    </div>
  );
}