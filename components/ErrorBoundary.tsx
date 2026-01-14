import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 font-mono">
          <div className="max-w-2xl w-full border-2 border-red-600 p-6 shadow-[8px_8px_0px_#dc2626] relative bg-black">
            <div className="flex items-center gap-3 text-red-600 mb-6 border-b border-red-900/50 pb-4">
               <AlertTriangle className="w-12 h-12" />
               <h1 className="text-3xl font-bold uppercase tracking-widest">FATAL EXCEPTION</h1>
            </div>
                
            <div className="bg-red-950/10 p-4 border border-red-900 mb-6 font-mono text-sm">
                <p className="text-red-500 font-bold mb-2 uppercase">Error Trace:</p>
                <p className="text-red-400 mb-4">{this.state.error?.toString()}</p>
                <div className="text-red-800 text-xs whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                </div>
            </div>

            <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 uppercase">SYS.HALT code: 0xDEADBEEF</span>
                <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-red-600 text-black font-bold uppercase hover:bg-white hover:text-red-600 transition-colors"
                >
                FORCE_REBOOT
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}