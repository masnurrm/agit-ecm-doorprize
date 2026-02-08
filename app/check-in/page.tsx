'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck,
  Search,
  UserPlus,
  User,
  Contact,
  Briefcase,
  Building2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Trophy
} from 'lucide-react';
import Link from 'next/link';

export default function CheckIn() {
  const [nim, setNim] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [participant, setParticipant] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Add Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Staff');
  const [newType, setNewType] = useState('AGIT');

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nim.trim()) return;

    setIsLoading(true);
    setParticipant(null);
    setShowAddForm(false);
    setSearched(false);

    try {
      const response = await fetch(`/api/participants/search?nim=${encodeURIComponent(nim)}`);
      const data = await response.json();

      if (data.success) {
        setParticipant(data.data);
        setSearched(true);
        showMessage('success', 'Participant record found!');
      } else {
        setSearched(true);
        setShowAddForm(true);
        setNewName('');
        showMessage('error', 'NIM not found. Please register as a new participant.');
      }
    } catch (error) {
      showMessage('error', 'Failed to search participant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!participant) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/participants/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: participant.id })
      });
      const data = await response.json();
      if (data.success) {
        setParticipant({ ...participant, checked_in: 1 });
        showMessage('success', `${participant.name} checked in successfully!`);
      } else {
        showMessage('error', data.error || 'Failed to check in');
      }
    } catch (error) {
      showMessage('error', 'Failed to check in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          nim: nim,
          category: newCategory,
          employment_type: newType,
          checked_in: 1
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Registration & Check-in successful!');
        // Refresh by searching for the same NIM again to show full info
        await handleSearch();
      } else {
        showMessage('error', data.error || 'Failed to register');
      }
    } catch (error) {
      showMessage('error', 'Failed to register participant');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPage = () => {
    setNim('');
    setParticipant(null);
    setSearched(false);
    setShowAddForm(false);
    setMessage(null);
  };

  return (
    <div className="relative min-h-screen flex flex-col text-white selection:bg-showman-red selection:text-white bg-showman-black">
      {/* Background Layer */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <img
          src="/images/Background Doorprize-05.png"
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      </div>

      {/* Header */}
      <header className="bg-showman-black/80 backdrop-blur-md sticky top-0 z-30 shadow-2xl border-b-2 border-showman-gold/30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="bg-showman-red p-2 rounded-lg group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5 text-showman-gold" />
            </div>
            <span className="font-bold text-showman-gold tracking-wider uppercase hidden sm:block">Lucky Draw App</span>
          </Link>

          <div className="text-center flex flex-col items-center">
            <h1 className="text-xl sm:text-2xl font-black text-showman-gold tracking-[0.1em] uppercase">
              REGISTRATION CHECK
            </h1>
            <p className="text-[10px] text-showman-gold-cream font-bold tracking-[0.2em] uppercase opacity-80">
              AGIT ECM 2026
            </p>
          </div>

          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl">
          {/* Message Alert */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`mb-6 p-4 rounded-xl flex items-center space-x-3 shadow-xl ${message.type === 'success'
                  ? 'bg-showman-gold text-showman-black border-2 border-showman-gold-dark'
                  : 'bg-showman-red text-white border-2 border-showman-red-dark'
                  }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-bold">{message.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-showman-black-light/90 backdrop-blur-md border-2 rounded-3xl p-8 shadow-2xl transition-all duration-500 ${searched && participant ? 'border-showman-gold ring-8 ring-showman-gold/10' : 'border-showman-gold/20'
              }`}
          >
            {!searched || showAddForm ? (
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="text-center space-y-2 mb-8">
                  <div className="bg-showman-gold/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-showman-gold/30">
                    <Search className="w-8 h-8 text-showman-gold" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-wider">Validate Attendance</h2>
                  <p className="text-showman-gold-cream/60 text-sm">Enter NIM or NPK to check registration status</p>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Contact className="w-5 h-5 text-showman-gold/50" />
                  </div>
                  <input
                    type="text"
                    value={nim}
                    onChange={(e) => setNim(e.target.value)}
                    placeholder="Masukkan NIM / NPK"
                    className="w-full bg-showman-black border-2 border-showman-gold/20 rounded-2xl py-4 pl-12 pr-4 text-white font-bold text-lg focus:border-showman-gold focus:ring-4 focus:ring-showman-gold/10 outline-none transition-all placeholder:text-white/10"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !nim.trim()}
                  className="w-full bg-gradient-to-r from-showman-red to-showman-red-dark hover:from-showman-red-dark hover:to-showman-red text-showman-gold font-black py-4 rounded-2xl shadow-lg border-2 border-white/10 hover:border-showman-gold/50 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3 uppercase tracking-widest"
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Check NIM / NPK</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              // Found Participant View
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl transition-colors duration-500 ${participant.checked_in ? 'bg-green-500 shadow-green-500/30' : 'bg-showman-gold shadow-showman-gold/30'}`}>
                    {participant.checked_in ? <CheckCircle className="w-10 h-10 text-white" /> : <UserCheck className="w-10 h-10 text-showman-black" />}
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                    {participant.checked_in ? 'Check-in Complete!' : 'Participant Found'}
                  </h2>
                  <p className={`${participant.checked_in ? 'text-green-400' : 'text-showman-gold'} font-bold`}>
                    {participant.checked_in ? 'Ready for Lucky Draw' : 'Please confirm attendance'}
                  </p>
                </div>

                <div className="bg-black/40 rounded-2xl p-6 border border-showman-gold/20 space-y-4">
                  <div className="flex items-center space-x-4 border-b border-white/5 pb-4">
                    <div className="bg-white/5 p-3 rounded-xl">
                      <User className="w-5 h-5 text-showman-gold-cream" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-showman-gold-cream/40">Name</p>
                      <p className="text-xl font-black text-white">{participant.name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white/5 p-2 rounded-lg">
                        <Contact className="w-4 h-4 text-showman-gold-cream" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-showman-gold-cream/40">NIM / NPK</p>
                        <p className="text-sm font-bold text-white">{participant.nim}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="bg-white/5 p-2 rounded-lg">
                        <Briefcase className="w-4 h-4 text-showman-gold-cream" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-showman-gold-cream/40">Position</p>
                        <p className="text-sm font-bold text-white">{participant.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="bg-white/5 p-2 rounded-lg">
                        <Building2 className="w-4 h-4 text-showman-gold-cream" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-showman-gold-cream/40">Company</p>
                        <p className="text-sm font-bold text-white">{participant.employment_type}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-3">
                  {!participant.checked_in ? (
                    <button
                      onClick={handleCheckIn}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black py-5 rounded-2xl shadow-xl border-2 border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-3 uppercase tracking-widest text-lg"
                    >
                      {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (
                        <>
                          <CheckCircle className="w-6 h-6" />
                          <span>CONFIRM CHECK IN</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-green-500/10 border-2 border-green-500/30 rounded-2xl p-4 text-center mb-2">
                      <p className="text-green-400 font-bold uppercase tracking-widest text-sm">Attendance Recorded</p>
                    </div>
                  )}

                  <button
                    onClick={resetPage}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl border-2 border-white/10 transition-all flex items-center justify-center space-x-3 uppercase tracking-widest text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Next Check-in</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Add New Participant Form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-8 pt-8 border-t-2 border-showman-gold/10"
                >
                  <form onSubmit={handleAddParticipant} className="space-y-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <UserPlus className="w-6 h-6 text-showman-red" />
                      <h3 className="text-xl font-black text-white uppercase">New Employee Registration</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-showman-gold-cream/60 mb-2 ml-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Nama Lengkap"
                          className="w-full bg-showman-black border-2 border-showman-gold/20 rounded-xl py-3 px-4 text-white font-bold focus:border-showman-gold outline-none transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest text-showman-gold-cream/60 mb-2 ml-1">Department Category</label>
                          <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="w-full bg-showman-black border-2 border-showman-gold/20 rounded-xl py-3 px-4 text-white font-bold focus:border-showman-gold outline-none transition-all appearance-none"
                          >
                            <option value="Staff">Staff</option>
                            <option value="Dept Head Upper">Dept Head Upper</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest text-showman-gold-cream/60 mb-2 ml-1">Employment</label>
                          <select
                            value={newType}
                            onChange={(e) => setNewType(e.target.value)}
                            className="w-full bg-showman-black border-2 border-showman-gold/20 rounded-xl py-3 px-4 text-white font-bold focus:border-showman-gold outline-none transition-all appearance-none"
                          >
                            <option value="AGIT">AGIT</option>
                            <option value="Vendor">Vendor</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={resetPage}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all uppercase tracking-widest text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-[2] bg-showman-gold text-showman-black font-black py-4 rounded-xl shadow-lg border-2 border-showman-gold-dark transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs"
                      >
                        {isLoading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Register & Check-in'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Quick Links */}
          <div className="mt-8 flex justify-center space-x-6">
            <Link href="/" className="text-showman-gold/40 hover:text-showman-gold text-[10px] uppercase tracking-[0.2em] transition-colors flex items-center">
              <Trophy className="w-3 h-3 mr-2" />
              Main Lucky Draw
            </Link>
            <div className="w-px h-3 bg-white/10"></div>
            <Link href="/admin" className="text-showman-gold/40 hover:text-showman-gold text-[10px] uppercase tracking-[0.2em] transition-colors flex items-center">
              <Building2 className="w-3 h-3 mr-2" />
              Admin Panel
            </Link>
          </div>
        </div>
      </main>

      <footer className="p-6 border-t-2 border-showman-gold/10 bg-black/20">
        <p className="text-[10px] text-center text-showman-gold-cream/30 uppercase tracking-[0.2em]">
          AGIT ECM 2026 • Registration Management System
        </p>
      </footer>
    </div>
  );
}
