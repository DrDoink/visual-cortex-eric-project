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
    <div className="relative w-full h-full bg-[#1a1a1a] overflow-hidden crt-overlay">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Moving Scanline Bar */}
      <div className="scanline-anim"></div>

      {/* Video Feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-500 ${
            isActive 
            ? 'opacity-90 grayscale-[0.2] contrast-[1.05]' 
            : 'opacity-0'
        }`}
      />
      
      {/* Idle State */}
      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#e0e0e0]">
             <div className="w-16 h-16 rounded-full border-4 border-gray-300 flex items-center justify-center mb-4">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
             </div>
             <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Signal Offline</p>
        </div>
      )}

      {/* Minimal HUD */}
      {isActive && (
          <div className="absolute top-4 left-4 flex gap-2 z-30">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]"></div>
            <span className="text-[10px] font-bold text-white/80 tracking-widest shadow-black drop-shadow-md">LIVE FEED</span>
          </div>
      )}
    </div>
  );
});

LiveFeed.displayName = 'LiveFeed';