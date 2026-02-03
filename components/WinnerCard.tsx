'use client';

import { motion } from 'framer-motion';
import { X, User } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  nim: string;
}

interface WinnerCardProps {
  participant: Participant;
  index: number;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export default function WinnerCard({ participant, index, onRemove, disabled = false }: WinnerCardProps) {
  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        delay: index * 0.1,
        layout: { type: 'spring', damping: 25, stiffness: 200 }
      }}
      className="relative group h-full"
    >
      <div className="bg-showman-black-light rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-showman-gold/20 transition-all duration-300 overflow-hidden border-2 border-showman-gold/50 hover:border-showman-gold h-[180px] w-full flex flex-col">
        <div className="p-6 flex-1 flex flex-col justify-center relative">
          <button
            onClick={() => onRemove(participant.id)}
            disabled={disabled}
            className="absolute top-4 right-4 p-2 rounded-lg bg-showman-red/10 text-showman-red hover:bg-showman-red hover:text-white transition-all duration-200 group-hover:scale-110 border border-showman-red/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 z-10"
            title="Remove from winners list"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center space-y-2 pr-8">
            <h3 className="text-xl font-black text-white leading-tight break-words">
              {participant.name}
            </h3>
            <div className="h-0.5 w-10 bg-showman-gold/30 mx-auto"></div>
            <p className="text-xs text-showman-gold font-mono font-bold tracking-widest leading-none">
              NPK: {participant.nim}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
