'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react';

interface Participant {
  id: string;
  name: string;
  npk: string;
  category: string;
  employment_type: string;
  is_winner: number;
  checked_in: number;
}

interface WheelOfNamesProps {
  participants: Participant[];
  isRolling: boolean;
  isPaused?: boolean;
  onComplete: (participant: Participant) => void;
}

export default function WheelOfNames({ participants, isRolling, isPaused = false, onComplete }: WheelOfNamesProps) {
  const [rotation, setRotation] = useState(0);
  const [internalIsRolling, setInternalIsRolling] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);

  const rotationRef = useRef(0);
  const startTimeRef = useRef(0);
  const durationRef = useRef(7000); // 7 seconds
  const targetRotationRef = useRef(0);
  const startRotationRef = useRef(0);
  const elapsedRef = useRef(0);
  const requestRef = useRef<number>();

  const COLORS = ['#DC2626', '#0F0F0F', '#1F1F1F', '#B91C1C']; // Showman Reds and Blacks

  const wheelData = useMemo(() => {
    if (participants.length === 0) return [];

    // To make it look "full" if there are few participants, we repeat them
    let displayParticipants = [...participants];
    if (displayParticipants.length < 20 && displayParticipants.length > 0) {
      const repeats = Math.ceil(20 / displayParticipants.length);
      displayParticipants = Array(repeats).fill(displayParticipants).flat();
    }

    return displayParticipants.map((p, i) => ({
      ...p,
      color: COLORS[i % COLORS.length],
      angle: 360 / (displayParticipants.length || 1)
    }));
  }, [participants]);

  useEffect(() => {
    if (!isRolling) {
      setInternalIsRolling(false);
      elapsedRef.current = 0;
      setWinner(null);
      return;
    }

    if (isPaused) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    setInternalIsRolling(true);

    if (elapsedRef.current === 0) {
      // Start of a new roll
      const winIdx = Math.floor(Math.random() * wheelData.length);
      const winPart = wheelData[winIdx];
      setWinner(winPart);

      startRotationRef.current = rotationRef.current % 360;

      // Calculate target rotation
      // wheelData[winIdx] is the target. 
      // Slices start from 0 degrees (top). Needle is at top (0 or 270?)
      // Let's put needle at the TOP (270 degrees in SVG coordinate if 0 is right, but we'll adjust)
      // Actually, let's put the needle at the RIGHT (0 degrees).
      const sliceAngle = 360 / wheelData.length;
      const targetSliceCenterAngle = winIdx * sliceAngle + sliceAngle / 2;

      // We want targetSliceCenterAngle to end up at 0 degrees (pointing right)
      // Final rotation should be such that: (rotation + targetSliceCenterAngle) % 360 = 0
      // So rotation = -targetSliceCenterAngle
      const fullSpins = 10 + Math.floor(Math.random() * 5); // 10-15 spins
      targetRotationRef.current = 360 * fullSpins - targetSliceCenterAngle;

      startTimeRef.current = Date.now();
    } else {
      // Resume from pause
      startTimeRef.current = Date.now() - elapsedRef.current;
    }

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      elapsedRef.current = elapsed;

      const progress = Math.min(elapsed / durationRef.current, 1);

      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const currentRot = startRotationRef.current + (targetRotationRef.current - startRotationRef.current) * easedProgress;
      rotationRef.current = currentRot;
      setRotation(currentRot);

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setInternalIsRolling(false);
        if (winner) {
          // Settlement delay to let the user see where it landed
          setTimeout(() => {
            const actualWinner = participants.find(p => p.id === winner.id) || winner;
            onComplete(actualWinner);
          }, 1000);
        }
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRolling, isPaused, wheelData, participants, onComplete, winner]);

  if (participants.length === 0) {
    return <div className="text-center py-20 text-gray-400">No participants</div>;
  }

  const radius = 250;
  const centerX = 250;
  const centerY = 250;

  return (
    <div className="relative w-full max-w-[550px] aspect-square mx-auto flex items-center justify-center overflow-visible select-none py-10">
      {/* Searchable Text Layer - Hidden but accessible to Ctrl+F */}
      <div className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden" aria-hidden="true">
        {participants.map(p => (
          <div key={`search-${p.id}`}>{p.name} {p.npk}</div>
        ))}
      </div>

      {/* The Wheel */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Glow Effects */}
        <div className="absolute inset-0 bg-showman-gold/20 blur-[120px] rounded-full scale-110"></div>
        <div className="absolute inset-0 bg-showman-red/10 blur-[60px] rounded-full animate-pulse"></div>

        {/* SVG Wheel */}
        <motion.svg
          viewBox="0 0 500 500"
          className="w-full h-full drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]"
          style={{ rotate: rotation }}
        >
          <defs>
            <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
              <feOffset dx="1" dy="1" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.7" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Patterns and gradients could be added here */}
          </defs>

          <g>
            {wheelData.map((part, i) => {
              const startAngle = (i * 360) / wheelData.length;
              const angle = 360 / wheelData.length;
              const endAngle = startAngle + angle;

              const x1 = centerX + radius * Math.cos((Math.PI * startAngle) / 180);
              const y1 = centerY + radius * Math.sin((Math.PI * startAngle) / 180);
              const x2 = centerX + radius * Math.cos((Math.PI * endAngle) / 180);
              const y2 = centerY + radius * Math.sin((Math.PI * endAngle) / 180);

              const largeArcFlag = angle > 180 ? 1 : 0;

              const d = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');

              // Show more text if slices are large enough
              const displayName = wheelData.length > 40 ? part.name.split(' ')[0] : part.name;

              return (
                <g key={`${part.id}-${i}`}>
                  <path
                    d={d}
                    fill={part.color}
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <g transform={`rotate(${startAngle + angle / 2}, ${centerX}, ${centerY})`}>
                    <text
                      x={centerX + radius * 0.9}
                      y={centerY}
                      fill={part.color === '#0F0F0F' || part.color === '#1F1F1F' ? '#F59E0B' : '#FFFFFF'}
                      fontSize={Math.max(6, Math.min(14, 800 / wheelData.length))}
                      fontWeight="900"
                      textAnchor="end"
                      dominantBaseline="middle"
                      filter="url(#textShadow)"
                      className="font-sans uppercase tracking-tight"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        pointerEvents: 'none'
                      }}
                    >
                      {displayName}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* Inner Circle Decor */}
          <circle cx={centerX} cy={centerY} r="40" fill="#0F0F0F" stroke="#F59E0B" strokeWidth="4" />
          <circle cx={centerX} cy={centerY} r="35" fill="none" stroke="#DC2626" strokeWidth="2" strokeDasharray="5,5" />
          <TrophyIcon x={centerX - 15} y={centerY - 15} />
        </motion.svg>

        {/* Pointer/Needle */}
        <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-20">
          <svg width="60" height="40" viewBox="0 0 60 40">
            <path
              d="M 60 20 L 0 0 L 0 40 Z"
              fill="#F59E0B"
              stroke="#0F0F0F"
              strokeWidth="2"
              className="drop-shadow-lg"
            />
          </svg>
        </div>

        {/* Outer Frame */}
        <div className="absolute inset-0 rounded-full border-[10px] border-showman-gold/20 pointer-events-none"></div>
        <div className="absolute inset-[-5px] rounded-full border-4 border-showman-gold pointer-events-none"></div>

        {/* Lights/Dots around the frame */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-showman-gold rounded-full shadow-[0_0_10px_#F59E0B]"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 30}deg) translate(0, -255px) rotate(-${i * 30}deg) translate(-50%, -50%)`,
                animation: (isRolling || internalIsRolling) ? `pulse 0.5s infinite alternate ${i * 0.1}s` : 'none'
              }}
            ></div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          from { opacity: 0.4; transform: scale(0.8) translate(-50%, -50%); }
          to { opacity: 1; transform: scale(1.2) translate(-50%, -50%); }
        }
      `}</style>
    </div>
  );
}

function TrophyIcon({ x, y }: { x: number, y: number }) {
  return (
    <svg x={x} y={y} width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 22V18" />
      <path d="M14 22V18" />
      <path d="M18 4H6v7a6 6 0 0 0 12 0V4Z" />
    </svg>
  );
}
