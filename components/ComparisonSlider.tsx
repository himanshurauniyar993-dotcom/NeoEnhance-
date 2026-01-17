
import React, { useState, useRef, useEffect } from 'react';

interface ComparisonSliderProps {
  before: string;
  after: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ before, after }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const onMouseDown = () => setIsDragging(true);
  const onMouseUp = () => setIsDragging(false);

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      handleMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleGlobalUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full aspect-square md:aspect-video rounded-xl md:rounded-2xl overflow-hidden shadow-2xl cursor-col-resize select-none border border-white/10 touch-none"
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
    >
      {/* After Image (Background) */}
      <img 
        src={after} 
        alt="After" 
        className="absolute top-0 left-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Before Image (Clipped) */}
      <div 
        className="absolute top-0 left-0 h-full overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={before} 
          alt="Before" 
          className="absolute top-0 left-0 w-full h-full object-cover"
          style={{ width: containerRef.current?.offsetWidth || '100%' }}
          draggable={false}
        />
        <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-black/60 backdrop-blur-md px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white border border-white/20 whitespace-nowrap">
          Original
        </div>
      </div>

      <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-blue-500/80 backdrop-blur-md px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white border border-white/20 whitespace-nowrap">
        Enhanced
      </div>

      {/* Slider Divider */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 md:w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-white rounded-full shadow-xl flex items-center justify-center pointer-events-none border border-zinc-200">
          <svg className="w-4 h-4 md:w-5 md:h-5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 9l-4 4 4 4m8 0l4-4-4-4" />
          </svg>
        </div>
      </div>
    </div>
  );
};
