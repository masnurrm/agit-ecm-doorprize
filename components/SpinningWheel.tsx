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
    isRolling: boolean;
    isPaused?: boolean;
    onComplete: (participant: Participant) => void;
}

export default function SpinningWheel({ participants, isRolling, isPaused = false, onComplete }: SpinningWheelProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [winner, setWinner] = useState<Participant | null>(null);

    // Animation state
    const rotationRef = useRef(0);
    const velocityRef = useRef(0);
    const isSpinningRef = useRef(false);
    const animationFrameRef = useRef<number>();
    const targetIndexRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const durationRef = useRef(7000); // 7 seconds
    const initialVelocityRef = useRef(0.05); // Starting speed

    // Constants
    const WHEEL_COLORS = ['#DC2626', '#0F0F0F']; // Showman Red & Black
    const TEXT_COLOR = '#F59E0B'; // Showman Gold
    const BORDER_COLOR = '#F59E0B';

    useEffect(() => {
        if (participants.length === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const drawWheel = () => {
            if (!canvas || !ctx) return;
            const { width, height } = canvas;
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(centerX, centerY) - 20;
            const segmentAngle = (2 * Math.PI) / participants.length;

            ctx.clearRect(0, 0, width, height);

            // Save context
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationRef.current);

            // Draw Segments
            participants.forEach((p, i) => {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, radius, i * segmentAngle, (i + 1) * segmentAngle);
                ctx.closePath();
                ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
                ctx.fill();
                ctx.strokeStyle = BORDER_COLOR;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw Text
                ctx.save();
                ctx.rotate(i * segmentAngle + segmentAngle / 2);
                ctx.translate(radius * 0.6, 0);
                ctx.fillStyle = TEXT_COLOR;
                ctx.font = 'bold 14px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Truncate text if too long
                const text = p.name.length > 15 ? p.name.substring(0, 12) + '...' : p.name;
                ctx.fillText(text, 0, 0);

                // Draw NIM below name
                ctx.font = '10px Inter';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillText(p.nim, 0, 15);

                ctx.restore();
            });

            ctx.restore();

            // Draw Center Hub
            ctx.beginPath();
            ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
            ctx.fillStyle = '#0F0F0F';
            ctx.fill();
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Draw Center Text
            ctx.fillStyle = '#F59E0B';
            ctx.font = 'bold 12px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('AGIT', centerX, centerY);

            // Draw Pointer (Triangle at 3 o'clock position = 0 radians in canvas if not rotated, 
            // but usually we want it at top. Let's put a static pointer at the Right side (0 rad))
            // Actually, standard is usually top or right. Let's do Right side pointer logic.
            // Arrow pointing LEFT
            ctx.beginPath();
            ctx.moveTo(width - 10, centerY);
            ctx.lineTo(width + 10, centerY - 15); // Out of view
            ctx.lineTo(width - 40, centerY);
            ctx.lineTo(width + 10, centerY + 15); // Out of view
            ctx.closePath();
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Better Pointer
            ctx.beginPath();
            // Pointer Tip
            ctx.moveTo(width - 45, centerY);
            // Base
            ctx.lineTo(width - 10, centerY - 15);
            ctx.lineTo(width - 10, centerY + 15);
            ctx.closePath();
            ctx.fillStyle = '#F59E0B'; // Gold Pointer
            ctx.fill();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0; // Reset
        };

        const animate = () => {
            if (isPaused) {
                animationFrameRef.current = requestAnimationFrame(animate);
                return;
            }

            const now = Date.now();

            if (isRolling && !isSpinningRef.current) {
                // Start Spinning
                isSpinningRef.current = true;
                startTimeRef.current = now;

                // Pick a winner if not already set
                if (targetIndexRef.current === null) {
                    targetIndexRef.current = Math.floor(Math.random() * participants.length);
                }
            }

            if (isSpinningRef.current) {
                const elapsed = now - startTimeRef.current;
                const progress = Math.min(elapsed / durationRef.current, 1);

                if (progress < 1) {
                    // Easing logic: Ease Out Quart
                    // 1 - pow(1 - x, 4)
                    const ease = 1 - Math.pow(1 - progress, 4);

                    // Calculate total rotation needed
                    // We want the target segment to end up at angle 0 (Right side)
                    // Segment i is at angles [i*slice, (i+1)*slice]
                    // Center of segment i is (i + 0.5) * slice
                    // We want (center of target) + totalRotation = 0 (mod 2PI) ? No.
                    // Drawing rotates the CONTEXT. 
                    // If we rotate by R, segment at theta moves to theta + R.
                    // We want target segment (at theta_t) to be at 0 (Right pointer).
                    // So theta_t + R = 0 => R = -theta_t.
                    // Add multiple full rotations (e.g. 10 * 2PI).

                    const sliceAngle = (2 * Math.PI) / participants.length;
                    const targetAngleOfSegment = (targetIndexRef.current! * sliceAngle) + (sliceAngle / 2);

                    // Desired final rotation: R_final
                    // such that: (targetAngleOfSegment + R_final) % 2PI = 0
                    // => R_final = -targetAngleOfSegment + K * 2PI
                    // But canvas rotation is usually clockwise positive?
                    // ctx.rotate(R) -> rotates drawing clockwise.
                    // 0 is usually 3 o'clock.

                    // Let's add 5 full spins
                    const fullSpins = 10 * 2 * Math.PI;
                    const finalRotation = fullSpins + (2 * Math.PI - targetAngleOfSegment);

                    // Interpolate
                    rotationRef.current = finalRotation * ease;
                } else {
                    // Finished
                    isSpinningRef.current = false;
                    const winner = participants[targetIndexRef.current!];
                    setWinner(winner);
                    onComplete(winner);

                    // Reset for next time (but keep rotation so it doesn't jump)
                    // Actually we probably want to reset cleanly next time isRolling becomes true
                    targetIndexRef.current = null;
                }
            } else if (!isRolling) {
                // Idle rotation or just static
                // rotationRef.current += 0.002;
                // Reset if needed
                if (targetIndexRef.current === null) {
                    rotationRef.current += 0.005; // Idle spin
                }
            }

            drawWheel();
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
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="relative w-full h-[500px] flex items-center justify-center">
            <div className="absolute inset-0 bg-showman-black/50 rounded-full blur-3xl transform scale-90"></div>

            {/* Outer Glow Ring */}
            <div className="absolute w-[460px] h-[460px] rounded-full border-[10px] border-showman-gold/20 shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-pulse"></div>

            {/* Canvas Container */}
            <div className="relative w-[450px] h-[450px]">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                />
            </div>

            {/* Winner Overlay (Optional, enhances readability) */}
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
    );
}
