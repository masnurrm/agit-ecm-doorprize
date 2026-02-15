'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Gift, Trophy, ArrowLeft, RefreshCw, Plus, Edit, Trash2, X, Save, FileUp, FileDown } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

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

interface Winner {
  id: string;
  name: string;
  nim: string;
  category: string;
  employment_type: string;
  prize_name: string;
  won_at: string;
}

export default function AdminPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [activeTab, setActiveTab] = useState<'participants' | 'prizes' | 'winners'>('participants');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'participant' | 'prize' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Nama Karyawan": "Contoh Nama", "NPK": "12345678" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Import_Peserta.xlsx");
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const data = new Uint8Array(arrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        const participantsToImport = jsonData
          .map((row: any) => ({
            name: (row['Nama Karyawan'] || row['name'] || row['Nama'])?.toString().trim(),
            npk: (row['NPK'] || row['NIM'] || row['nim'])?.toString().trim(),
            category: (row['Category'] || row['Kategori'])?.toString().trim() || 'Staff',
            employment_type: (row['Employment'] || row['Status'])?.toString().trim() || 'AGIT'
          }))
          .filter((p: any) => p.name && p.npk);

        if (participantsToImport.length === 0) {
          alert('Data tidak ditemukan. Pastikan header Excel adalah "Nama Karyawan" dan "NPK".');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/participants/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participants: participantsToImport }),
        });

        const result = await res.json();
        if (result.success) {
          alert(`Berhasil mengimpor ${result.data.count} peserta!`);
          loadData();
        } else {
          alert(result.error);
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('Gagal membaca file Excel.');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportParticipants = () => {
    const exportData = participants.map(p => ({
      "Nama": p.name,
      "NPK": p.nim,
      "Status": p.is_winner ? "Winner" : "Eligible",
      "Employment": p.employment_type,
      "Check-in": p.checked_in ? "Checked In" : "Not Checked In",
      "Category": p.category
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participants");
    XLSX.writeFile(wb, "Data_Peserta_Luckydraw.xlsx");
  };

  const handleExportWinners = () => {
    const exportData = winners.map(winner => ({
      "Nama": winner.name,
      "NPK": winner.nim,
      "Kategori": winner.category,
      "Status Kepegawaian": winner.employment_type,
      "Hadiah": winner.prize_name,
      "Tanggal undian": new Date(winner.won_at).toLocaleString('id-ID')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Winners");
    XLSX.writeFile(wb, "Data_Pemenang_Luckydraw.xlsx");
  };

  const handleExportPrizes = () => {
    const exportData = prizes.map(p => ({
      "Nama Hadiah": p.prize_name,
      "Jumlah Diberikan": p.initial_quota - p.current_quota,
      "Sisa Kuota": p.current_quota,
      "Total Kuota": p.initial_quota
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prizes");
    XLSX.writeFile(wb, "Data_Hadiah_Luckydraw.xlsx");
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [participantsRes, prizesRes, winnersRes] = await Promise.all([
        fetch('/api/participants'),
        fetch('/api/prizes'),
        fetch('/api/winners')
      ]);

      const participantsData = await participantsRes.json();
      const prizesData = await prizesRes.json();
      const winnersData = await winnersRes.json();

      if (participantsData.success) setParticipants(participantsData.data);
      if (prizesData.success) setPrizes(prizesData.data);
      if (winnersData.success) setWinners(winnersData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  const openModal = (type: 'participant' | 'prize', item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    if (item) {
      if (type === 'participant') {
        setFormData({
          name: item.name,
          npk: item.npk,
          category: item.category || 'Staff',
          employment_type: item.employment_type || 'AGIT',
          is_winner: item.is_winner,
          checked_in: item.checked_in || 0
        });
      } else {
        setFormData({
          prizeName: item.prize_name,
          quota: item.initial_quota,
          currentQuota: item.current_quota,
          imageUrl: item.image_url
        });
        setPreviewUrl(item.image_url || null);
      }
    } else {
      setFormData(type === 'participant'
        ? { name: '', nim: '', category: 'Staff', employment_type: 'AGIT', is_winner: 0, checked_in: 0 }
        : { prizeName: '', quota: 1, currentQuota: 1 }
      );
      setPreviewUrl(null);
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentItems = activeTab === 'participants' ? participants
      : activeTab === 'prizes' ? prizes
        : winners;

    if (selectedIds.length === currentItems.length && currentItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentItems.map(item => item.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected items?`)) return;

    setLoading(true);
    try {
      const endpoint = activeTab === 'participants' ? '/api/participants'
        : activeTab === 'prizes' ? '/api/prizes'
          : '/api/winners';

      const res = await fetch(`${endpoint}?id=${selectedIds.join(',')}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        setSelectedIds([]);
        loadData();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error bulk deleting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: 'participant' | 'prize' | 'winner', id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const endpoint = type === 'participant' ? '/api/participants'
        : type === 'prize' ? '/api/prizes'
          : '/api/winners';

      const res = await fetch(`${endpoint}?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalImageUrl = formData.imageUrl;

      // Upload image if selected
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('file', imageFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });

        const uploadResult = await uploadRes.json();
        if (uploadResult.success) {
          finalImageUrl = uploadResult.url;
        } else {
          alert('Failed to upload image: ' + uploadResult.error);
          setLoading(false);
          return;
        }
      }

      const endpoint = modalType === 'participant' ? '/api/participants' : '/api/prizes';
      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem ? { ...formData, imageUrl: finalImageUrl, id: editingItem.id } : { ...formData, imageUrl: finalImageUrl };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        loadData();
        closeModal();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-showman-black via-showman-black-light to-showman-black-lighter">
      {/* Header */}
      <header className="bg-showman-black shadow-lg border-b-2 border-showman-gold sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-showman-red to-showman-red-dark rounded-xl p-3 shadow-lg shadow-showman-gold/20">
                <Trophy className="w-8 h-8 text-showman-gold" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-showman-gold">Admin Dashboard</h1>
                <p className="text-sm text-showman-gold-cream mt-1">Manage participants, prizes, and winners</p>
              </div>
            </div>

            <Link
              href="/"
              className="flex items-center space-x-2 bg-showman-gold hover:bg-showman-gold-dark text-showman-black border-2 border-showman-gold-dark font-semibold py-2 px-4 rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Draw</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-showman-black-light rounded-2xl shadow-2xl border-2 border-showman-gold/40 overflow-hidden">
          <div className="flex border-b-2 border-showman-gold/30">
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-4 px-6 font-semibold transition-all flex items-center justify-center space-x-2 ${activeTab === 'participants'
                ? 'bg-showman-gold text-showman-black border-b-4 border-showman-gold-dark'
                : 'text-showman-gold-cream hover:text-showman-gold hover:bg-showman-black-lighter'
                }`}
            >
              <Users className="w-5 h-5" />
              <span>Participants ({participants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('prizes')}
              className={`flex-1 py-4 px-6 font-semibold transition-all flex items-center justify-center space-x-2 ${activeTab === 'prizes'
                ? 'bg-showman-gold text-showman-black border-b-4 border-showman-gold-dark'
                : 'text-showman-gold-cream hover:text-showman-gold hover:bg-showman-black-lighter'
                }`}
            >
              <Gift className="w-5 h-5" />
              <span>Prizes ({prizes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('winners')}
              className={`flex-1 py-4 px-6 font-semibold transition-all flex items-center justify-center space-x-2 ${activeTab === 'winners'
                ? 'bg-showman-gold text-showman-black border-b-4 border-showman-gold-dark'
                : 'text-showman-gold-cream hover:text-showman-gold hover:bg-showman-black-lighter'
                }`}
            >
              <Trophy className="w-5 h-5" />
              <span>Winners ({winners.length})</span>
            </button>
          </div>

          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-showman-gold">
                {activeTab === 'participants' && 'All Participants'}
                {activeTab === 'prizes' && 'All Prizes'}
                {activeTab === 'winners' && 'Winner History'}
              </h2>

              <div className="flex space-x-3">
                <button
                  onClick={loadData}
                  className="flex items-center space-x-2 bg-showman-black-lighter hover:bg-showman-black text-showman-gold-cream border border-showman-gold/30 font-medium py-2 px-4 rounded-lg transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>

                {selectedIds.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={loading}
                    className="flex items-center space-x-2 bg-showman-red hover:bg-showman-red-dark text-white font-medium py-2 px-4 rounded-lg transition-all shadow-md border border-white/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Selected ({selectedIds.length})</span>
                  </button>
                )}

                {activeTab === 'participants' && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelImport}
                    />
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center space-x-2 bg-showman-black-lighter hover:bg-showman-black text-showman-gold-cream border border-showman-gold/30 font-medium py-2 px-4 rounded-lg transition-all"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Template</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-showman-black-lighter hover:bg-showman-black text-showman-gold border border-showman-gold/30 font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                    >
                      <FileUp className="w-4 h-4" />
                      <span>Import Excel</span>
                    </button>
                    <button
                      onClick={handleExportParticipants}
                      disabled={participants.length === 0}
                      className="flex items-center space-x-2 bg-showman-gold hover:bg-showman-gold-dark text-showman-black border border-showman-gold-dark font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Export Participants</span>
                    </button>
                    <button
                      onClick={() => openModal('participant')}
                      className="flex items-center space-x-2 bg-showman-red hover:bg-showman-red-dark text-showman-gold font-medium py-2 px-4 rounded-lg transition-all shadow-md border border-showman-gold/50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Participant</span>
                    </button>
                  </>
                )}

                {activeTab === 'prizes' && (
                  <>
                    <button
                      onClick={handleExportPrizes}
                      disabled={prizes.length === 0}
                      className="flex items-center space-x-2 bg-showman-gold hover:bg-showman-gold-dark text-showman-black border border-showman-gold-dark font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Export Prizes</span>
                    </button>
                    <button
                      onClick={() => openModal('prize')}
                      className="flex items-center space-x-2 bg-showman-red hover:bg-showman-red-dark text-showman-gold font-medium py-2 px-4 rounded-lg transition-all shadow-md border border-showman-gold/50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Prize</span>
                    </button>
                  </>
                )}
                {activeTab === 'winners' && (
                  <button
                    onClick={handleExportWinners}
                    disabled={winners.length === 0}
                    className="flex items-center space-x-2 bg-showman-gold hover:bg-showman-gold-dark text-showman-black border border-showman-gold-dark font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Export Winners</span>
                  </button>
                )}
              </div>
            </div>

            {/* Participants Table */}
            {activeTab === 'participants' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-showman-black-lighter border-b-2 border-showman-gold/50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-showman-gold/50 bg-showman-black-lighter text-showman-gold focus:ring-showman-gold"
                          checked={participants.length > 0 && selectedIds.length === participants.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">NPK</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Employment</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Check-in</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-showman-gold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-showman-gold/20">
                    {participants.map((participant) => (
                      <motion.tr
                        key={participant.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`hover:bg-showman-black-lighter transition-colors ${selectedIds.includes(participant.id) ? 'bg-showman-gold/5' : ''}`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-showman-gold/50 bg-showman-black-lighter text-showman-gold focus:ring-showman-gold"
                            checked={selectedIds.includes(participant.id)}
                            onChange={() => toggleSelect(participant.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
                          {participant.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-showman-gold-cream font-mono text-sm">
                          {participant.npk}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-showman-gold-cream text-sm">
                          {participant.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-showman-gold-cream text-sm">
                          {participant.employment_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {participant.checked_in ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                              Checked In
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {participant.is_winner ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-showman-gold/20 text-showman-gold border border-showman-gold/50">
                              Winner
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-showman-red/20 text-showman-red border border-showman-red/50">
                              Eligible
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openModal('participant', participant)}
                            className="text-showman-gold hover:text-showman-gold-light mr-4"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('participant', participant.id)}
                            className="text-showman-red hover:text-showman-red-light"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Prizes Table */}
            {activeTab === 'prizes' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-showman-black-lighter border-b-2 border-showman-gold/50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-showman-gold/50 bg-showman-black-lighter text-showman-gold focus:ring-showman-gold"
                          checked={prizes.length > 0 && selectedIds.length === prizes.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Image</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Prize Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Initial</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Current</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-showman-gold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-showman-gold/20">
                    {prizes.map((prize) => (
                      <motion.tr
                        key={prize.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`hover:bg-showman-black-lighter transition-colors ${selectedIds.includes(prize.id) ? 'bg-showman-gold/5' : ''}`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-showman-gold/50 bg-showman-black-lighter text-showman-gold focus:ring-showman-gold"
                            checked={selectedIds.includes(prize.id)}
                            onChange={() => toggleSelect(prize.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {prize.image_url ? (
                            <img src={prize.image_url} alt={prize.prize_name} className="w-10 h-10 object-cover rounded-md border border-showman-gold/30" />
                          ) : getPrizeImage(prize.prize_name) ? (
                            <img src={getPrizeImage(prize.prize_name)!} alt={prize.prize_name} className="w-10 h-10 object-cover rounded-md border border-showman-gold/30" />
                          ) : (
                            <div className="w-10 h-10 bg-showman-black-lighter rounded-md border border-showman-gold/30 flex items-center justify-center">
                              <Gift className="w-5 h-5 text-showman-gold/50" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
                          {prize.prize_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-showman-gold-cream">
                          {prize.initial_quota}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-bold ${prize.current_quota > 0 ? 'text-showman-gold' : 'text-showman-red'}`}>
                            {prize.current_quota}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {prize.current_quota > 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-showman-gold/20 text-showman-gold border border-showman-gold/50">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-showman-red/20 text-showman-red border border-showman-red/50">
                              Out of Stock
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openModal('prize', prize)}
                            className="text-showman-gold hover:text-showman-gold-light mr-4"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('prize', prize.id)}
                            className="text-showman-red hover:text-showman-red-light"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Winners Table */}
            {activeTab === 'winners' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-showman-black-lighter border-b-2 border-showman-gold/50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-showman-gold/50 bg-showman-black-lighter text-showman-gold focus:ring-showman-gold"
                          checked={winners.length > 0 && selectedIds.length === winners.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">NPK</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Prize</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-showman-gold uppercase tracking-wider">Won At</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-showman-gold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-showman-gold/20">
                    {winners.map((winner) => (
                      <motion.tr
                        key={winner.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`hover:bg-showman-black-lighter transition-colors ${selectedIds.includes(winner.id) ? 'bg-showman-gold/5' : ''}`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-showman-gold/50 bg-showman-black-lighter text-showman-gold focus:ring-showman-gold"
                            checked={selectedIds.includes(winner.id)}
                            onChange={() => toggleSelect(winner.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
                          {winner.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-showman-gold-cream font-mono text-sm">
                          {winner.npk}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-showman-gold/20 text-showman-gold border border-showman-gold/50">
                            {winner.prize_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-showman-gold-cream text-sm">
                          {new Date(winner.won_at).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDelete('winner', winner.id)}
                            className="text-showman-red hover:text-showman-red-light"
                            title="Remove winner & restore quota"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>

                {winners.length === 0 && (
                  <div className="text-center py-12 text-showman-gold-cream">
                    No winners yet. Start drawing prizes!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-showman-black-light rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border-2 border-showman-gold/50"
            >
              <div className="flex justify-between items-center p-6 border-b-2 border-showman-gold/30">
                <h3 className="text-xl font-bold text-showman-gold">
                  {editingItem ? 'Edit' : 'Add'} {modalType === 'participant' ? 'Participant' : 'Prize'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-showman-gold-cream hover:text-showman-gold transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {modalType === 'participant' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-showman-gold-cream mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border-2 border-showman-gold/30 bg-showman-black-lighter text-white rounded-lg focus:ring-2 focus:ring-showman-gold focus:border-showman-gold outline-none transition-all"
                        placeholder="e.g., John Doe"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-showman-gold-cream mb-1">NPK</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border-2 border-showman-gold/30 bg-showman-black-lighter text-white rounded-lg focus:ring-2 focus:ring-showman-gold focus:border-showman-gold outline-none transition-all"
                        placeholder="e.g., 12345678"
                        value={formData.npk || ''}
                        onChange={(e) => setFormData({ ...formData, npk: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-showman-gold-cream mb-1">Status</label>
                      <select
                        className="w-full px-4 py-2 border-2 border-showman-gold/30 bg-showman-black-lighter text-white rounded-lg focus:ring-2 focus:ring-showman-gold focus:border-showman-gold outline-none transition-all"
                        value={formData.is_winner || 0}
                        onChange={(e) => setFormData({ ...formData, is_winner: parseInt(e.target.value) })}
                      >
                        <option value={0}>Eligible</option>
                        <option value={1}>Winner</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-showman-gold-cream mb-1">Check-in Status</label>
                      <select
                        className="w-full px-4 py-2 border-2 border-showman-gold/30 bg-showman-black-lighter text-white rounded-lg focus:ring-2 focus:ring-showman-gold focus:border-showman-gold outline-none transition-all"
                        value={formData.checked_in || 0}
                        onChange={(e) => setFormData({ ...formData, checked_in: parseInt(e.target.value) })}
                      >
                        <option value={0}>Pending</option>
                        <option value={1}>Checked In</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-showman-gold-cream mb-1">Category</label>
                        <select
                          className="w-full px-4 py-2 border-2 border-showman-gold/30 bg-showman-black-lighter text-white rounded-lg focus:ring-2 focus:ring-showman-gold focus:border-showman-gold outline-none transition-all"
                          value={formData.category || 'Staff'}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                          <option value="Staff">Staff</option>
                          <option value="Dept Head Upper">Dept Head Upper</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-showman-gold-cream mb-1">Employment</label>
                        <select
                          className="w-full px-4 py-2 border-2 border-showman-gold/30 bg-showman-black-lighter text-white rounded-lg focus:ring-2 focus:ring-showman-gold focus:border-showman-gold outline-none transition-all"
                          value={formData.employment_type || 'AGIT'}
                          onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                        >
                          <option value="AGIT">AGIT</option>
                          <option value="Vendor">Vendor</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {modalType === 'prize' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-showman-gold-cream mb-1">Prize Name</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border-2 border-showman-gold/30 bg-showman-black-lighter text-white rounded-lg focus:ring-2 focus:ring-showman-gold focus:border-showman-gold outline-none transition-all"
                        placeholder="e.g., Bicycle"
                        value={formData.prizeName || ''}
                        onChange={(e) => setFormData({ ...formData, prizeName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-showman-gold-cream mb-1">Prize Image</label>
                      <div className="flex items-center space-x-4">
                        <div
                          onClick={() => imageInputRef.current?.click()}
                          className="w-24 h-24 border-2 border-dashed border-showman-gold/50 rounded-lg flex items-center justify-center cursor-pointer hover:bg-showman-gold/10 transition-colors overflow-hidden"
                        >
                          {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                              <Plus className="w-6 h-6 text-showman-gold mx-auto" />
                              <span className="text-xs text-showman-gold-cream">Upload</span>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={imageInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                        <div className="text-xs text-showman-gold-cream">
                          Click to select an image for the prize card.
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-showman-gold-cream mb-1">Initial Quota</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="w-full px-4 py-2 border-2 border-showman-gold/30 bg-showman-black-lighter text-white rounded-lg focus:ring-2 focus:ring-showman-gold focus:border-showman-gold outline-none transition-all"
                        value={formData.quota || ''}
                        onChange={(e) => setFormData({ ...formData, quota: parseInt(e.target.value) })}
                      />
                      {editingItem && (
                        <p className="text-xs text-showman-gold-cream mt-1">
                          Note: Changing initial quota will adjust current quota by the difference.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-showman-gold-cream mb-1">Remaining Stock (Current Quota)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        className="w-full px-4 py-2 border-2 border-showman-gold/30 bg-showman-black-lighter text-white rounded-lg focus:ring-2 focus:ring-showman-gold focus:border-showman-gold outline-none transition-all"
                        value={formData.currentQuota !== undefined ? formData.currentQuota : formData.quota}
                        onChange={(e) => setFormData({ ...formData, currentQuota: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-showman-gold-cream mt-1">Default is same as Initial Quota. Edit to manually adjust stock.</p>
                    </div>
                  </>
                )}

                <div className="pt-4 flex space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border-2 border-showman-gold/30 text-showman-gold-cream rounded-lg hover:bg-showman-black-lighter font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-showman-red to-showman-red-dark text-showman-gold rounded-lg hover:from-showman-red-dark hover:to-showman-red font-bold shadow-lg border-2 border-showman-gold/50 transition-all flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
