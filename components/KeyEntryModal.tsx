import React, { useState, useEffect } from 'react';
import { Lock, Terminal, ShieldAlert, X } from 'lucide-react';

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
    // Attempt to pre-fill from local storage if props are missing
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
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 bg-opacity-90 backdrop-blur-sm">
      {/* Container with Acid/CRT styling */}
      <div className="max-w-md w-full acid-box p-6 relative bg-black shadow-[8px_8px_0px_#dc2626]">
        
        {/* Optional Close Button */}
        {onCancel && (
            <button onClick={onCancel} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                <X className="w-6 h-6" />
            </button>
        )}

        <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
            <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
            <div>
                <h2 className="text-xl font-bold uppercase text-white acid-text-shadow leading-none">Security Clearance</h2>
                <p className="text-xs text-gray-500 font-mono mt-1">AUTHENTICATION REQUIRED</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-400 block tracking-widest">Gemini API Key (Required)</label>
                <div className="relative">
                    <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-black border-2 border-white p-3 pr-10 text-sm font-mono text-white focus:border-red-500 focus:outline-none focus:shadow-[2px_2px_0px_#dc2626] transition-all placeholder-gray-800"
                        placeholder="AIza..."
                    />
                    <Lock className="w-4 h-4 text-gray-600 absolute right-3 top-3.5" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-400 block tracking-widest">ElevenLabs Agent ID (Optional)</label>
                <div className="relative">
                    <input 
                        type="text" 
                        value={agentId}
                        onChange={(e) => setAgentId(e.target.value)}
                        className="w-full bg-black border-2 border-white p-3 pr-10 text-sm font-mono text-white focus:border-red-500 focus:outline-none focus:shadow-[2px_2px_0px_#dc2626] transition-all placeholder-gray-800"
                        placeholder="ex. 2wG..."
                    />
                    <Terminal className="w-4 h-4 text-gray-600 absolute right-3 top-3.5" />
                </div>
            </div>

            <button 
                type="submit"
                disabled={!apiKey}
                className="w-full bg-white text-black font-bold uppercase py-3 hover:bg-red-600 hover:text-white transition-colors border-2 border-transparent hover:border-white disabled:opacity-50 disabled:cursor-not-allowed tracking-widest text-sm shadow-[4px_4px_0px_rgba(255,255,255,0.2)]"
            >
                Initialize System
            </button>
        </form>
        
        <div className="mt-6 text-[10px] text-gray-600 font-mono text-center border-t border-gray-900 pt-4">
            CREDENTIALS STORED LOCALLY IN BROWSER STORAGE
        </div>
      </div>
    </div>
  );
};