'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Participant {
  id: string;
  name: string;
  nim: string;
  category: string;
  employment_type: string;
  is_winner: number;
  checked_in: number;
}

interface SpinningWheelProps {
  participants: Participant[];
  prizeName?: string;
  isRolling: boolean;
  isPaused?: boolean;
  onComplete: (participant: Participant) => void;
  onPointerTick?: (participant: Participant | null) => void;
  onStart?: () => void;
  onTogglePause?: () => void;
  zoomCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export default function SpinningWheel({ participants, prizeName, isRolling, isPaused = false, onComplete, onPointerTick, zoomCanvasRef, onStart, onTogglePause }: SpinningWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bakedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const [winner, setWinner] = useState<Participant | null>(null);
  const lastPointedRef = useRef<string | null>(null);

  // Animation state
  const rotationRef = useRef(0);
  const zoomRotationRef = useRef(0);
  const isSpinningRef = useRef(false);
  const animationFrameRef = useRef<number>();
  const targetIndexRef = useRef<number | null>(null);
  const isSettlingRef = useRef(false);
  const isStartedRef = useRef(false);
  const isStoppedRef = useRef(false);
  const startRotationRef = useRef(0);
  const finalRotationRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  // Dynamic duration: 30s for Grand Prize, 10s otherwise
  const getDuration = () => {
    return prizeName?.toLowerCase().includes('grand prize') ? 30000 : 10000;
  };
  const durationRef = useRef(getDuration());

  // Update duration when prize changes
  useEffect(() => {
    durationRef.current = getDuration();
  }, [prizeName]);

  // Multi-color support (Red, Black, Dark Grey)
  const WHEEL_COLORS = ['#5f0000ff', '#0F0F0F'];
  const TEXT_COLOR = '#ffffffff'; // Showman Gold
  const BORDER_COLOR = '#F59E0B';

  // Helper to notify about pointed participant
  // Unified source of truth for identifying the participant at the pointer
  const getWinnerAtRotation = (rotation: number) => {
    if (participants.length === 0) return { index: -1, participant: null };
    const segmentAngle = (2 * Math.PI) / participants.length;
    // Pointer is at 0 degrees. Normalized rotation in [0, 2PI)
    const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const adjustedRotation = (2 * Math.PI - normalizedRotation) % (2 * Math.PI);
    const index = Math.floor(adjustedRotation / segmentAngle) % participants.length;
    return { index, participant: participants[index] };
  };

  const updatePointed = (rotation: number) => {
    if (!onPointerTick) return;
    const { participant } = getWinnerAtRotation(rotation);
    if (participant && participant.id !== lastPointedRef.current) {
      lastPointedRef.current = participant.id;
      onPointerTick(participant);
    }
  };

  // Prerender the wheel segments
  const bakeWheel = (width: number, height: number) => {
    if (participants.length === 0) return null;

    const baked = document.createElement('canvas');
    baked.width = width;
    baked.height = height;
    const ctx = baked.getContext('2d');
    if (!ctx) return null;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const segmentAngle = (2 * Math.PI) / participants.length;

    ctx.translate(centerX, centerY);

    // Optimization: skip names if too many participants
    const skipText = participants.length > 200;

    participants.forEach((p, i) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, i * segmentAngle, (i + 1) * segmentAngle);
      ctx.closePath();

      // Cycle through 3 colors
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();

      // Segment outline removed as per request
      // Only keeping names and outer ring

      if (!skipText) {
        // Draw Text
        ctx.save();
        ctx.rotate(i * segmentAngle + segmentAngle / 2);
        ctx.translate(radius * 0.6, 0);
        ctx.fillStyle = TEXT_COLOR;
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Truncate text if too long
        const text = p.name.length > 12 ? p.name.substring(0, 10) + '...' : p.name;
        ctx.fillText(text, 0, 0);

        // Draw NPK below name
        ctx.font = '8px Inter';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(p.nim, 0, 12);

        ctx.restore();
      }
    });

    // Always add a single outer gold ring for the wheel shell
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 6;
    ctx.stroke();

    return baked;
  };

  useEffect(() => {
    // Load ECM logo
    const logo = new Image();
    logo.src = '/images/logo_ecm.png';
    logo.onload = () => {
      logoImageRef.current = logo;
    };
  }, []);

  useEffect(() => {
    // Reset baked canvas when participants or their order changes
    bakedCanvasRef.current = null;
  }, [participants]);

  useEffect(() => {
    if (participants.length === 0) return;

    const canvas = canvasRef.current;
    const zoomCanvas = zoomCanvasRef?.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const zCtx = zoomCanvas?.getContext('2d');
    if (!ctx) return;

    const drawWheel = () => {
      const { width, height } = canvas;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (!bakedCanvasRef.current) {
        bakedCanvasRef.current = bakeWheel(width, height);
      }

      if (bakedCanvasRef.current) {
        ctx.save();
        ctx.translate(centerX, centerY);
        const currentRot = isSpinningRef.current || isSettlingRef.current ? rotationRef.current : (rotationRef.current % (2 * Math.PI));
        ctx.rotate(currentRot);
        ctx.translate(-centerX, -centerY);
        ctx.drawImage(bakedCanvasRef.current, 0, 0);
        ctx.restore();
      }

      // Hub
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
      ctx.fillStyle = '#0F0F0F';
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw ECM logo instead of text
      if (logoImageRef.current) {
        const logoSize = 50; // Logo size
        ctx.drawImage(
          logoImageRef.current,
          centerX - logoSize / 2,
          centerY - logoSize / 2,
          logoSize,
          logoSize
        );
      }

      // Pointer
      ctx.beginPath();
      ctx.moveTo(width - 45, centerY);
      ctx.lineTo(width - 10, centerY - 15);
      ctx.lineTo(width - 10, centerY + 15);
      ctx.closePath();
      ctx.fillStyle = '#F59E0B';
      ctx.fill();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const drawZoomWheel = () => {
      if (!zCtx || !zoomCanvas) return;
      const { width, height } = zoomCanvas;
      const centerX = -7600; // Recalculated for extremely flat arc with 8000 radius
      const centerY = height / 2;
      const zoomRadius = 8000; // Massive radius for ultra-zoom
      const segmentAngle = (2 * Math.PI) / participants.length;

      zCtx.clearRect(0, 0, width, height);
      zCtx.save();
      zCtx.translate(centerX, centerY);
      const currentZoomRot = isSpinningRef.current || isSettlingRef.current ? rotationRef.current : (zoomRotationRef.current % (2 * Math.PI));
      zCtx.rotate(currentZoomRot);
      // Source of truth synchronization for viewfinder
      const normalizedRot = ((currentZoomRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const { index: targetIndex } = getWinnerAtRotation(normalizedRot);

      // Draw tiny sliver of the wheel (approx 5-10 names)
      const safetyRange = 8; // Narrow window for extreme magnification

      for (let i = targetIndex - safetyRange; i <= targetIndex + safetyRange; i++) {
        const idx = (i + participants.length) % participants.length;
        const p = participants[idx];
        if (!p) continue;

        zCtx.beginPath();
        zCtx.moveTo(0, 0);
        zCtx.arc(0, 0, zoomRadius, idx * segmentAngle, (idx + 1) * segmentAngle);
        zCtx.closePath();
        zCtx.fillStyle = WHEEL_COLORS[idx % WHEEL_COLORS.length];
        zCtx.fill();

        // Segment borders removed

        // Text
        zCtx.save();
        zCtx.rotate(idx * segmentAngle + segmentAngle / 2);
        zCtx.translate(zoomRadius - 100, 0); // Moved 100px deep to match needle tip

        // Giant text for audience reading - Horizontal Format: Name | NPK
        zCtx.fillStyle = TEXT_COLOR;
        zCtx.font = 'black 65px Outfit, sans-serif';
        zCtx.textAlign = 'right';
        zCtx.textBaseline = 'middle';

        const text = `${p.name} | ${p.nim}`;
        zCtx.fillText(text, 0, 0);
        zCtx.restore();
      }
      zCtx.restore();

      // Zoom Window Center Needle (Static - Exactly touching at 0 deg edge)
      zCtx.beginPath();
      const tipX = 400; // Found via centerX(-7600) + zoomRadius(8000)
      zCtx.moveTo(tipX, centerY);
      zCtx.lineTo(width - 10, centerY - 40);
      zCtx.lineTo(width - 10, centerY + 40);
      zCtx.closePath();
      zCtx.fillStyle = '#F59E0B';
      zCtx.fill();
      zCtx.strokeStyle = '#FFFFFF';
      zCtx.lineWidth = 4;
      zCtx.stroke();

      // Highlight bar
      zCtx.fillStyle = 'rgba(245, 158, 11, 0.1)';
      zCtx.fillRect(width - 100, centerY - 60, 100, 120);
    };

    const animate = () => {
      if (isPaused) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = Date.now();

      if (!isRolling) {
        isStartedRef.current = false;
        isSpinningRef.current = false;
        isSettlingRef.current = false;
        isStoppedRef.current = false;
        targetIndexRef.current = null;
      }

      if (isRolling && !isStartedRef.current) {
        isStartedRef.current = true;
        isSpinningRef.current = true;
        isStoppedRef.current = false;
        startTimeRef.current = now;

        // Smooth Draw Start: Calculate relative to current idle position
        const currentRot = rotationRef.current;
        startRotationRef.current = currentRot;

        // Align zoom to main wheel immediately
        zoomRotationRef.current = currentRot % (2 * Math.PI);

        if (targetIndexRef.current === null) {
          targetIndexRef.current = Math.floor(Math.random() * participants.length);
        }

        const sliceAngle = (2 * Math.PI) / (participants.length - 1);
        // Pointer is at 0 degrees, which is at the EDGE of the segment, not the center
        const targetAngleOfSegment = (targetIndexRef.current! * sliceAngle);

        // We want: targetAngleOfSegment + totalRotation = Multiples of 2PI
        // So targetRotationDistance = (Large Multiple of 2PI) - targetAngleOfSegment - currentRotation
        const fullSpins = 60 * 2 * Math.PI;
        const nextTargetAngle = (2 * Math.PI - targetAngleOfSegment) % (2 * Math.PI);

        // Ensure we spin forward at least 60 times from current position
        const currentBase = Math.floor(currentRot / (2 * Math.PI)) * (2 * Math.PI);
        finalRotationRef.current = currentBase + fullSpins + nextTargetAngle;

        // If the math resulted in a rotation smaller than current, add one more spin
        if (finalRotationRef.current < currentRot + fullSpins) {
          finalRotationRef.current += 2 * Math.PI;
        }
      }

      if (isSpinningRef.current) {
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(elapsed / durationRef.current, 1);

        if (progress < 1) {
          const ease = 1 - Math.pow(1 - progress, 5); // Cinematic Quintic ease-out
          rotationRef.current = startRotationRef.current + (finalRotationRef.current - startRotationRef.current) * ease;
        } else {
          // Precision Stop: Explicitly lock to the absolute mathematical center
          rotationRef.current = finalRotationRef.current;
          isSpinningRef.current = false;
          isStoppedRef.current = true;
          isSettlingRef.current = true;

          // Source of truth: Use targetIndexRef if available, otherwise fallback to rotation mapping
          const targetIdx = targetIndexRef.current !== null ? targetIndexRef.current : getWinnerAtRotation(rotationRef.current).index;
          const participant = participants[targetIdx];

          // Add 2s settle delay at EXACTLY zero speed before revealing any winner info
          setTimeout(() => {
            if (participant) {
              setWinner(participant);
              onComplete(participant);
            }
            isSettlingRef.current = false;
            isStartedRef.current = false;
            isStoppedRef.current = false;
            targetIndexRef.current = null;
            // Resync zoom after reveal
            zoomRotationRef.current = rotationRef.current;
          }, 2000);
        }
      } else if (!isRolling && !isSettlingRef.current) {
        if (targetIndexRef.current === null) {
          // Dramatic 10:1 Idle speeds
          rotationRef.current += 0.001; // Main Wheel: Active energy
          zoomRotationRef.current += 0.0001; // Viewfinder: Super-slow crawl
        }
      }

      updatePointed(rotationRef.current);
      drawWheel();
      drawZoomWheel();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [participants, isRolling, isPaused, onComplete]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
        bakedCanvasRef.current = null;
      }
      if (zoomCanvasRef?.current && zoomCanvasRef.current.parentElement) {
        zoomCanvasRef.current.width = zoomCanvasRef.current.parentElement.clientWidth;
        zoomCanvasRef.current.height = zoomCanvasRef.current.parentElement.clientHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);


  return (
    <div className="relative w-full h-[500px] flex flex-col items-center justify-center">
      {/* Hidden Text for Browser Search (Ctrl+F) */}
      <div className="sr-only" aria-hidden="true" style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: '0' }}>
        {participants.map(p => (
          <div key={p.id}>{p.name} {p.nim}</div>
        ))}
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute inset-0 bg-showman-black/50 rounded-full blur-3xl transform scale-90"></div>

        {/* Outer Glow Ring */}
        <div className="absolute w-[460px] h-[460px] rounded-full border-[10px] border-showman-gold/20 shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-pulse"></div>

        {/* Canvas Container */}
        <div
          className="relative w-[450px] h-[450px] cursor-pointer active:scale-[0.98] transition-all hover:shadow-[0_0_80px_rgba(245,158,11,0.2)] rounded-full group"
          onClick={() => {
            if (!isRolling && onStart) {
              onStart();
            }
          }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />

          {/* Interaction Hint */}
          {!isRolling && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-showman-black/10 rounded-full pointer-events-none">
              <p className="text-showman-gold font-black uppercase tracking-[0.3em] text-[10px] bg-showman-black/80 px-4 py-2 rounded-full border border-showman-gold/20">
                Click to Spin
              </p>
            </div>
          )}
        </div>

        {/* Winner Overlay */}
        <AnimatePresence>
          {!isRolling && winner && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 bg-showman-black/90 border border-showman-gold px-6 py-2 rounded-xl backdrop-blur-md"
            >
              <p className="text-showman-gold font-bold text-lg">{winner.name}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


