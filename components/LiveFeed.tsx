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

  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      if (!videoRef.current || !canvasRef.current) return null;
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return null;
      if (video.readyState < 2) return null;

      const canvas = canvasRef.current;
      const targetWidth = 512;
      const aspectRatio = video.videoHeight / video.videoWidth;
      
      if (!Number.isFinite(aspectRatio)) return null;

      const targetHeight = Math.round(targetWidth * aspectRatio);

      if (canvas.width !== targetWidth) canvas.width = targetWidth;
      if (canvas.height !== targetHeight) canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', 0.8);
      if (!url || url === "data:,") return null;
      return url; 
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
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        const onReady = async () => {
            try { await video.play(); } catch (e) { console.warn("Video play failed:", e); }
            onStreamReady(video.videoWidth > 0 && video.videoHeight > 0);
        };
        video.onloadedmetadata = onReady;
      } catch (err) {
        console.error("Error accessing webcam:", err);
        onStreamReady(false);
      }
    };

    if (isActive) {
      startCamera();
    } else {
      const video = videoRef.current;
      if (video && video.srcObject) {
        const tracks = (video.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
      }
      onStreamReady(false);
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isActive, onStreamReady]);

  return (
    <div className="relative w-full h-full bg-[#050505] overflow-hidden screen-curve crt-screen border-2 border-[#1a1a1a]">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Moving Scanline Bar */}
      <div className="scanline-anim"></div>

      {/* Video Feed with RAW processing look */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-300 ${
            isActive 
            ? 'opacity-80 filter contrast-[1.2] saturate-[0.8] brightness-[0.9] sepia-[0.1]' 
            : 'opacity-0'
        }`}
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* Fallback Noise / "No Signal" State */}
      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#080808]">
            <div className="relative">
                <p className="text-[#333] font-bold text-4xl uppercase tracking-[0.2em] chromatic-text font-serif">
                    Signal Lost
                </p>
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center mix-blend-overlay">
                     <p className="text-red-900 font-bold text-4xl uppercase tracking-[0.2em] blur-sm opacity-50">
                        Signal Lost
                    </p>
                </div>
            </div>
          <div className="w-24 h-1 bg-acid-red mt-4 shadow-[0_0_10px_#ff2a2a]"></div>
          <p className="text-xs text-gray-600 font-mono mt-2 tracking-widest">NO INPUT DETECTED</p>
        </div>
      )}

      {/* Overlay UI - The "HUD" */}
      <div className="absolute top-4 left-4 flex gap-3 z-30">
         <div className={`px-2 py-0.5 border ${
            isActive 
            ? 'bg-acid-red border-acid-red text-black' 
            : 'bg-transparent border-gray-700 text-gray-700'
         }`}>
            <span className="text-xs font-bold uppercase font-mono tracking-widest">
              {isActive ? 'REC ●' : 'STBY'}
            </span>
         </div>
         {isActive && (
            <div className="px-2 py-0.5 border border-white/20 bg-black/50 backdrop-blur-sm text-white/80">
                <span className="text-xs font-mono">CAM_01</span>
            </div>
         )}
      </div>
      
      {/* Decorative Crosshairs */}
      <div className="absolute inset-0 pointer-events-none z-20 opacity-20">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white"></div>
         <div className="absolute top-8 right-8 w-4 h-[2px] bg-white"></div>
         <div className="absolute top-8 right-8 h-4 w-[2px] bg-white"></div>
         <div className="absolute bottom-8 left-8 w-4 h-[2px] bg-white"></div>
         <div className="absolute bottom-8 left-8 h-4 w-[2px] bg-white"></div>
      </div>
    </div>
  );
});

LiveFeed.displayName = 'LiveFeed';