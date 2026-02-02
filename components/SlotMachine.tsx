'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

interface Participant {
  id: string;
  name: string;
  nim: string;
  is_winner: number;
}

interface SlotMachineProps {
  participants: Participant[];
  isRolling: boolean;
  onComplete: (participant: Participant) => void;
}

export default function SlotMachine({ participants, isRolling, onComplete }: SlotMachineProps) {
  // Initial name is random
  const [currentIndex, setCurrentIndex] = useState(() =>
    participants.length > 0 ? Math.floor(Math.random() * participants.length) : 0
  );

  const [internalIsRolling, setInternalIsRolling] = useState(false);

  useEffect(() => {
    if (!isRolling || participants.length === 0 || internalIsRolling) {
      if (!isRolling) setInternalIsRolling(false);
      return;
    }

    setInternalIsRolling(true);
    let timeoutId: NodeJS.Timeout;

    // 1. DURATION: 5 Seconds exactly
    const DURATION = 7000;
    const startTime = Date.now();

    // 2. TARGET: Pick a random target from ALL for the "gambling" feel
    const targetIdx = Math.floor(Math.random() * participants.length);
    const targetParticipant = participants[targetIdx];

    // Calculate total steps needed to reach target after at least a few full spins
    const rotations = 500; // High speed start
    const distanceToTarget = (targetIdx - currentIndex + participants.length) % participants.length;
    const totalSteps = (participants.length * rotations) + distanceToTarget;

    let lastStep = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / DURATION, 1);

      if (progress < 1) {
        // QUADRATIC EASE OUT (Starts at 100%, gradually decreases to 0% at exactly 5s)
        const easedProgress = progress * (2 - progress);
        const currentStep = Math.floor(totalSteps * easedProgress);

        if (currentStep > lastStep) {
          setCurrentIndex((prev) => (prev + (currentStep - lastStep)) % participants.length);
          lastStep = currentStep;
        }

        // Calculate next delay based on the local slope of the ease-out curve
        // The closer to 5s, the slower the steps.
        const remainingProgress = 1 - progress;
        // Base delay is 50ms, increases as we approach the end
        const delay = 50 + (1 - remainingProgress) * 500;

        timeoutId = setTimeout(animate, Math.min(delay, 200));
      } else {
        // Ensure we are EXACTLY on the target at the end
        setCurrentIndex(targetIdx);

        // Final settle delay to show the winner clearly
        timeoutId = setTimeout(() => {
          setInternalIsRolling(false);
          onComplete(targetParticipant);
        }, 800);
      }
    };

    animate();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isRolling, participants.length]);

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
