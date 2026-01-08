
import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Fixed: Explicitly using React.Component ensures TypeScript correctly inherits methods like setState and properties like props
export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Fixed: Using this.setState which is now properly recognized from the React.Component base class
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center p-8 font-mono">
          <div className="max-w-2xl w-full bg-black border border-red-500/50 rounded-lg p-6 shadow-2xl relative overflow-hidden">
             {/* Scanline background */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 opacity-20 bg-[length:100%_2px,3px_100%]"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 text-red-500 mb-4">
                <AlertTriangle className="w-8 h-8" />
                <h1 className="text-xl font-bold uppercase tracking-widest">System Critical Failure</h1>
                </div>
                
                <div className="bg-red-950/20 p-4 rounded border border-red-500/20 mb-6 overflow-auto max-h-80 scrollbar-thin scrollbar-thumb-red-900">
                <p className="text-red-300 font-bold mb-2 font-mono">{this.state.error?.toString()}</p>
                <div className="text-red-400/70 text-xs whitespace-pre-wrap font-mono">
                    {this.state.errorInfo?.componentStack}
                </div>
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-mono">CODE: ERR_RENDER_FAILURE</span>
                    <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wide text-sm transition-colors border border-red-500"
                    >
                    Reboot System
                    </button>
                </div>
            </div>
          </div>
        </div>
      );
    }

    // Fixed: this.props is now properly recognized from the React.Component base class
    return this.props.children;
  }
}
