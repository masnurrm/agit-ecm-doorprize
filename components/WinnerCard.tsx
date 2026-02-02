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
      className="relative group"
    >
      <div className="bg-showman-black-light rounded-xl shadow-lg hover:shadow-2xl hover:shadow-showman-gold/20 transition-all duration-300 overflow-hidden border-2 border-showman-gold/50 hover:border-showman-gold">
        <div className="bg-gradient-to-r from-showman-red to-showman-red-dark h-2"></div>

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 text-center">
              <h3 className="text-xl font-bold text-showman-gold mb-1">
                {participant.name}
              </h3>
              <p className="text-sm text-showman-gold-cream font-mono">
                NPK: {participant.nim}
              </p>
            </div>

            <button
              onClick={() => onRemove(participant.id)}
              disabled={disabled}
              className="ml-4 p-2 rounded-lg bg-showman-red/20 text-showman-red hover:bg-showman-red hover:text-white transition-all duration-200 group-hover:scale-110 border border-showman-red/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              title="Remove from winners list"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
