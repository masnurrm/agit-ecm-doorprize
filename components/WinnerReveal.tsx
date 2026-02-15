'use client';

import { motion } from 'framer-motion';
import { Package } from 'lucide-react';

interface Participant {
    id: string;
    name: string;
    nim: string;
    category: string;
    employment_type: string;
    is_winner: number;
    checked_in: number;
}

interface WinnerRevealProps {
    winner: Participant;
    prizeName?: string;
    prizeImage?: string;
    onClose?: () => void;
}

export default function WinnerReveal({ winner, prizeName, prizeImage, onClose }: WinnerRevealProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
            onClick={onClose}
        >
            {/* Light Burst Behind */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-showman-gold/40 to-transparent blur-3xl animate-pulse -z-10"></div>

            <div className="relative bg-gradient-to-br from-showman-black via-showman-red-dark to-showman-black border-[6px] border-showman-gold rounded-3xl p-10 max-w-2xl w-full text-center shadow-[0_0_100px_rgba(245,158,11,0.5)] flex flex-col items-center">

                {/* Confetti / Sparkles Decorations */}
                <div className="absolute -top-10 -left-10 w-24 h-24 border-t-[10px] border-l-[10px] border-showman-gold rounded-tl-3xl"></div>
                <div className="absolute -bottom-10 -right-10 w-24 h-24 border-b-[10px] border-r-[10px] border-showman-gold rounded-br-3xl"></div>

                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6"
                >
                    <h2 className="text-3xl font-black text-showman-gold-cream uppercase tracking-[0.2em] mb-2">
                        Congratulations
                    </h2>
                    {prizeName && (
                        <div className="inline-block bg-showman-gold text-showman-black px-4 py-1 rounded-full font-bold uppercase text-sm tracking-wider">
                            You Won: {prizeName}
                        </div>
                    )}
                </motion.div>

                {/* Winner Name Scale Up */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: 'spring' }}
                    className="space-y-4 mb-8"
                >
                    <div className="relative">
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-playfair font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] leading-tight">
                            {winner.name}
                        </h1>
                    </div>

                    <div className="inline-flex items-center gap-2 bg-white/10 px-6 py-2 rounded-xl border border-showman-gold/30">
                        <span className="text-showman-gold font-mono text-2xl font-bold tracking-[0.1em]">
                            NPK: {winner.nim}
                        </span>
                    </div>
                </motion.div>

                {/* Prize Image if available */}
                {prizeImage && (
                    <motion.img
                        src={prizeImage}
                        alt="Prize"
                        className="h-32 object-contain mb-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    />
                )}

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                    className="text-showman-gold-cream/40 text-sm font-bold uppercase tracking-widest mt-4"
                >
                    Processing Winner...
                </motion.p>
            </div>
        </motion.div>
    );
}
