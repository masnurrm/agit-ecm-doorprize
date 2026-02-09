'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  ArrowLeft,
  RefreshCw,
  Trophy,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AddParticipantPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [npk, setNpk] = useState('');
  const [category, setCategory] = useState('Staff');
  const [employmentType, setEmploymentType] = useState('AGIT');

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          npk,
          category,
          employment_type: employmentType,
          checked_in: 1 // Automatically check-in upon manual registration
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Registration & Check-in successful!');
        // Clear form
        setName('');
        setNpk('');
        // Redirect back to check-in after a short delay
        setTimeout(() => {
          router.push('/check-in');
        }, 2000);
      } else {
        showMessage('error', data.error || 'Failed to register');
      }
    } catch (error) {
      showMessage('error', 'Failed to register participant');
    } finally {
      setIsLoading(false);
    }
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
          <Link href="/check-in" className="flex items-center space-x-3 group">
            <div className="bg-showman-gold/10 p-2 rounded-lg group-hover:bg-showman-gold/20 transition-all border border-showman-gold/30">
              <ArrowLeft className="w-5 h-5 text-showman-gold" />
            </div>
            <span className="font-bold text-showman-gold tracking-wider uppercase hidden sm:block">Back to Check-in</span>
          </Link>

          <div className="text-center flex flex-col items-center">
            <h1 className="text-xl sm:text-2xl font-black text-showman-gold tracking-[0.1em] uppercase">
              NEW REGISTRATION
            </h1>
            <p className="text-[10px] text-showman-gold-cream font-bold tracking-[0.2em] uppercase opacity-80">
              AGIT ECM 2026
            </p>
          </div>

          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl">
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

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-showman-black-light/90 backdrop-blur-md border-2 border-showman-gold/20 rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex items-center space-x-4 mb-8">
              <div className="bg-showman-red/10 p-3 rounded-2xl border border-showman-red/30">
                <UserPlus className="w-8 h-8 text-showman-red" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">Manual Registration</h2>
                <p className="text-showman-gold-cream/60 text-sm">Add participant who is not in the system</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-showman-gold-cream/60 mb-2 ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="w-full bg-showman-black border-2 border-showman-gold/20 rounded-xl py-4 px-5 text-white font-bold text-lg focus:border-showman-gold focus:ring-4 focus:ring-showman-gold/10 outline-none transition-all placeholder:text-white/10"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-showman-gold-cream/60 mb-2 ml-1">NPK</label>
                  <input
                    type="text"
                    required
                    value={npk}
                    onChange={(e) => setNpk(e.target.value)}
                    placeholder="Nomor Pokok Karyawan"
                    className="w-full bg-showman-black border-2 border-showman-gold/20 rounded-xl py-4 px-5 text-white font-bold text-lg focus:border-showman-gold focus:ring-4 focus:ring-showman-gold/10 outline-none transition-all placeholder:text-white/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-showman-gold-cream/60 mb-2 ml-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-showman-black border-2 border-showman-gold/20 rounded-xl py-4 px-5 text-white font-bold focus:border-showman-gold outline-none transition-all appearance-none"
                    >
                      <option value="Staff">Staff</option>
                      <option value="Dept Head Upper">Dept Head Upper</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-showman-gold-cream/60 mb-2 ml-1">Employment</label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      className="w-full bg-showman-black border-2 border-showman-gold/20 rounded-xl py-4 px-5 text-white font-bold focus:border-showman-gold outline-none transition-all appearance-none"
                    >
                      <option value="AGIT">AGIT</option>
                      <option value="Vendor">Vendor</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-showman-red to-showman-red-dark hover:from-showman-red-dark hover:to-showman-red text-showman-gold font-black py-5 rounded-2xl shadow-lg border-2 border-white/10 hover:border-showman-gold/50 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3 uppercase tracking-widest text-lg"
                >
                  {isLoading ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-6 h-6" />
                      <span>Register & Check-in</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
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
