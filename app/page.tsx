'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SlotMachine from '@/components/SlotMachine';
import SpinningWheel from '@/components/SpinningWheel';
import WinnerCard from '@/components/WinnerCard';
import WinnerReveal from '@/components/WinnerReveal';
import { Gift, Sparkles, CheckCircle, Trophy, Users, AlertCircle, Settings, Menu, X as CloseIcon, LayoutDashboard, ChevronRight, Package } from 'lucide-react';
import Link from 'next/link';

interface Participant {
  id: string;
  name: string;
  npk: string;
  category: string;
  employment_type: string;
  is_winner: number;
  checked_in: number;
}

interface Prize {
  id: string;
  prize_name: string;
  initial_quota: number;
  current_quota: number;
  image_url?: string;
}

export default function Home() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>('');
  const [quantity, setQuantity] = useState<number | string>('');
  const [eligibleParticipants, setEligibleParticipants] = useState<Participant[]>([]);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [isSequenceActive, setIsSequenceActive] = useState(false);
  const [tentativeWinners, setTentativeWinners] = useState<Participant[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [stats, setStats] = useState({ totalParticipants: 0, eligibleParticipants: 0, totalPrizes: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [rollMode, setRollMode] = useState<'slot' | 'wheel'>('wheel');
  const [revealedWinner, setRevealedWinner] = useState<Participant | null>(null);
  const [pointedParticipant, setPointedParticipant] = useState<Participant | null>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sound Effects Refs
  const drumRollRef = useRef<HTMLAudioElement | null>(null);
  const yayRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio
    drumRollRef.current = new Audio('/sfx/drum roll.mp3');
    drumRollRef.current.loop = true;

    // Add timestamp to force reload of new file
    yayRef.current = new Audio(`/sfx/yay.mp3?v=${new Date().getTime()}`);

    loadPrizes();
    loadEligibleParticipants();
    loadStats();

    return () => {
      // Cleanup
      if (drumRollRef.current) {
        drumRollRef.current.pause();
        drumRollRef.current = null;
      }
      if (yayRef.current) {
        yayRef.current.pause();
        yayRef.current = null;
      }
    };
  }, []);

  // Handle Drum Roll Sound
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isRolling && !isPaused) {
      // Add 1 second buffer before playing
      timeoutId = setTimeout(() => {
        drumRollRef.current?.play().catch(e => console.log("Audio play failed", e));
      }, 1000);
    } else {
      if (drumRollRef.current) {
        drumRollRef.current.pause();
        drumRollRef.current.currentTime = 0;
      }
    }

    return () => clearTimeout(timeoutId);
  }, [isRolling, isPaused]);

  const loadStats = async () => {
    try {
      const [participantsRes, eligibleRes, prizesRes] = await Promise.all([
        fetch('/api/participants'),
        fetch('/api/participants/eligible'),
        fetch('/api/prizes')
      ]);

      const participantsData = await participantsRes.json();
      const eligibleData = await eligibleRes.json();
      const prizesData = await prizesRes.json();

      setStats({
        totalParticipants: participantsData.data?.length || 0,
        eligibleParticipants: eligibleData.data?.length || 0,
        totalPrizes: prizesData.data?.length || 0
      });

      if (participantsData.success) {
        setAllParticipants(participantsData.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPrizes = async () => {
    try {
      const response = await fetch('/api/prizes/available');
      const data = await response.json();
      if (data.success) {
        // Custom order mapping
        const prizeOrder = [
          'sepeda listrik',
          'magic com',
          'rice cooker',
          'setrika uap',
          'chopper',
          'blender',
          'smart watch',
          'smartwatch',
          'tws',
          'voucher belanja'
        ];

        const sortedPrizes = [...data.data].sort((a, b) => {
          const nameA = a.prize_name.toLowerCase();
          const nameB = b.prize_name.toLowerCase();

          const indexA = prizeOrder.findIndex(term => nameA.includes(term));
          const indexB = prizeOrder.findIndex(term => nameB.includes(term));

          // If both found, sort by index
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          // If only A found, it comes first
          if (indexA !== -1) return -1;
          // If only B found, it comes first
          if (indexB !== -1) return 1;
          // Otherwise keep original order
          return 0;
        });

        setPrizes(sortedPrizes);
        if (data.data.length > 0 && !selectedPrizeId) {
          // Cards start collapsed by default
          // setSelectedPrizeId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading prizes:', error);
    }
  };

  const loadEligibleParticipants = async () => {
    try {
      const response = await fetch('/api/participants/eligible');
      const data = await response.json();
      if (data.success) {
        // Randomize the arrangement of participants for the wheel/slot machine
        const shuffled = [...data.data].sort(() => Math.random() - 0.5);
        setEligibleParticipants(shuffled);
      }
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const getPrizeImage = (prizeName: string) => {
    const name = prizeName.toLowerCase();
    if (name.includes('chopper') || name.includes('blender')) return '/images/chopper.png';
    if (name.includes('ricecooker') || name.includes('rice cooker') || name.includes('magic com')) return '/images/ricecooker.png';
    if (name.includes('sepeda listrik')) return '/images/sepeda listrik.png';
    if (name.includes('setrika uap')) return '/images/setrika_uap.png';
    if (name.includes('smartwatch') || name.includes('smart watch')) return '/images/smartwatch.png';
    if (name.includes('tws')) return '/images/tws.png';
    if (name.includes('voucher')) return '/images/voucher.png';
    if (name.includes('grand prize') || name.includes('sepeda motor')) return '/images/sepeda_motor.png';
    if (name.includes('tablet samsung') || name.includes('tab samsung')) return '/images/tab_samsung.png';
    if (name.includes('treadmill')) return '/images/treadmill.png';
    if (name.includes('tv samsung')) return '/images/tv_samsung.png';
    return null;
  };

  const handleRoll = async () => {
    const rollQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity;

    if (!selectedPrizeId || !rollQuantity || rollQuantity < 1) {
      showMessage('error', 'Please select a prize and enter a valid quantity');
      return;
    }

    if (rollQuantity > stats.eligibleParticipants) {
      showMessage('error', `Only ${stats.eligibleParticipants} eligible participants left`);
      return;
    }

    setMessage(null);
    setTentativeWinners([]);
    setIsPaused(false);
    setShowResults(true);
    setIsSequenceActive(true);

    // Don't start spinning automatically - require manual wheel click
    setIsRolling(false);
  };

  useEffect(() => {
    const rollQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity;
    // DEBUG: Trace auto-roll triggers
    if (isSequenceActive && !isRolling && !revealedWinner && !showConfetti) {
      console.log(`[DRAW_DEBUG] Mode: ${rollMode}, Winners: ${tentativeWinners.length}/${rollQuantity}`);
    }

    // Wait for rolling to stop AND confetti to finish AND reveal to finish
    if (!isRolling && !showConfetti && !revealedWinner && isSequenceActive && tentativeWinners.length < (rollQuantity || 0)) {
      if (rollMode === 'slot') {
        const timer = setTimeout(() => {
          console.log("[DRAW_DEBUG] Auto-triggering next slot spin");
          setIsRolling(true);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        // Wheel mode: Do nothing, wait for manual click
        console.log("[DRAW_DEBUG] Wheel mode waiting for manual click");
      }
    } else if (!isRolling && !showConfetti && !revealedWinner && isSequenceActive && tentativeWinners.length === rollQuantity) {
      setIsSequenceActive(false);
      showMessage('success', 'Draw complete! All winners revealed.');
    }
  }, [isRolling, showConfetti, revealedWinner, isSequenceActive, tentativeWinners.length, quantity, rollMode]);

  // Stabilize the complete callback to prevent unnecessary re-effects in SlotMachine
  const handleSlotMachineComplete = (landedParticipant: Participant) => {
    // Stop drum roll immediately
    if (drumRollRef.current) {
      drumRollRef.current.pause();
      drumRollRef.current.currentTime = 0;
    }

    // GAMBLING LOGIC: Check if the person is eligible
    const isAlreadyTentative = tentativeWinners.some(w => w.id === landedParticipant.id);
    const isEligible = eligibleParticipants.some(p => p.id === landedParticipant.id);

    if (isEligible && !isAlreadyTentative) {
      // VALID WINNER - SHOW REVEAL FIRST
      setRevealedWinner(landedParticipant);
      setIsRolling(false);

      // Play Yay Sound
      if (yayRef.current) {
        yayRef.current.currentTime = 0;
        yayRef.current.play().catch(e => console.log("Audio play failed", e));

        // Stop after 2 seconds
        setTimeout(() => {
          if (yayRef.current) {
            yayRef.current.pause();
            yayRef.current.currentTime = 0;
          }
        }, 3000); // Extended for reveal duration
      }

      // Trigger Confetti
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
    } else {
      // NOT ELIGIBLE - Stop rolling state first so it can be re-triggered
      setIsRolling(false);

      const reason = isAlreadyTentative ? "Already drawn" : "Previous winner";
      showMessage('error', `${landedParticipant.name} is ${reason}. Re-rolling...`);

      // Short delay before auto-retry (only for slot mode)
      if (rollMode === 'slot') {
        setTimeout(() => {
          setIsRolling(true);
        }, 1500);
      } else {
        // For wheel mode, we just stop and wait for manual click
        setIsSequenceActive(true); // Keep the sequence active so they can click again
      }
    }
  };

  // Handle Reveal Timer
  useEffect(() => {
    if (revealedWinner) {
      const timer = setTimeout(() => {
        // Add to list and clear reveal
        setTentativeWinners(prev => [revealedWinner, ...prev]);
        setRevealedWinner(null);
      }, 3000); // 3 Seconds Reveal Duration

      return () => clearTimeout(timer);
    }
  }, [revealedWinner]);

  const handleRemoveWinner = (id: string) => {
    setTentativeWinners((prev) => prev.filter((w) => w.id !== id));
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleConfirmWinners = async () => {
    if (tentativeWinners.length === 0) {
      showMessage('error', 'No winners to confirm');
      return;
    }

    setIsConfirming(true);

    try {
      const response = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: tentativeWinners.map((w) => w.id),
          prizeId: selectedPrizeId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', data.message);

        // Reset state
        setTentativeWinners([]);
        setShowResults(false);
        setIsRolling(false);
        setIsPaused(false);

        // Reload data
        await loadPrizes();
        await loadEligibleParticipants();
        await loadStats();
      } else {
        showMessage('error', data.error);
      }
    } catch (error: any) {
      showMessage('error', 'Failed to confirm winners');
    } finally {
      setIsConfirming(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const selectedPrize = prizes.find((p) => p.id === selectedPrizeId);
  const activeEligibleParticipants = eligibleParticipants.filter(
    (p) => !tentativeWinners.some((tw) => tw.id === p.id)
  );

  return (
    <div className="relative min-h-screen flex flex-col text-white selection:bg-showman-red selection:text-white">
      {/* Background Layer */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-showman-black">
        <img
          src="/images/Background Doorprize-05.png"
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" /> {/* Subtle overlay for contrast */}
      </div>

      {/* Trumpet Overlay - Visible during rolling */}
      <AnimatePresence>
        {isRolling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] pointer-events-none"
          >
            {/* Top Left - Rotated 180 */}
            <div className="absolute top-0 left-0 w-16 h-16 md:w-24 md:h-24">
              <img src="/gif/thrumpet.gif" alt="Trumpet" className="w-full h-full object-contain transform rotate-180 -scale-x-100" />
            </div>
            {/* Top Right - Rotated 180 */}
            <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24">
              <img src="/gif/thrumpet.gif" alt="Trumpet" className="w-full h-full object-contain rotate-180" />
            </div>
            {/* Bottom Left - Rotated 180 */}
            <div className="absolute bottom-0 left-0 w-16 h-16 md:w-24 md:h-24">
              <img src="/gif/thrumpet.gif" alt="Trumpet" className="w-full h-full object-contain transform rotate-180 -scale-x-100 -scale-y-100" />
            </div>
            {/* Bottom Right - Rotated 180 */}
            <div className="absolute bottom-0 right-0 w-16 h-16 md:w-24 md:h-24">
              <img src="/gif/thrumpet.gif" alt="Trumpet" className="w-full h-full object-contain transform rotate-180 -scale-y-100" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confetti Overlay */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center"
          >
            <img
              src="/gif/confetti gif.gif"
              alt="Confetti"
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isSidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 left-0 h-full w-80 bg-showman-black-light border-r-2 border-showman-gold/30 z-50 shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b-2 border-showman-gold/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-showman-red p-2 rounded-lg">
              <Trophy className="w-5 h-5 text-showman-gold" />
            </div>
            <span className="font-bold text-showman-gold tracking-wider uppercase">Menu & Stats</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-showman-red/20 rounded-full transition-colors text-showman-gold-cream"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Navigation */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-showman-gold-cream/40 uppercase tracking-widest mb-4">Navigation</p>
            <Link
              href="/admin"
              className="flex items-center justify-between w-full bg-showman-red/10 hover:bg-showman-red/20 border-2 border-showman-red/30 p-4 rounded-xl transition-all group"
            >
              <div className="flex items-center space-x-3">
                <LayoutDashboard className="w-5 h-5 text-showman-red" />
                <span className="font-semibold text-white group-hover:text-showman-gold transition-colors">Admin Dashboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-showman-red group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Stats Section */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-showman-gold-cream/40 uppercase tracking-widest mb-4">Event Stats</p>

            <div className="bg-showman-black p-5 rounded-xl border border-showman-gold/10 group hover:border-showman-gold/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-showman-gold-light" />
                <span className="text-2xl font-black text-white tracking-tighter">{stats.totalParticipants}</span>
              </div>
              <p className="text-xs text-showman-gold-cream/60 font-medium">Total Participants</p>
            </div>

            <div className="bg-showman-black p-5 rounded-xl border border-showman-gold/10 group hover:border-showman-gold/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <Sparkles className="w-5 h-5 text-showman-gold" />
                <span className="text-2xl font-black text-showman-gold tracking-tighter">{stats.eligibleParticipants}</span>
              </div>
              <p className="text-xs text-showman-gold-cream/60 font-medium">Eligible to Win</p>
            </div>

            <div className="bg-showman-black p-5 rounded-xl border border-showman-gold/10 group hover:border-showman-gold/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <Gift className="w-5 h-5 text-showman-red" />
                <span className="text-2xl font-black text-showman-red tracking-tighter">{stats.totalPrizes}</span>
              </div>
              <p className="text-xs text-showman-gold-cream/60 font-medium">Available Prizes</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t-2 border-showman-gold/10 bg-black/20">
          <p className="text-[10px] text-center text-showman-gold-cream/30 uppercase tracking-[0.2em]">AGIT ECM 2026 • v1.0</p>
        </div>
      </motion.aside>

      {/* Header */}
      <header className="bg-showman-black/80 backdrop-blur-md sticky top-0 z-30 shadow-2xl border-b-2 border-showman-gold/30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center relative">
          {/* Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 bg-showman-black-light hover:bg-showman-red/20 border-2 border-showman-gold/30 rounded-xl transition-all hover:scale-105 active:scale-95 group"
          >
            <Menu className="w-6 h-6 text-showman-gold group-hover:text-showman-gold-light transition-colors" />
          </button>

          {/* Centered Title */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center flex flex-col items-center">
            <div className="flex items-center space-x-3 mb-0.5">
              <div className="hidden sm:block h-[2px] w-8 bg-gradient-to-l from-showman-gold to-transparent"></div>
              <h1 className="text-2xl sm:text-3xl font-black text-showman-gold tracking-[0.1em] uppercase drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                AGIT ECM 2026 DOORPRIZE
              </h1>
              <div className="hidden sm:block h-[2px] w-8 bg-gradient-to-r from-showman-gold to-transparent"></div>
            </div>
            <p className="text-[10px] sm:text-xs text-showman-gold-cream font-bold tracking-[0.3em] uppercase opacity-80">
              Xcelerate Growth, Power the Future
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 relative flex-1 flex flex-col justify-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-showman-gold/20 to-transparent"></div>
        {/* Message Alert */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-xl flex items-center space-x-3 ${message.type === 'success'
                ? 'bg-showman-gold text-showman-black border-2 border-showman-gold-dark'
                : 'bg-showman-red text-white border-2 border-showman-red-dark'
                }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prize Selection Grid */}
        {!showResults && (

          <div className="flex flex-wrap justify-center gap-8 items-start">
            <AnimatePresence mode="popLayout">
              {prizes.map((prize) => (
                <motion.div
                  key={prize.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={selectedPrizeId !== prize.id ? { scale: 1.02, translateY: -5 } : {}}
                  onClick={() => {
                    if (!isRolling && !isSequenceActive) {
                      const rollQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity;
                      if (selectedPrizeId === prize.id) {
                        // Collapse if already selected
                        setSelectedPrizeId('');
                      } else {
                        // Expand if not selected
                        setSelectedPrizeId(prize.id);
                        if (rollQuantity && rollQuantity > prize.current_quota) {
                          setQuantity('');
                        }
                      }
                    }
                  }}
                  className={`relative cursor-pointer group rounded-3xl p-6 transition-all duration-500 border-2 overflow-hidden flex flex-col w-full sm:w-[380px] ${selectedPrizeId === prize.id
                    ? 'min-h-[480px] bg-gradient-to-br from-showman-red/30 via-showman-black to-showman-black border-showman-gold ring-8 ring-showman-gold/10 z-20 shadow-[0_20px_50px_rgba(245,158,11,0.2)]'
                    : 'min-h-[340px] bg-showman-black-light/80 backdrop-blur-sm border-showman-gold/20 hover:border-showman-gold/50 z-10'
                    }`}
                >
                  {/* Background decorative elements */}
                  <div className={`absolute -right-6 -top-6 w-32 h-32 blur-[60px] rounded-full transition-opacity duration-700 ${selectedPrizeId === prize.id ? 'bg-showman-gold/30 opacity-100' : 'bg-showman-red/10 opacity-0 group-hover:opacity-100'
                    }`} />

                  <div className="relative z-10 w-full flex-1 flex flex-col items-center">
                    <div className="w-full flex justify-between items-start mb-4 h-6">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border-2 transition-all duration-500 ${prize.current_quota > 0
                          ? (selectedPrizeId === prize.id ? 'border-showman-gold text-showman-gold bg-showman-gold/10' : 'border-showman-gold/30 text-showman-gold-cream/60')
                          : 'border-showman-red/50 text-showman-red bg-showman-red/5'
                          }`}>
                          {prize.current_quota > 0 ? `Stock: ${prize.current_quota}` : 'Out of Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Prize Image Container */}
                    <div className={`relative w-full aspect-square mb-4 flex items-center justify-center transition-all duration-700 ${selectedPrizeId === prize.id ? 'scale-110 rotate-1' : 'group-hover:scale-105'
                      } ${selectedPrizeId === prize.id ? 'max-h-[200px]' : 'max-h-[160px]'}`}>
                      {prize.image_url ? (
                        <motion.img
                          src={prize.image_url}
                          alt={prize.prize_name}
                          className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                        />
                      ) : getPrizeImage(prize.prize_name) ? (
                        <motion.img
                          src={getPrizeImage(prize.prize_name)!}
                          alt={prize.prize_name}
                          className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                        />
                      ) : (
                        <div className={`p-6 rounded-3xl transition-all duration-500 ${selectedPrizeId === prize.id
                          ? 'bg-showman-gold text-showman-black scale-110 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                          : 'bg-showman-gold/10 text-showman-gold group-hover:bg-showman-gold/20'
                          }`}>
                          <Package className="w-12 h-12" />
                        </div>
                      )}

                      {/* Glow effect for image */}
                      <div className={`absolute inset-0 bg-showman-gold/20 blur-3xl rounded-full transition-opacity duration-700 ${selectedPrizeId === prize.id ? 'opacity-100' : 'opacity-0'
                        }`} />
                    </div>

                    <div className="w-full text-center flex-1 flex flex-col justify-center">
                      <h3 className={`text-lg font-black leading-tight mb-2 transition-all duration-500 ${selectedPrizeId === prize.id ? 'text-white scale-110' : 'text-showman-gold-cream group-hover:text-white'
                        }`}>
                        {prize.prize_name}
                      </h3>
                      <div className="h-1 w-12 bg-gradient-to-r from-transparent via-showman-red to-transparent rounded-full mx-auto mb-2"></div>
                    </div>
                  </div>

                  {/* Inline Controls - Only visible when selected */}
                  <AnimatePresence>
                    {selectedPrizeId === prize.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="relative z-10 w-full space-y-5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="h-px w-full bg-gradient-to-r from-showman-gold/30 via-showman-gold/10 to-transparent" />

                        <div className="space-y-3">
                          <div className="flex justify-end">
                            <button
                              onClick={() => setSelectedPrizeId('')}
                              className="text-showman-red/60 hover:text-showman-red p-1 transition-colors"
                            >
                              <CloseIcon className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="w-full">
                            <input
                              type="number"
                              min="1"
                              max={prize.current_quota}
                              value={quantity}
                              placeholder="Enter amount of winners"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  setQuantity('');
                                } else {
                                  setQuantity(Math.min(prize.current_quota, Math.max(1, parseInt(val) || 1)));
                                }
                              }}
                              disabled={isRolling || isSequenceActive}
                              className="w-full px-4 py-3 rounded-xl border-2 border-showman-gold/40 bg-showman-black text-center text-sm font-bold text-white placeholder:text-showman-gold-cream/20 focus:border-showman-gold focus:ring-4 focus:ring-showman-gold/10 outline-none transition-all"
                            />
                          </div>

                          {/* Roll Mode Toggle - Hidden but keeping the code */}
                          <div className="hidden">
                            <div className="flex bg-showman-black border-2 border-showman-gold/20 rounded-xl p-1 relative">
                              <div
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-showman-gold rounded-lg transition-all duration-300 ${rollMode === 'slot' ? 'left-1' : 'left-[calc(50%+4px)]'}`}
                              ></div>
                              <button
                                onClick={() => setRollMode('slot')}
                                className={`flex-1 relative z-10 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${rollMode === 'slot' ? 'text-showman-black' : 'text-showman-gold-cream/60 hover:text-showman-gold'}`}
                              >
                                Slot Machine
                              </button>
                              <button
                                onClick={() => setRollMode('wheel')}
                                className={`flex-1 relative z-10 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${rollMode === 'wheel' ? 'text-showman-black' : 'text-showman-gold-cream/60 hover:text-showman-gold'}`}
                              >
                                Spinning Wheel
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleRoll}
                          disabled={isRolling || isSequenceActive || prize.current_quota < 1}
                          className="w-full bg-gradient-to-r from-showman-red to-showman-red-dark hover:from-showman-red-dark hover:to-showman-red text-showman-gold font-black py-4 px-4 rounded-2xl shadow-lg border-2 border-white/10 hover:border-showman-gold/50 transition-all duration-300 flex items-center justify-center space-x-2 group/btn active:scale-95"
                        >
                          <Sparkles className="w-5 h-5 group-hover/btn:animate-pulse" />
                          <span className="tracking-widest uppercase text-xs">Draw Now!</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!selectedPrizeId && (
                    <div className="mt-auto pt-4 flex items-center text-showman-gold-cream/30 group-hover:text-showman-gold/60 text-[10px] font-black uppercase tracking-[0.2em] transition-colors">
                      Click to Configure <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Drawing Overlay */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-hidden"
            >
              <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />

              {/* Background Image Layer in Overlay */}
              <div className={`absolute inset-0 ${(isRolling || isPaused) ? 'opacity-50' : 'opacity-100'} pointer-events-none transition-opacity duration-500`}>
                <img
                  src="/images/Background Doorprize-05.png"
                  alt="Background"
                  className="w-full h-full object-cover"
                />
              </div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-6xl max-h-full flex flex-col items-center overflow-y-auto no-scrollbar"
              >
                {/* Sticky Header and Slot Machine Area */}
                <div className="sticky top-0 z-20 w-full flex flex-col items-center pt-2 pb-2 space-y-2 bg-black/40 backdrop-blur-md border-b border-showman-gold/10">
                  {/* Sticky Winners Counter (Top-Left) - Only during active roll sequence */}
                  {isSequenceActive && (
                    <div className="absolute left-4 top-4 flex items-center bg-showman-gold/10 backdrop-blur-md border border-showman-gold/30 rounded-full px-3 py-1.5 z-30">
                      <Trophy className="w-4 h-4 mr-2 text-showman-gold animate-pulse" />
                      <span className="text-showman-gold font-black text-xs uppercase tracking-widest">
                        Winners: {tentativeWinners.length} / {quantity}
                      </span>
                    </div>
                  )}
                  {/* Overlay Header */}
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl sm:text-4xl font-black text-showman-gold uppercase tracking-[0.2em] drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                      {isSequenceActive
                        ? 'The Show is On!'
                        : (tentativeWinners.length === quantity ? 'Congratulations to All Winners!' : 'Witness the Winners')}
                    </h2>
                    <div className="h-1 w-32 bg-gradient-to-r from-transparent via-showman-red to-transparent mx-auto"></div>
                    {selectedPrize && (
                      <p className="text-showman-gold-cream/80 font-bold uppercase tracking-widest text-sm">
                        Drawing for: <span className="text-showman-gold">{selectedPrize.prize_name}</span>
                      </p>
                    )}
                  </div>

                  {/* Machine Section */}
                  <div className={`w-full ${rollMode === 'wheel' ? 'max-w-7xl' : 'max-w-5xl'}`}>
                    {rollMode === 'slot' ? (
                      /* SLOT MACHINE VIEW (Centered) */
                      <div className="w-full flex flex-col items-center">
                        <AnimatePresence>
                          {isSequenceActive && (
                            <motion.div
                              initial={{ height: 0, opacity: 0, scale: 0.95 }}
                              animate={{ height: 'auto', opacity: 1, scale: 1 }}
                              exit={{ height: 0, opacity: 0, scale: 0.95 }}
                              className="w-full overflows-hidden"
                            >
                              <SlotMachine
                                participants={activeEligibleParticipants}
                                isRolling={isRolling}
                                isPaused={isPaused}
                                onComplete={handleSlotMachineComplete}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      /* SPINNING WHEEL 3-SECTION VIEW (Split) */
                      <AnimatePresence>
                        {isSequenceActive && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start min-h-[500px]"
                          >
                            {/* LEFT SECTION: Spinning Wheel */}
                            <div className="w-full flex justify-center">
                              <SpinningWheel
                                participants={activeEligibleParticipants}
                                prizeName={selectedPrize?.prize_name}
                                isRolling={isRolling}
                                isPaused={isPaused}
                                onComplete={handleSlotMachineComplete}
                                onPointerTick={(p) => setPointedParticipant(p)}
                                onStart={() => setIsRolling(true)}
                                onTogglePause={handleTogglePause}
                                zoomCanvasRef={zoomCanvasRef}
                              />
                            </div>

                            {/* RIGHT SECTION: Zoom + Winners */}
                            <div className="flex flex-col h-full lg:h-[500px] space-y-6">
                              {/* Zoom Preview (Theatrical Viewfinder) */}
                              <div className="bg-showman-black/60 border-2 border-showman-gold/30 rounded-3xl backdrop-blur-md flex flex-col flex-1 relative overflow-hidden group shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                                {/* Viewfinder Frame and Glass Effects */}
                                <div className="absolute inset-0 pointer-events-none border-[12px] border-showman-black/40 rounded-3xl z-10"></div>
                                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] z-10"></div>
                                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/5 via-transparent to-black/20 z-10"></div>

                                <div className="absolute top-4 left-6 z-20">
                                  <p className="text-showman-gold/40 text-[10px] font-black uppercase tracking-[0.4em] flex items-center">
                                    <span className="w-2 h-2 bg-showman-red rounded-full mr-2 animate-pulse"></span>
                                    Live View
                                  </p>
                                </div>

                                {/* ZOOM CANVAS */}
                                <div className="flex-1 w-full bg-[#050505] relative cursor-none">
                                  <canvas
                                    ref={zoomCanvasRef}
                                    className="w-full h-full opacity-90"
                                  />

                                  {/* Static Masking Overlays (Fading effect top/bottom) */}
                                  <div className="absolute top-0 left-0 w-full h-[35%] bg-gradient-to-b from-[#050505] to-transparent z-5"></div>
                                  <div className="absolute bottom-0 left-0 w-full h-[35%] bg-gradient-to-t from-[#050505] to-transparent z-5"></div>

                                  {/* Center Highlighting Bar (Slot Focus) */}
                                  <div className="absolute top-1/2 left-0 w-full h-40 -translate-y-1/2 bg-showman-gold/5 border-y border-showman-gold/10 pointer-events-none z-5"></div>
                                </div>
                              </div>

                              {/* Winners History */}
                              <div className="flex-[1.5] flex flex-col min-h-0 bg-showman-black/40 border border-showman-gold/10 rounded-3xl p-4 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-3 px-2">
                                  <h4 className="text-showman-gold font-black uppercase tracking-widest text-[10px] flex items-center">
                                    <Trophy className="w-3 h-3 mr-2" />
                                    Recent Winners
                                  </h4>
                                  <span className="text-showman-gold/40 text-[10px] font-bold">{tentativeWinners.length} / {quantity}</span>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                                  <AnimatePresence mode="popLayout">
                                    {tentativeWinners.length > 0 ? (
                                      tentativeWinners.map((winner) => (
                                        <motion.div
                                          key={winner.id}
                                          layout
                                          initial={{ opacity: 0, x: 20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0, scale: 0.8 }}
                                        >
                                          <div className="bg-showman-gold/5 border border-showman-gold/10 p-2.5 rounded-xl flex items-center justify-between group hover:bg-showman-gold/10 transition-all">
                                            <div className="flex-1 min-w-0 pr-2">
                                              <p className="text-showman-gold-cream font-bold text-sm truncate flex items-center gap-4">
                                                <span className="whitespace-nowrap">{winner.name}</span>
                                                <span className="text-white/20 font-light">|</span>
                                                <span className="text-showman-gold/90 font-mono font-bold tracking-wider">{winner.nim}</span>
                                              </p>
                                            </div>
                                            <button
                                              onClick={() => setTentativeWinners(prev => prev.filter(w => w.id !== winner.id))}
                                              className="p-1 px-2 text-white/20 hover:text-showman-red transition-colors opacity-0 group-hover:opacity-100 text-[10px] font-black tracking-tighter"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        </motion.div>
                                      ))
                                    ) : (
                                      <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl py-10 opacity-20">
                                        <Sparkles className="w-6 h-6 mb-2" />
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-center">Awaiting Results</p>
                                      </div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                </div>

                {/* Winner Reveal Popup */}
                <AnimatePresence>
                  {revealedWinner && (
                    <WinnerReveal
                      winner={revealedWinner}
                      prizeName={selectedPrize?.prize_name}
                      prizeImage={selectedPrize?.image_url || getPrizeImage(selectedPrize?.prize_name || '') || undefined}
                    />
                  )}
                </AnimatePresence>

                {/* Results Section (Always for Slot, Or after Wheel sequence ends) */}
                {(rollMode === 'slot' || !isSequenceActive) && (
                  <div className="w-full space-y-2 px-4 sm:px-10 py-2">
                    <div className="flex flex-col items-center justify-center gap-6 border-b border-showman-gold/20 pb-4">
                      {!isSequenceActive && (
                        <h3 className="text-xl font-black text-showman-gold flex items-center uppercase tracking-widest">
                          {tentativeWinners.length === quantity ? 'Final Winners List' : 'Current Winners'}
                        </h3>
                      )}

                      <div className="flex flex-col items-center gap-4 w-full max-w-2xl px-4">
                        {!isSequenceActive && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                            {/* SAVE BUTTON - Always show if there are some winners */}
                            {tentativeWinners.length > 0 && (
                              <motion.button
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleConfirmWinners}
                                disabled={isConfirming}
                                className={`bg-gradient-to-r from-showman-gold via-showman-gold-light to-showman-gold hover:from-showman-gold-dark hover:to-showman-gold text-showman-black font-black py-4 px-6 rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_rgba(245,158,11,0.6)] transition-all flex items-center justify-center space-x-3 border-4 border-showman-gold/30 text-lg ${tentativeWinners.length === (typeof quantity === 'string' ? parseInt(quantity) : quantity) ? 'sm:col-span-2' : ''}`}
                              >
                                <CheckCircle className="w-6 h-6" />
                                <span>{isConfirming ? 'SAVING...' : 'SAVE WINNERS'}</span>
                              </motion.button>
                            )}

                            {/* TAMBAH ROLL BUTTON - Show if winners removed and still have quota */}
                            {tentativeWinners.length < (typeof quantity === 'string' ? parseInt(quantity) : quantity) && (
                              <motion.button
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setMessage(null);
                                  setIsRolling(true);
                                  setIsSequenceActive(true);
                                }}
                                disabled={isConfirming || activeEligibleParticipants.length === 0}
                                className="bg-gradient-to-r from-showman-red to-showman-red-dark hover:from-showman-red-dark hover:to-showman-red text-showman-gold font-black py-4 px-6 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.4)] hover:shadow-[0_0_60px_rgba(239,68,68,0.6)] transition-all flex items-center justify-center space-x-3 border-4 border-white/10 text-lg"
                              >
                                <Sparkles className="w-6 h-6" />
                                <span>Roll Lagi</span>
                              </motion.button>
                            )}
                          </div>
                        )}

                        {/* Winners Count - Centered when sequence complete */}
                        {!isSequenceActive && tentativeWinners.length > 0 && (
                          <div className="flex items-center space-x-2 text-showman-gold/60">
                            <Trophy className="w-4 h-4" />
                            <span className="text-sm font-black uppercase tracking-[0.2em]">
                              Winners: {tentativeWinners.length} / {quantity}
                            </span>
                          </div>
                        )}

                        {!isSequenceActive && (
                          <button
                            onClick={() => {
                              setShowResults(false);
                              setTentativeWinners([]);
                              setIsPaused(false);
                            }}
                            className="text-white/40 hover:text-white/80 transition-all text-sm font-bold uppercase tracking-widest underline underline-offset-4"
                          >
                            Cancel and Close
                          </button>
                        )}
                      </div>
                    </div>

                    {tentativeWinners.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
                        <AnimatePresence mode="popLayout">
                          {tentativeWinners.map((winner, index) => (
                            <WinnerCard
                              key={winner.id}
                              participant={winner}
                              index={index}
                              onRemove={handleRemoveWinner}
                              disabled={isRolling || isSequenceActive}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      isSequenceActive && (
                        <div className="py-20 text-center">
                          <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-showman-gold-cream/40 uppercase tracking-[0.3em] font-bold italic"
                          >
                            The curtain rises...
                          </motion.div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )
          }
        </AnimatePresence >
      </main >
    </div >
  );
}
