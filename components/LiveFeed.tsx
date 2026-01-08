import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface LiveFeedHandle {
  getSnapshot: () => string | null;
}

interface LiveFeedProps {
  isActive: boolean;
  onStreamReady: (ready: boolean) => void;
}

export const LiveFeed = forwardRef<LiveFeedHandle, LiveFeedProps>(({ isActive, onStreamReady }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Expose the snapshot method to parent
  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      if (!videoRef.current || !canvasRef.current) return null;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to 512px width, maintaining aspect ratio
      const targetWidth = 512;
      const aspectRatio = video.videoHeight / video.videoWidth;
      const targetHeight = targetWidth * aspectRatio;

      if (canvas.width !== targetWidth) canvas.width = targetWidth;
      if (canvas.height !== targetHeight) canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get base64 data (using jpeg for smaller payload)
      return canvas.toDataURL('image/jpeg', 0.8); 
    }
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          onStreamReady(true);
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        onStreamReady(false);
      }
    };

    if (isActive) {
      startCamera();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
        onStreamReady(false);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, onStreamReady]);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-800 shadow-xl group">
      {/* Hidden Canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-20'}`}
      />
      
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">Feed Offline</p>
        </div>
      )}

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 flex gap-2">
         <div className={`flex items-center gap-2 px-2 py-1 rounded bg-black/50 backdrop-blur-md border ${isActive ? 'border-red-500/50' : 'border-gray-700'}`}>
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-xs font-mono text-white/80 uppercase">
              {isActive ? 'Live Input' : 'Standby'}
            </span>
         </div>
         <div className="px-2 py-1 rounded bg-black/50 backdrop-blur-md border border-gray-700">
            <span className="text-xs font-mono text-gray-400">512px</span>
         </div>
      </div>
      
      {/* Scanline effect */}
      {isActive && (
         <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
      )}
    </div>
  );
});

LiveFeed.displayName = 'LiveFeed';