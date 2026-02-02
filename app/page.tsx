'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SlotMachine from '@/components/SlotMachine';
import WinnerCard from '@/components/WinnerCard';
import { Gift, Sparkles, CheckCircle, Trophy, Users, AlertCircle, Settings, Menu, X as CloseIcon, LayoutDashboard, ChevronRight, Package } from 'lucide-react';
import Link from 'next/link';

interface Participant {
  id: string;
  name: string;
  nim: string;
  is_winner: number;
}

interface Prize {
  id: string;
  prize_name: string;
  initial_quota: number;
  current_quota: number;
}

export default function Home() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
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

  useEffect(() => {
    loadPrizes();
    loadEligibleParticipants();
    loadStats();
  }, []);

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
        setPrizes(data.data);
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
        setEligibleParticipants(data.data);
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
    return null;
  };

  const handleRoll = async () => {
    if (!selectedPrizeId || quantity < 1) {
      showMessage('error', 'Please select a prize and valid quantity');
      return;
    }

    if (quantity > stats.eligibleParticipants) {
      showMessage('error', `Only ${stats.eligibleParticipants} eligible participants left`);
      return;
    }

    setMessage(null);
    setTentativeWinners([]);
    setShowResults(true);
    setIsSequenceActive(true);
    setIsRolling(true);
  };

  useEffect(() => {
    if (!isRolling && isSequenceActive && tentativeWinners.length < quantity) {
      const timer = setTimeout(() => {
        setIsRolling(true);
      }, 2000); // 2 second delay between winners
      return () => clearTimeout(timer);
    } else if (!isRolling && isSequenceActive && tentativeWinners.length === quantity) {
      setIsSequenceActive(false);
      showMessage('success', 'Draw complete! All winners revealed.');
    }
  }, [isRolling, isSequenceActive, tentativeWinners.length, quantity]);

  // Stabilize the complete callback to prevent unnecessary re-effects in SlotMachine
  const handleSlotMachineComplete = (landedParticipant: Participant) => {
    // GAMBLING LOGIC: Check if the person is eligible
    const isAlreadyTentative = tentativeWinners.some(w => w.id === landedParticipant.id);
    const isEligible = eligibleParticipants.some(p => p.id === landedParticipant.id);

    if (isEligible && !isAlreadyTentative) {
      // VALID WINNER
      setTentativeWinners(prev => [landedParticipant, ...prev]);
      setIsRolling(false);
    } else {
      // NOT ELIGIBLE - Stop rolling state first so it can be re-triggered
      setIsRolling(false);

      const reason = isAlreadyTentative ? "Already drawn" : "Previous winner";
      showMessage('error', `${landedParticipant.name} is ${reason}. Re-rolling...`);

      // Short delay before auto-retry
      setTimeout(() => {
        setIsRolling(true);
      }, 1500);
    }
  };

  const handleRemoveWinner = (id: string) => {
    setTentativeWinners((prev) => prev.filter((w) => w.id !== id));
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center relative">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative flex-1 flex flex-col justify-center">
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
          <div className="space-y-8 mb-10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-showman-gold flex items-center">
                <Gift className="w-6 h-6 mr-3 text-showman-red" />
                Select a Prize to Draw
              </h2>
              <div className="text-xs font-bold text-showman-gold-cream/40 uppercase tracking-widest bg-showman-gold/5 px-3 py-1 rounded-full border border-showman-gold/10">
                {prizes.length} Categories Available
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
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
                        if (selectedPrizeId === prize.id) {
                          // Collapse if already selected
                          setSelectedPrizeId('');
                        } else {
                          // Expand if not selected
                          setSelectedPrizeId(prize.id);
                          if (quantity > prize.current_quota) {
                            setQuantity(1);
                          }
                        }
                      }
                    }}
                    className={`relative cursor-pointer group rounded-3xl p-6 transition-all duration-500 border-2 overflow-hidden flex flex-col ${selectedPrizeId === prize.id
                      ? 'bg-gradient-to-br from-showman-red/30 via-showman-black to-showman-black border-showman-gold ring-8 ring-showman-gold/10 z-20 shadow-[0_20px_50px_rgba(245,158,11,0.2)]'
                      : 'bg-showman-black-light/80 backdrop-blur-sm border-showman-gold/20 hover:border-showman-gold/50 z-10'
                      }`}
                  >
                    {/* Background decorative elements */}
                    <div className={`absolute -right-6 -top-6 w-32 h-32 blur-[60px] rounded-full transition-opacity duration-700 ${selectedPrizeId === prize.id ? 'bg-showman-gold/30 opacity-100' : 'bg-showman-red/10 opacity-0 group-hover:opacity-100'
                      }`} />

                    <div className="relative z-10 w-full flex flex-col items-center">
                      <div className="w-full flex justify-between items-start mb-4">
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
                      <div className={`relative w-full aspect-square mb-6 flex items-center justify-center transition-all duration-700 ${selectedPrizeId === prize.id ? 'scale-110 rotate-1' : 'group-hover:scale-105'
                        }`}>
                        {getPrizeImage(prize.prize_name) ? (
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

                      <div className="w-full text-center">
                        <h3 className={`text-xl font-black leading-tight mb-2 transition-all duration-500 ${selectedPrizeId === prize.id ? 'text-white scale-110' : 'text-showman-gold-cream group-hover:text-white'
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
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black text-showman-gold-cream/60 uppercase tracking-[0.2em]">
                                Number of Winners
                              </label>
                              <button
                                onClick={() => setSelectedPrizeId('')}
                                className="text-showman-red/60 hover:text-showman-red p-1 transition-colors"
                              >
                                <CloseIcon className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min="1"
                                max={prize.current_quota}
                                value={quantity}
                                onChange={(e) => setQuantity(Math.min(prize.current_quota, Math.max(1, parseInt(e.target.value) || 1)))}
                                disabled={isRolling || isSequenceActive}
                                className="w-20 px-3 py-3 rounded-xl border-2 border-showman-gold/40 bg-showman-black text-center text-xl font-black text-white focus:border-showman-gold focus:ring-4 focus:ring-showman-gold/10 outline-none transition-all"
                              />
                              <div className="flex-1 flex flex-col">
                                <span className="text-white font-bold text-sm">Target</span>
                                <span className="text-showman-gold-cream/40 text-[10px] uppercase font-bold tracking-widest">Max: {prize.current_quota}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={handleRoll}
                            disabled={isRolling || isSequenceActive || prize.current_quota < 1}
                            className="w-full bg-gradient-to-r from-showman-red to-showman-red-dark hover:from-showman-red-dark hover:to-showman-red text-showman-gold font-black py-4 px-4 rounded-2xl shadow-lg border-2 border-white/10 hover:border-showman-gold/50 transition-all duration-300 flex items-center justify-center space-x-2 group/btn active:scale-95"
                          >
                            <Sparkles className="w-5 h-5 group-hover/btn:animate-pulse" />
                            <span className="tracking-widest uppercase text-xs">Roll Now</span>
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
          </div>
        )}

        {/* Drawing Overlay */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-10"
            >
              <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />

              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-6xl max-h-full flex flex-col items-center overflow-y-auto no-scrollbar"
              >
                {/* Sticky Header and Slot Machine Area */}
                <div className="sticky top-0 z-20 w-full flex flex-col items-center pt-2 pb-6 space-y-4 bg-black/40 backdrop-blur-md border-b border-showman-gold/10">
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

                  {/* Slot Machine in Overlay - Hide when complete */}
                  <AnimatePresence>
                    {isSequenceActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, scale: 0.95 }}
                        animate={{ height: 'auto', opacity: 1, scale: 1 }}
                        exit={{ height: 0, opacity: 0, scale: 0.95 }}
                        className="w-full max-w-5xl overflow-hidden"
                      >
                        <SlotMachine
                          participants={allParticipants}
                          isRolling={isRolling}
                          onComplete={handleSlotMachineComplete}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Results Section in Overlay */}
                <div className="w-full space-y-6 px-4 sm:px-10 py-10">
                  <div className="flex flex-col items-center justify-center gap-6 border-b border-showman-gold/20 pb-8">
                    <h3 className="text-2xl font-black text-showman-gold flex items-center uppercase tracking-widest">
                      <Trophy className="w-6 h-6 mr-3 text-showman-gold" />
                      {tentativeWinners.length === quantity ? 'Final Winners List' : `Winners (${tentativeWinners.length}/${quantity})`}
                    </h3>

                    <div className="flex flex-col items-center gap-4 w-full max-w-md">
                      {!isSequenceActive && tentativeWinners.length === quantity && (
                        <motion.button
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleConfirmWinners}
                          disabled={isConfirming}
                          className="w-full bg-gradient-to-r from-showman-gold via-showman-gold-light to-showman-gold hover:from-showman-gold-dark hover:to-showman-gold text-showman-black font-black py-4 px-10 rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_rgba(245,158,11,0.6)] transition-all flex items-center justify-center space-x-3 border-4 border-showman-gold/30 text-xl"
                        >
                          <CheckCircle className="w-8 h-8" />
                          <span>{isConfirming ? 'SAVING...' : 'COMPLETE & SAVE RESULTS'}</span>
                        </motion.button>
                      )}

                      {!isSequenceActive && (
                        <button
                          onClick={() => {
                            setShowResults(false);
                            setTentativeWinners([]);
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
