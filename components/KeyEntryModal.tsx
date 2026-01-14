import React, { useState, useEffect } from 'react';
import { Lock, Fingerprint, ArrowRight } from 'lucide-react';

interface KeyEntryModalProps {
  onConfirm: (apiKey: string, agentId: string) => void;
  onCancel?: () => void;
  initialApiKey?: string;
  initialAgentId?: string;
}

export const KeyEntryModal: React.FC<KeyEntryModalProps> = ({ onConfirm, onCancel, initialApiKey = '', initialAgentId = '' }) => {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [agentId, setAgentId] = useState(initialAgentId);

  useEffect(() => {
    if (!initialApiKey) {
        const storedKey = localStorage.getItem('GEMINI_API_KEY');
        if (storedKey) setApiKey(storedKey);
    }
    if (!initialAgentId) {
        const storedAgent = localStorage.getItem('AGENT_ID');
        if (storedAgent) setAgentId(storedAgent);
    }
  }, [initialApiKey, initialAgentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      localStorage.setItem('AGENT_ID', agentId.trim());
      onConfirm(apiKey.trim(), agentId.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-200/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full neu-flat p-8 relative rounded-[24px]">
        
        <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 neu-convex rounded-full flex items-center justify-center text-gray-400 mb-4">
                <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Authentication</h2>
            <p className="text-sm text-gray-500 mt-1">Please provide credentials to initialize the secure link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 ml-2 uppercase tracking-wide">Gemini API Key</label>
                <div className="neu-pressed rounded-xl px-4 py-3 flex items-center gap-3">
                    <Fingerprint className="w-5 h-5 text-gray-400" />
                    <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-transparent w-full outline-none text-gray-700 text-sm placeholder-gray-400"
                        placeholder="Paste key here..."
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 ml-2 uppercase tracking-wide">Agent ID</label>
                <div className="neu-pressed rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400">ID</span>
                    <input 
                        type="text" 
                        value={agentId}
                        onChange={(e) => setAgentId(e.target.value)}
                        className="bg-transparent w-full outline-none text-gray-700 text-sm placeholder-gray-400"
                        placeholder="Optional"
                    />
                </div>
            </div>

            <button 
                type="submit"
                disabled={!apiKey}
                className="w-full h-12 mt-4 neu-convex rounded-xl font-bold text-gray-600 uppercase text-sm tracking-widest hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                Connect System <ArrowRight className="w-4 h-4" />
            </button>
        </form>
      </div>
    </div>
  );
};