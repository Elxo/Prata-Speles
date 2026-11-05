import { useEffect, useState, type ReactNode } from 'react';

export const STAGE_W = 1920;
export const STAGE_H = 1080;

/**
 * Fiksēta 1920×1080 "skatuve", kas tiek mērogota jebkura izmēra logam.
 * Tādējādi izkārtojums un fontu izmēri projektorā vienmēr ir vienādi.
 */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div
        className="stage-bg relative shrink-0 overflow-hidden text-white"
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: 'center' }}
      >
        <div className="stage-rays" />
        {children}
      </div>
    </div>
  );
}
