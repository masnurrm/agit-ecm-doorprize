'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

interface Participant {
  id: string;
  name: string;
  nim: string;
  category: string;
  employment_type: string;
  is_winner: number;
}

interface SlotMachineProps {
  participants: Participant[];
  isRolling: boolean;
  isPaused?: boolean;
  onComplete: (participant: Participant) => void;
}

export default function SlotMachine({ participants, isRolling, isPaused = false, onComplete }: SlotMachineProps) {
  // Initial name is random
  const [currentIndex, setCurrentIndex] = useState(() =>
    participants.length > 0 ? Math.floor(Math.random() * participants.length) : 0
  );

  const [internalIsRolling, setInternalIsRolling] = useState(false);
  const elapsedRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const targetIdxRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const lastStepRef = useRef(0);

  useEffect(() => {
    if (!isRolling) {
      setInternalIsRolling(false);
      elapsedRef.current = 0;
      targetIdxRef.current = null;
      return;
    }

    if (isPaused) {
      return;
    }

    setInternalIsRolling(true);
    let timeoutId: NodeJS.Timeout;

    // 1. DURATION: 7 Seconds exactly
    const DURATION = 7000;

    // Initialize or continue
    if (startTimeRef.current === 0 || targetIdxRef.current === null) {
      startTimeRef.current = Date.now() - elapsedRef.current;
      targetIdxRef.current = Math.floor(Math.random() * participants.length);
    } else {
      // Resume: Shift start time to account for pause duration
      startTimeRef.current = Date.now() - elapsedRef.current;
    }

    const targetIdx = targetIdxRef.current;
    const targetParticipant = participants[targetIdx];

    // Calculate total steps needed to reach target after at least a few full spins
    const rotations = 500; // High speed start
    const distanceToTarget = (targetIdx - currentIndex + participants.length) % participants.length;
    const totalSteps = (participants.length * rotations) + distanceToTarget;

    if (elapsedRef.current === 0) {
      lastStepRef.current = 0;
    }

    const animate = () => {
      if (isPaused) return;

      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      elapsedRef.current = elapsed;

      const progress = Math.min(elapsed / DURATION, 1);

      if (progress < 1) {
        // QUADRATIC EASE OUT (Starts at 100%, gradually decreases to 0% at exactly 7s)
        const easedProgress = progress * (2 - progress);
        const currentStep = Math.floor(totalSteps * easedProgress);

        if (currentStep > lastStepRef.current) {
          setCurrentIndex((prev) => (prev + (currentStep - lastStepRef.current)) % participants.length);
          lastStepRef.current = currentStep;
        }

        // Calculate next delay based on the local slope of the ease-out curve
        const remainingProgress = 1 - progress;
        const delay = 50 + (1 - remainingProgress) * 500;

        timeoutId = setTimeout(animate, Math.min(delay, 200));
      } else {
        // Ensure we are EXACTLY on the target at the end
        setCurrentIndex(targetIdx);

        // Final settle delay to show the winner clearly
        timeoutId = setTimeout(() => {
          setInternalIsRolling(false);
          onComplete(targetParticipant);
          // Reset for next potential roll
          elapsedRef.current = 0;
          startTimeRef.current = 0;
          targetIdxRef.current = null;
        }, 800);
      }
    };

    animate();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isRolling, isPaused, participants.length]);

  if (participants.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        No eligible participants available
      </div>
    );
  }

  const currentParticipant = participants[currentIndex];

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-showman-black via-showman-red-dark to-showman-black rounded-2xl p-4 shadow-2xl border-4 border-showman-gold w-full h-[180px] flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-black/40"></div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentParticipant?.id || 'idle'}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="relative z-10 text-center w-full px-4"
        >
          <div
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-showman-gold mb-2 drop-shadow-lg truncate"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {currentParticipant?.name || '---'}
          </div>
          <div className="text-lg sm:text-xl md:text-2xl text-showman-gold-cream font-mono">
            {currentParticipant?.nim || '---'}
          </div>
        </motion.div>
      </AnimatePresence>

      {(isRolling || internalIsRolling) && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-showman-gold/30 to-transparent transform -skew-x-12"></div>
        </motion.div>
      )}

      {/* Decorative corners */}
      <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-showman-gold"></div>
      <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-showman-gold"></div>
      <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-showman-gold"></div>
      <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-showman-gold"></div>
    </div>
  );
}
