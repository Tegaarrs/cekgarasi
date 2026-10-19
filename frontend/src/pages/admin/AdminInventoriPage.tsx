import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { slideInRight, spring } from '@/lib/motion';
import { SegmentBadge } from '@/components/motion/SegmentBadge';
import { Spinner } from '@/components/motion/Spinner';
import { Toast } from '@/components/motion/Toast';
import { apiFetch } from '@/services/api';
import { getCarPhoto } from '@/utils/carPhoto';
import { 
  Plus, X, Search, Sparkles, 
  Download, ChevronRight, Edit2, ExternalLink,
  Camera, Verified, Trash2, QrCode, AlertTriangle, 
  CheckCircle2, ArrowUpDown
} from 'lucide-react';
import { AlgorithmScenarioTester, ComparisonResult } from '@/components/algo/AlgorithmScenarioTester';
import { generateInspectionBarcodeJpg } from '@/utils/inspectionBarcode';
import { RupiahInput } from '@/components/common/RupiahInput';

interface CarItem {
  id: number;
  nama_mobil: string;
  merek: string;
  merk?: string;
  model_mobil?: string;
  tahun: number;
  jarak_tempuh_ribu_km: number;
  harga_rp: number;
  cicilan_rp?: number;
  transmisi: string;
  tipe_plat: string;
  jenis_plat?: string;
  lokasi: string;
  tipe_bodi?: string;
  total_fitur: number;
  klaster: number;
  nama_segmen: string;
  status?: string;
  foto_url?: string;
  foto_gallery?: string[];
}

interface PhotoItem {
  id: string;
  url: string;
  isPrimary: boolean;
}

export function AdminInventoriPage() {
  const shouldReduce = useReducedMotion();

  const [cars, setCars] = useState<CarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(609);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CarItem | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  // Status Tab: 'semua' | 'tayang' | 'draft'
  const [statusTab, setStatusTab] = useState<'semua' | 'tayang' | 'draft'>('semua');

  // KPI summary stats
  const [kpiCounts, setKpiCounts] = useState({
    total: 609,
    tayang: 584,
    draft: 25,
    audit: 21,
  });

  // Search & filter states
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [filterSegmen, setFilterSegmen] = useState(() => searchParams.get('klaster') || '');
  const [filterTipeBodi, setFilterTipeBodi] = useState(() => searchParams.get('tipe_bodi') || '');
  const [filterMerek, setFilterMerek] = useState(() => searchParams.get('merek') || '');
  const [sortOption, setSortOption] = useState(() => searchParams.get('sort') || '');
  const [showAlgoTester, setShowAlgoTester] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal dialog states
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkStatusTarget, setBulkStatusTarget] = useState<'tayang' | 'draft'>('tayang');
  const [deleteConfirmCar, setDeleteConfirmCar] = useState<CarItem | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState(false);

  // Form states for "Tambah Unit" drawer
  const [formNama, setFormNama] = useState('Toyota Veloz 1.5 Q CVT TSS');
  const [formMerk, setFormMerk] = useState('Toyota');
  const [formTipeBodi, setFormTipeBodi] = useState('MPV');
  const [formTahun, setFormTahun] = useState(2022);
  const [formKm, setFormKm] = useState(28.5);
  const [formHarga, setFormHarga] = useState(235000000);
  const [formTransmisi, setFormTransmisi] = useState('Automatic');
  const [formPlat, setFormPlat] = useState('ganjil');
  const [formLokasi, setFormLokasi] = useState('Hub Fatmawati');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Photos for "Tambah Unit"
  const [galleryPhotos, setGalleryPhotos] = useState<PhotoItem[]>([
    { id: '1', url: '/images/cars/toyota_avanza.jpg', isPrimary: true },
    { id: '2', url: '/images/cars/honda_brio.jpg', isPrimary: false },
    { id: '3', url: '/images/cars/honda_hrv.jpg', isPrimary: false },
  ]);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Form states for "Edit Unit" drawer
  const [editNama, setEditNama] = useState('');
  const [editMerk, setEditMerk] = useState('Toyota');
  const [editTipeBodi, setEditTipeBodi] = useState('MPV');
  const [editTahun, setEditTahun] = useState(2022);
  const [editKm, setEditKm] = useState(28.5);
  const [editHarga, setEditHarga] = useState(235000000);
  const [editTransmisi, setEditTransmisi] = useState('Automatic');
  const [editPlat, setEditPlat] = useState('ganjil');
  const [editLokasi, setEditLokasi] = useState('Hub Fatmawati');
  const [editStatus, setEditStatus] = useState<'tayang' | 'draft'>('tayang');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editGalleryPhotos, setEditGalleryPhotos] = useState<PhotoItem[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // 11 Checklist Features State (K-Means Input) for Tambah Unit
  const [features, setFeatures] = useState<{ [key: string]: boolean }>({
    rear_camera: true,
    sun_roof: true,
    auto_retract: true,
    epb: true,
    map_nav: true,
    vsc: true,
    keyless: true,
    sports_mode: false,
    camera_360: true,
    power_sliding: false,
    acc: false,
  });

  // 11 Checklist Features State for Edit Unit
  const [editFeatures, setEditFeatures] = useState<{ [key: string]: boolean }>({
    rear_camera: true,
    sun_roof: true,
    auto_retract: true,
    epb: true,
    map_nav: true,
    vsc: true,
    keyless: true,
    sports_mode: false,
    camera_360: true,
    power_sliding: false,
    acc: false,
  });

  const featureCount = Object.values(features).filter(Boolean).length;
  const editFeatureCount = Object.values(editFeatures).filter(Boolean).length;

  const toggleFeature = (k: string) => {
    setFeatures((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const toggleEditFeature = (k: string) => {
    setEditFeatures((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  // Live Segment Prediction & Scenario Juxtaposition for Tambah Unit
  const [predKlaster, setPredKlaster] = useState(1);
  const [scenarioPred, setScenarioPred] = useState<ComparisonResult | null>(null);
  const [predPosisi, setPredPosisi] = useState<{
    q1: number;
    median: number;
    q3: number;
    verdict: string;
  }>({
    q1: 210000000,
    median: 228000000,
    q3: 245000000,
    verdict: 'di dalam rentang wajar (Fair Market Price)',
  });

  // Live Segment Prediction for Edit Unit
  const [editPredKlaster, setEditPredKlaster] = useState(1);
  const [editScenarioPred, setEditScenarioPred] = useState<ComparisonResult | null>(null);
  const [editPredPosisi, setEditPredPosisi] = useState<{
    q1: number;
    median: number;
    q3: number;
    verdict: string;
  }>({
    q1: 210000000,
    median: 228000000,
    q3: 245000000,
    verdict: 'di dalam rentang wajar (Fair Market Price)',
  });

  const loadCars = (p = 1) => {
    setLoading(true);
    let url = `/admin/mobil?page=${p}&limit=10`;
    if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
    if (filterSegmen !== '') url += `&klaster=${filterSegmen}`;
    if (filterTipeBodi) url += `&tipe_bodi=${encodeURIComponent(filterTipeBodi)}`;
    if (filterMerek) url += `&merek=${encodeURIComponent(filterMerek)}`;
    if (sortOption) url += `&sort=${encodeURIComponent(sortOption)}`;
    if (statusTab !== 'semua') url += `&status=${statusTab}`;

    apiFetch<{ total: number; page: number; items: CarItem[] }>(url)
      .then((res) => {
        setCars(res.items || []);
        setTotal(res.total ?? 0);
        setPage(res.page || 1);
      })
      .catch((err) => {
        console.error('Gagal memuat inventori mobil:', err);
        setCars([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));

    // Also refresh KPI counts from backend
    apiFetch<{ kpi: { total_mobil: number; total_tayang: number; total_draft: number } }>('/admin/ringkasan')
      .then((res) => {
        if (res && res.kpi) {
          setKpiCounts({
            total: res.kpi.total_mobil,
            tayang: res.kpi.total_tayang,
            draft: res.kpi.total_draft,
            audit: 21,
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCars(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, filterSegmen, filterTipeBodi, filterMerek, sortOption, statusTab]);

  // Reset bulk selection whenever filter/search or status changes
  useEffect(() => {
    setSelectedIds([]);
  }, [searchQuery, filterSegmen, filterTipeBodi, filterMerek, sortOption, statusTab, page]);

  // Update live prediction for Tambah Unit
  useEffect(() => {
    const q1Map = { 0: 250000000, 1: 195000000, 2: 100000000 };
    const q3Map = { 0: 420000000, 1: 245000000, 2: 135000000 };
    const medMap = { 0: 320000000, 1: 228000000, 2: 118000000 };

    const timer = setTimeout(() => {
      apiFetch<ComparisonResult>('/admin/uji-komparasi-skenario', {
        method: 'POST',
        body: JSON.stringify({
          harga_rp: formHarga,
          tahun: formTahun,
          jarak_tempuh_ribu_km: formKm,
          total_fitur: featureCount,
          tipe_bodi: formTipeBodi,
        }),
      })
        .then((res) => {
          setScenarioPred(res);
          const k = res.produksi.klaster;
          setPredKlaster(k);

          const q1 = q1Map[k as 0 | 1 | 2] || 195000000;
          const q3 = q3Map[k as 0 | 1 | 2] || 245000000;
          const median = medMap[k as 0 | 1 | 2] || 228000000;

          let verdict = 'di dalam rentang wajar (Fair Market Price)';
          if (formHarga < q1) verdict = 'di bawah rentang wajar';
          else if (formHarga > q3) verdict = 'di atas rentang wajar';

          setPredPosisi({ q1, median, q3, verdict });
        })
        .catch(() => {});
    }, 200);

    return () => clearTimeout(timer);
  }, [formTahun, formKm, formHarga, featureCount, formTipeBodi]);

  // Update live prediction for Edit Unit
  useEffect(() => {
    if (!isEditDrawerOpen) return;
    const q1Map = { 0: 250000000, 1: 195000000, 2: 100000000 };
    const q3Map = { 0: 420000000, 1: 245000000, 2: 135000000 };
    const medMap = { 0: 320000000, 1: 228000000, 2: 118000000 };

    const timer = setTimeout(() => {
      apiFetch<ComparisonResult>('/admin/uji-komparasi-skenario', {
        method: 'POST',
        body: JSON.stringify({
          harga_rp: editHarga,
          tahun: editTahun,
          jarak_tempuh_ribu_km: editKm,
          total_fitur: editFeatureCount,
          tipe_bodi: editTipeBodi,
        }),
      })
        .then((res) => {
          setEditScenarioPred(res);
          const k = res.produksi.klaster;
          setEditPredKlaster(k);

          const q1 = q1Map[k as 0 | 1 | 2] || 195000000;
          const q3 = q3Map[k as 0 | 1 | 2] || 245000000;
          const median = medMap[k as 0 | 1 | 2] || 228000000;

          let verdict = 'di dalam rentang wajar (Fair Market Price)';
          if (editHarga < q1) verdict = 'di bawah rentang wajar';
          else if (editHarga > q3) verdict = 'di atas rentang wajar';

          setEditPredPosisi({ q1, median, q3, verdict });
        })
        .catch(() => {});
    }, 200);

    return () => clearTimeout(timer);
  }, [editTahun, editKm, editHarga, editFeatureCount, editTipeBodi, isEditDrawerOpen]);

  // Photo Upload Handler (supports multiple files)
  const handleUploadFiles = async (files: FileList | null, isEdit = false) => {
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);

    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await apiFetch<{ status: string; url: string }>('/admin/upload-foto', {
          method: 'POST',
          body: formData,
        });
        if (res && res.url) {
          uploadedUrls.push(res.url);
        }
      } catch {
        // Fallback to local Data URL preview
        const reader = new FileReader();
        const dataUrlPromise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const dataUrl = await dataUrlPromise;
        uploadedUrls.push(dataUrl);
      }
    }

    if (uploadedUrls.length > 0) {
      if (isEdit) {
        setEditGalleryPhotos((prev) => {
          const hasPrimary = prev.some((p) => p.isPrimary);
          const newItems: PhotoItem[] = uploadedUrls.map((url, idx) => ({
            id: `edit_${Date.now()}_${idx}`,
            url,
            isPrimary: !hasPrimary && idx === 0,
          }));
          return [...prev, ...newItems];
        });
      } else {
        setGalleryPhotos((prev) => {
          const hasPrimary = prev.some((p) => p.isPrimary);
          const newItems: PhotoItem[] = uploadedUrls.map((url, idx) => ({
            id: `add_${Date.now()}_${idx}`,
            url,
            isPrimary: !hasPrimary && idx === 0,
          }));
          return [...prev, ...newItems];
        });
      }
      setToastMsg(`Berhasil mengunggah ${uploadedUrls.length} foto kendaraan.`);
    }

    setUploadingPhoto(false);
  };

  const setPrimaryPhoto = (id: string, isEdit = false) => {
    if (isEdit) {
      setEditGalleryPhotos((prev) =>
        prev.map((item) => ({ ...item, isPrimary: item.id === id }))
      );
    } else {
      setGalleryPhotos((prev) =>
        prev.map((item) => ({ ...item, isPrimary: item.id === id }))
      );
    }
  };

  const removePhoto = (id: string, isEdit = false) => {
    if (isEdit) {
      setEditGalleryPhotos((prev) => {
        const filtered = prev.filter((item) => item.id !== id);
        if (filtered.length > 0 && !filtered.some((p) => p.isPrimary)) {
          filtered[0].isPrimary = true;
        }
        return filtered;
      });
    } else {
      setGalleryPhotos((prev) => {
        const filtered = prev.filter((item) => item.id !== id);
        if (filtered.length > 0 && !filtered.some((p) => p.isPrimary)) {
          filtered[0].isPrimary = true;
        }
        return filtered;
      });
    }
  };

  // Open Edit Modal for a car
  const openEditModal = (car: CarItem) => {
    setEditingCar(car);
    setEditNama(car.nama_mobil);
    setEditMerk(car.merek || car.merk || 'Toyota');
    setEditTipeBodi(car.tipe_bodi || 'MPV');
    setEditTahun(car.tahun);
    setEditKm(car.jarak_tempuh_ribu_km);
    setEditHarga(car.harga_rp);
    setEditTransmisi(car.transmisi || 'Automatic');
    setEditPlat(car.jenis_plat || car.tipe_plat || 'ganjil');
    setEditLokasi(car.lokasi || 'Hub Fatmawati');
    setEditStatus((car.status?.toLowerCase() === 'draft' ? 'draft' : 'tayang'));

    // Populate photos for edit
    const photos: PhotoItem[] = [];
    if (car.foto_url) {
      photos.push({ id: 'primary', url: car.foto_url, isPrimary: true });
    } else {
      photos.push({ id: 'primary', url: getCarPhoto(car.nama_mobil), isPrimary: true });
    }

    if (car.foto_gallery && Array.isArray(car.foto_gallery)) {
      car.foto_gallery.forEach((gUrl, idx) => {
        if (gUrl && gUrl !== car.foto_url) {
          photos.push({ id: `gallery_${idx}`, url: gUrl, isPrimary: false });
        }
      });
    }

    setEditGalleryPhotos(photos);
    setIsEditDrawerOpen(true);
  };

  // Submit Tambah Unit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const primaryPhoto = galleryPhotos.find((p) => p.isPrimary) || galleryPhotos[0];
      const allUrls = galleryPhotos.map((p) => p.url);

      await apiFetch('/admin/mobil', {
        method: 'POST',
        body: JSON.stringify({
          nama_mobil: formNama,
          merek: formMerk,
          model_mobil: formNama.split(' ')[0] || formMerk,
          tipe_bodi: formTipeBodi,
          tahun: formTahun,
          jarak_tempuh_ribu_km: formKm,
          harga_rp: formHarga,
          transmisi: formTransmisi,
          jenis_plat: formPlat,
          lokasi: formLokasi,
          feature_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].slice(0, featureCount),
          status: 'tayang',
          foto_url: primaryPhoto?.url || null,
          foto_gallery: allUrls,
        }),
      });

      setIsDrawerOpen(false);
      setToastMsg('Unit mobil baru dan foto berhasil ditambahkan ke katalog!');
      loadCars(1);
    } catch {
      alert('Gagal menambahkan unit.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Unit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCar) return;
    setEditSubmitting(true);

    try {
      const primaryPhoto = editGalleryPhotos.find((p) => p.isPrimary) || editGalleryPhotos[0];
      const allUrls = editGalleryPhotos.map((p) => p.url);

      await apiFetch(`/admin/mobil/${editingCar.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nama_mobil: editNama,
          merek: editMerk,
          model_mobil: editNama.split(' ')[0] || editMerk,
          tipe_bodi: editTipeBodi,
          tahun: editTahun,
          jarak_tempuh_ribu_km: editKm,
          harga_rp: editHarga,
          transmisi: editTransmisi,
          jenis_plat: editPlat,
          lokasi: editLokasi,
          feature_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].slice(0, editFeatureCount),
          status: editStatus,
          foto_url: primaryPhoto?.url || null,
          foto_gallery: allUrls,
        }),
      });

      setIsEditDrawerOpen(false);
      setEditingCar(null);
      setToastMsg(`Katalog ${editNama} berhasil diperbarui dengan foto & data terkini!`);
      loadCars(page);
    } catch {
      alert('Gagal memperbarui data mobil.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Single Delete
  const handleConfirmSingleDelete = async () => {
    if (!deleteConfirmCar) return;
    try {
      await apiFetch(`/admin/mobil/${deleteConfirmCar.id}`, {
        method: 'DELETE',
      });
      setToastMsg(`Unit "${deleteConfirmCar.nama_mobil}" berhasil dihapus.`);
      setDeleteConfirmCar(null);
      loadCars(page);
    } catch {
      alert('Gagal menghapus unit mobil.');
    }
  };

  // Bulk Status Update (Tayang / Draft)
  const handleApplyBulkStatus = async (targetStatus: 'tayang' | 'draft') => {
    if (selectedIds.length === 0) return;
    try {
      const count = selectedIds.length;
      await apiFetch('/admin/mobil/status-massal', {
        method: 'POST',
        body: JSON.stringify({
          car_ids: selectedIds,
          status: targetStatus,
        }),
      });
      setIsBulkStatusModalOpen(false);
      setSelectedIds([]);
      setToastMsg(`Status ${count} unit berhasil diubah menjadi ${targetStatus === 'tayang' ? 'Tayang' : 'Draft'}!`);
      loadCars(page);
    } catch {
      alert('Gagal mengubah status unit massal.');
    }
  };

  // Bulk Delete
  const handleApplyBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const count = selectedIds.length;
      await apiFetch('/admin/mobil/hapus-massal', {
        method: 'POST',
        body: JSON.stringify({
          car_ids: selectedIds,
        }),
      });
      setIsBulkDeleteModalOpen(false);
      setSelectedIds([]);
      setToastMsg(`${count} unit mobil terpilih berhasil dihapus.`);
      loadCars(1);
    } catch {
      alert('Gagal menghapus unit massal.');
    }
  };

  // Print Barcode Inspeksi (Single unit -> JPG download)
  const handlePrintBarcode = async (car: CarItem) => {
    setIsGeneratingBarcode(true);
    try {
      await generateInspectionBarcodeJpg({
        id: car.id,
        nama_mobil: car.nama_mobil,
        merek: car.merek || car.merk,
        tipe_bodi: car.tipe_bodi,
        tahun: car.tahun,
        jarak_tempuh_ribu_km: car.jarak_tempuh_ribu_km,
        harga_rp: car.harga_rp,
        transmisi: car.transmisi,
        tipe_plat: car.tipe_plat || car.jenis_plat,
        lokasi: car.lokasi,
        klaster: car.klaster,
        nama_segmen: car.nama_segmen,
        status: car.status,
        foto_url: car.foto_url,
      });
      setToastMsg(`Barcode Inspeksi untuk "${car.nama_mobil}" berhasil diunduh dalam format JPG!`);
    } catch {
      alert('Gagal membuat barcode inspeksi JPG.');
    } finally {
      setIsGeneratingBarcode(false);
    }
  };

  // Bulk Print Barcode Inspeksi
  const handleBulkPrintBarcode = async () => {
    if (selectedIds.length === 0) return;
    setIsGeneratingBarcode(true);
    const targetCars = cars.filter((c) => selectedIds.includes(c.id));
    if (targetCars.length === 0) {
      alert('Silakan pilih minimal 1 unit untuk dicetak barcode inspeksinya.');
      setIsGeneratingBarcode(false);
      return;
    }

    try {
      for (const car of targetCars) {
        await generateInspectionBarcodeJpg({
          id: car.id,
          nama_mobil: car.nama_mobil,
          merek: car.merek || car.merk,
          tipe_bodi: car.tipe_bodi,
          tahun: car.tahun,
          jarak_tempuh_ribu_km: car.jarak_tempuh_ribu_km,
          harga_rp: car.harga_rp,
          transmisi: car.transmisi,
          tipe_plat: car.tipe_plat || car.jenis_plat,
          lokasi: car.lokasi,
          klaster: car.klaster,
          nama_segmen: car.nama_segmen,
          status: car.status,
          foto_url: car.foto_url,
        });
      }
      setToastMsg(`Berhasil mengunduh Barcode Inspeksi (JPG) untuk ${targetCars.length} unit terpilih!`);
    } catch {
      alert('Terjadi kendala saat mengunduh barcode inspeksi.');
    } finally {
      setIsGeneratingBarcode(false);
    }
  };

  // Ekspor CSV
  const handleExportCsv = async () => {
    try {
      // Trigger download via direct window / link to backend endpoint
      let url = '/api/admin/mobil/ekspor-csv?';
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
      if (filterSegmen !== '') url += `&klaster=${filterSegmen}`;
      if (filterTipeBodi) url += `&tipe_bodi=${encodeURIComponent(filterTipeBodi)}`;
      if (statusTab !== 'semua') url += `&status=${statusTab}`;

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventori_cekgarasi_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToastMsg('File CSV inventori kendaraan berhasil diunduh!');
    } catch {
      alert('Gagal mengekspor data ke CSV.');
    }
  };

  const selectedCars = cars.filter((c) => selectedIds.includes(c.id));
  const isAllCurrentPageSelected = cars.length > 0 && cars.every((c) => selectedIds.includes(c.id));
  const isSomeCurrentPageSelected = cars.some((c) => selectedIds.includes(c.id)) && !isAllCurrentPageSelected;

  const toggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const pageCarIds = new Set(cars.map((c) => c.id));
      setSelectedIds((prev) => prev.filter((id) => !pageCarIds.has(id)));
    } else {
      const pageCarIds = cars.map((c) => c.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageCarIds])));
    }
  };

  const toggleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const markerPos = Math.min(
    Math.max(((formHarga - predPosisi.q1) / Math.max(predPosisi.q3 - predPosisi.q1, 10000000)) * 100, 10),
    90
  );

  const editMarkerPos = Math.min(
    Math.max(((editHarga - editPredPosisi.q1) / Math.max(editPredPosisi.q3 - editPredPosisi.q1, 10000000)) * 100, 10),
    90
  );

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-800">
      
      {/* Top Breadcrumb & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold">
            <span>Dasbor Portal Dealer</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600">Kelola Stok Mobil</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#001540] font-bold">Inventori Unit Aktif</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001540] tracking-tight">
            Manajemen Inventori &amp; Stok Kendaraan
          </h1>
          <p className="text-xs text-slate-500 max-w-3xl">
            Kelola {kpiCounts.total} unit inventaris, pantau status penayangan bursa, dan tambahkan unit baru dengan penentuan segmen K-Means serta validasi harga otomatis.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-[#001540] text-xs font-bold shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-blue-600" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#001540] hover:bg-[#0F2A5F] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 text-[#FE6A2B]" />
            <span>Tambah Unit</span>
          </button>
        </div>
      </div>

      {/* Status Tabs & Metric Chips */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
        
        {/* Segment Tabs */}
        <div className="xl:col-span-5 flex items-center bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-xs gap-1">
          <button
            type="button"
            onClick={() => setStatusTab('semua')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all text-center ${
              statusTab === 'semua'
                ? 'bg-[#001540] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#001540]'
            }`}
          >
            Semua ({kpiCounts.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('tayang')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all text-center ${
              statusTab === 'tayang'
                ? 'bg-[#001540] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#001540]'
            }`}
          >
            Tayang ({kpiCounts.tayang})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('draft')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all text-center ${
              statusTab === 'draft'
                ? 'bg-[#001540] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#001540]'
            }`}
          >
            Draft ({kpiCounts.draft})
          </button>
        </div>

        {/* Quick KPI Strip */}
        <div className="xl:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Unit</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-[#001540]">{kpiCounts.total}</span>
              <span className="text-[11px] text-slate-400">unit</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Siap Dijual</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-[#001540]">{kpiCounts.tayang}</span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                {Math.round((kpiCounts.tayang / Math.max(kpiCounts.total, 1)) * 100)}%
              </span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Draft / Ulasan</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-[#001540]">{kpiCounts.draft}</span>
              <span className="text-[11px] text-slate-400">antrean</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Audit Harga</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-[#FE6A2B]">{kpiCounts.audit}</span>
              <span className="text-[11px] text-[#FE6A2B] font-semibold">perlu cek</span>
            </div>
          </div>
        </div>

      </div>

      {/* Filter Bar Container */}
      <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-sky-100/60 via-blue-100/60 to-indigo-100/60 backdrop-blur-sm p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
          
          {/* Search Input Bar */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor polisi, merek, model..."
              className="w-full rounded-xl border border-blue-300/80 bg-gradient-to-r from-sky-100/60 via-blue-100/60 to-cyan-100/60 backdrop-blur-sm py-2 pl-9 pr-4 text-xs text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 shadow-xs transition-all"
            />
          </div>

          {/* Merek */}
          <div>
            <select
              value={filterMerek}
              onChange={(e) => setFilterMerek(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/90 border border-blue-200/80 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="">Semua Merek</option>
              <option value="Toyota">Toyota</option>
              <option value="Honda">Honda</option>
              <option value="Mitsubishi">Mitsubishi</option>
              <option value="Daihatsu">Daihatsu</option>
              <option value="Suzuki">Suzuki</option>
              <option value="Hyundai">Hyundai</option>
              <option value="Wuling">Wuling</option>
              <option value="Nissan">Nissan</option>
              <option value="Mazda">Mazda</option>
            </select>
          </div>

          {/* Tipe Bodi */}
          <div>
            <select
              value={filterTipeBodi}
              onChange={(e) => setFilterTipeBodi(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/90 border border-blue-200/80 text-xs font-semibold text-purple-700 focus:outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
            >
              <option value="">Semua Tipe Bodi</option>
              <option value="Hatchback">Hatchback</option>
              <option value="MPV">MPV</option>
              <option value="SUV">SUV</option>
              <option value="Sedan">Sedan</option>
              <option value="Niaga">Niaga</option>
            </select>
          </div>

          {/* Segmen ML */}
          <div>
            <select
              value={filterSegmen}
              onChange={(e) => setFilterSegmen(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/90 border border-blue-200/80 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="">Semua Segmen ML</option>
              <option value="0">Segmen Premium</option>
              <option value="1">Segmen Keluarga Muda</option>
              <option value="2">Segmen Ekonomis &amp; Efisien</option>
            </select>
          </div>

          {/* Sort / Urutkan */}
          <div>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/90 border border-blue-200/80 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="">Urutan: Default</option>
              <option value="harga_asc">Harga: Rendah ke Tinggi</option>
              <option value="harga_desc">Harga: Tinggi ke Rendah</option>
              <option value="tahun_desc">Tahun: Terbaru</option>
              <option value="km_asc">KM: Paling Rendah</option>
            </select>
          </div>

          {/* Uji Algoritma Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAlgoTester(!showAlgoTester)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                showAlgoTester
                  ? 'bg-blue-600 text-white shadow-blue-600/30 ring-2 ring-blue-400'
                  : 'bg-white/90 text-blue-700 hover:bg-white border border-blue-300'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{showAlgoTester ? 'Tutup Uji' : 'Uji Algoritma'}</span>
            </button>
          </div>

        </div>

        {/* Active Filter Chips */}
        {(searchQuery || filterSegmen !== '' || filterTipeBodi || filterMerek || sortOption) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-200/40 text-xs">
            <span className="text-[11px] font-semibold text-slate-500">Filter Aktif:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                Cari: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-blue-900 ml-0.5"><X className="h-3 w-3" /></button>
              </span>
            )}
            {filterMerek && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                Merek: {filterMerek}
                <button onClick={() => setFilterMerek('')} className="hover:text-blue-900 ml-0.5"><X className="h-3 w-3" /></button>
              </span>
            )}
            {filterTipeBodi && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">
                Tipe: {filterTipeBodi}
                <button onClick={() => setFilterTipeBodi('')} className="hover:text-purple-900 ml-0.5"><X className="h-3 w-3" /></button>
              </span>
            )}
            {filterSegmen !== '' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                Segmen: {filterSegmen === '0' ? '0 (Premium)' : filterSegmen === '1' ? '1 (Keluarga Muda)' : '2 (Ekonomis)'}
                <button onClick={() => setFilterSegmen('')} className="hover:text-blue-900 ml-0.5"><X className="h-3 w-3" /></button>
              </span>
            )}
            {sortOption && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                Sort: {sortOption === 'harga_asc' ? 'Harga Terendah' : sortOption === 'harga_desc' ? 'Harga Tertinggi' : sortOption === 'tahun_desc' ? 'Tahun Terbaru' : 'KM Rendah'}
                <button onClick={() => setSortOption('')} className="hover:text-slate-900 ml-0.5"><X className="h-3 w-3" /></button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterSegmen('');
                setFilterTipeBodi('');
                setFilterMerek('');
                setSortOption('');
              }}
              className="text-[11px] font-bold text-red-600 hover:underline ml-1 cursor-pointer"
            >
              Reset Semua
            </button>
          </div>
        )}
      </div>

      {/* Embedded Collapsible Algorithm Scenario Tester */}
      <AnimatePresence>
        {showAlgoTester && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <AlgorithmScenarioTester
              compact
              onApplyFilters={(filters) => {
                if (filters.tipe_bodi) setFilterTipeBodi(filters.tipe_bodi);
                setShowAlgoTester(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-100 rounded-xl border border-slate-200/90 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FE6A2B]" />
              <span className="font-bold text-[#001540]">{selectedIds.length} unit dipilih</span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-medium">Terapkan instruksi massal ke unit terpilih:</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Ubah Status Tayang Button */}
            <button 
              type="button" 
              onClick={() => setIsBulkStatusModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-[#001540] font-bold shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-blue-600" />
              <span>Ubah Status Tayang</span>
            </button>

            {/* Cetak Barcode Inspeksi Button */}
            <button 
              type="button" 
              disabled={isGeneratingBarcode}
              onClick={handleBulkPrintBarcode}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-[#001540] font-bold shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <QrCode className="h-3.5 w-3.5 text-indigo-600" />
              <span>{isGeneratingBarcode ? 'Membuat Barcode...' : 'Cetak Barcode Inspeksi (JPG)'}</span>
            </button>

            {/* Bulk Delete Button */}
            <button 
              type="button" 
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold shadow-2xs hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Inventory Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeCurrentPageSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Unit &amp; Identitas Kendaraan</th>
                <th className="py-3.5 px-4">Tipe Bodi</th>
                <th className="py-3.5 px-4">Tahun</th>
                <th className="py-3.5 px-4">Odometer</th>
                <th className="py-3.5 px-4">Lokasi Hub</th>
                <th className="py-3.5 px-4">Harga Listing</th>
                <th className="py-3.5 px-4">Klaster ML</th>
                <th className="py-3.5 px-4">Status Bursa</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={10} className="py-4 px-4">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : cars.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Tidak ada unit mobil yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                cars.map((car, idx) => {
                  const isSelected = selectedIds.includes(car.id);
                  const photoUrl = getCarPhoto(car.nama_mobil, car.foto_url);
                  const isTayang = (car.status || 'tayang').toLowerCase() === 'tayang';

                  return (
                    <motion.tr
                      key={car.id}
                      initial={shouldReduce || idx >= 10 ? false : { opacity: 0, y: 4 }}
                      animate={shouldReduce || idx >= 10 ? false : { opacity: 1, y: 0 }}
                      transition={{ delay: idx < 10 ? idx * 0.03 : 0, duration: 0.2 }}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(car.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={photoUrl}
                            alt={car.nama_mobil}
                            className="w-14 h-10 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-[#001540]">{car.nama_mobil}</span>
                            <span className="text-[11px] text-slate-400 mt-0.5">
                              {car.tipe_plat || car.jenis_plat || 'B 1849 POF'} • {car.transmisi} • Bensin
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {car.tipe_bodi ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {car.tipe_bodi}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-700">{car.tahun}</td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {car.jarak_tempuh_ribu_km} rb km
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {car.lokasi || 'Hub Fatmawati'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-[#001540]">
                            Rp {car.harga_rp.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            Sesuai Nilai Pasar
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <SegmentBadge klaster={car.klaster} nama={car.nama_segmen} size="sm" />
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={async () => {
                            const newStatus = isTayang ? 'draft' : 'tayang';
                            try {
                              await apiFetch(`/admin/mobil/${car.id}`, {
                                method: 'PUT',
                                body: JSON.stringify({ status: newStatus }),
                              });
                              setToastMsg(`Status ${car.nama_mobil} diubah ke ${newStatus.toUpperCase()}`);
                              loadCars(page);
                            } catch {
                              alert('Gagal mengubah status.');
                            }
                          }}
                          title={`Klik untuk ubah status ke ${isTayang ? 'Draft' : 'Tayang'}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${
                            isTayang
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isTayang ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                          {isTayang ? 'Tayang' : 'Draft'}
                        </button>
                      </td>

                      {/* Action Buttons Column */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(car)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors shadow-2xs cursor-pointer"
                            title="Edit & Perbarui Katalog Mobil"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Print Barcode Inspeksi Button */}
                          <button
                            type="button"
                            onClick={() => handlePrintBarcode(car)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-colors shadow-2xs cursor-pointer"
                            title="Cetak Barcode Inspeksi (JPG)"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                          </button>

                          {/* View on Web */}
                          <a
                            href={`/mobil/${car.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors shadow-2xs cursor-pointer inline-flex items-center"
                            title="Lihat di Web"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmCar(car)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                            title="Hapus Mobil dari Katalog"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Menampilkan halaman <span className="font-bold text-[#001540]">{page}</span> dari{' '}
            <span className="font-bold text-[#001540]">{Math.ceil(total / 10) || 1}</span> ({total} unit)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => {
                const nextP = page - 1;
                setPage(nextP);
                loadCars(nextP);
              }}
              className="px-3 py-1 rounded-lg border border-slate-200 font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="px-2 py-1 bg-[#001540] text-white rounded-lg font-bold">
              {page}
            </span>
            <button
              disabled={page >= Math.ceil(total / 10)}
              onClick={() => {
                const nextP = page + 1;
                setPage(nextP);
                loadCars(nextP);
              }}
              className="px-3 py-1 rounded-lg border border-slate-200 font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* ======================= MODAL: Ubah Status Tayang Massal ======================= */}
      <AnimatePresence>
        {isBulkStatusModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#001540]">
                  Ubah Status Penayangan ({selectedIds.length} Unit)
                </h3>
                <button
                  type="button"
                  onClick={() => setIsBulkStatusModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Pilih status tayang bursa untuk seluruh unit yang sedang Anda pilih. Perubahan akan segera aktif di platform CekGarasi.
              </p>

              {/* Selected units preview list */}
              {selectedCars.length > 0 && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 max-h-36 overflow-y-auto">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit Terpilih:</div>
                  {selectedCars.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs text-slate-700 bg-white p-1.5 rounded-lg border border-slate-100">
                      <span className="font-semibold truncate max-w-[240px]">{c.nama_mobil}</span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">ID #{c.id}</span>
                    </div>
                  ))}
                  {selectedIds.length > selectedCars.length && (
                    <div className="text-[10px] text-slate-400 italic text-center pt-1">
                      + {selectedIds.length - selectedCars.length} unit lainnya
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkStatusTarget('tayang')}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer ${
                    bulkStatusTarget === 'tayang'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400/40'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <span className="font-bold text-xs">Tayangkan ke Bursa</span>
                  <span className="text-[10px] text-slate-500">Siap dilihat &amp; dibeli pelanggan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkStatusTarget('draft')}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer ${
                    bulkStatusTarget === 'draft'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400/40'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                  <span className="font-bold text-xs">Simpan ke Draft</span>
                  <span className="text-[10px] text-slate-500">Sembunyikan sementara dari bursa</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkStatusModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBulkStatus(bulkStatusTarget)}
                  className="px-5 py-2 rounded-lg bg-[#001540] text-white text-xs font-bold shadow-md hover:bg-[#0F2A5F] cursor-pointer"
                >
                  Terapkan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= MODAL: Konfirmasi Hapus Single ======================= */}
      <AnimatePresence>
        {deleteConfirmCar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="h-5 w-5" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-[#001540]">Hapus Unit Mobil?</h3>
                <p className="text-xs text-slate-500">
                  Apakah Anda yakin ingin menghapus unit <span className="font-bold text-slate-700">"{deleteConfirmCar.nama_mobil}"</span>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCar(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSingleDelete}
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 cursor-pointer"
                >
                  Hapus Unit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= MODAL: Konfirmasi Hapus Massal ======================= */}
      <AnimatePresence>
        {isBulkDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="h-5 w-5" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-[#001540]">Hapus {selectedIds.length} Unit Terpilih?</h3>
                <p className="text-xs text-slate-500">
                  Semua unit yang Anda centang akan dihapus dari inventori dealer.
                </p>
              </div>

              {selectedCars.length > 0 && (
                <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 space-y-1 max-h-32 overflow-y-auto text-left">
                  {selectedCars.map((c) => (
                    <div key={c.id} className="text-[11px] font-semibold text-rose-900 truncate">
                      • {c.nama_mobil} <span className="text-[10px] text-rose-500 font-mono">(ID #{c.id})</span>
                    </div>
                  ))}
                  {selectedIds.length > selectedCars.length && (
                    <div className="text-[10px] text-slate-400 italic">
                      + {selectedIds.length - selectedCars.length} unit lainnya
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkDelete}
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 cursor-pointer"
                >
                  Ya, Hapus Semua
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= DRAWER: Edit Unit Kendaraan ======================= */}
      <AnimatePresence>
        {isEditDrawerOpen && editingCar && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsEditDrawerOpen(false)}
              className="fixed inset-0 bg-black cursor-pointer"
            />

            <motion.div
              variants={slideInRight}
              initial="hidden"
              animate="show"
              exit="exit"
              className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-md p-6 border-b border-slate-200 z-20 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider">
                      Edit Data &amp; Gambar Mobil
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] text-slate-500 font-semibold">ID Unit: #{editingCar.id}</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-[#001540] tracking-tight">
                    Perbarui Katalog Kendaraan
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ubah tipe, merek, spesifikasi harga, serta unggah dan atur sendiri foto mobil yang ditayangkan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Form */}
              <form onSubmit={handleEditSubmit} className="p-6 space-y-6 flex-1 text-xs">
                
                {/* Core Vehicle Data */}
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-[#001540] mb-1">Nama &amp; Varian Lengkap Kendaraan</label>
                    <input
                      type="text"
                      required
                      value={editNama}
                      onChange={(e) => setEditNama(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-[#001540] mb-1">Merek Kendaraan</label>
                      <select
                        value={editMerk}
                        onChange={(e) => setEditMerk(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="Toyota">Toyota</option>
                        <option value="Honda">Honda</option>
                        <option value="Mitsubishi">Mitsubishi</option>
                        <option value="Daihatsu">Daihatsu</option>
                        <option value="Suzuki">Suzuki</option>
                        <option value="Hyundai">Hyundai</option>
                        <option value="Wuling">Wuling</option>
                        <option value="Nissan">Nissan</option>
                        <option value="Mazda">Mazda</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-purple-800 mb-1">Tipe Bodi (Sken. A)</label>
                      <select
                        value={editTipeBodi}
                        onChange={(e) => setEditTipeBodi(e.target.value)}
                        className="w-full px-3 py-2 bg-purple-50/50 border border-purple-200 rounded-lg text-purple-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                      >
                        <option value="MPV">MPV</option>
                        <option value="SUV">SUV</option>
                        <option value="Hatchback">Hatchback</option>
                        <option value="Sedan">Sedan</option>
                        <option value="Niaga">Niaga</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#001540] mb-1">Tahun Produksi</label>
                      <input
                        type="number"
                        value={editTahun}
                        onChange={(e) => setEditTahun(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#001540] mb-1">Jarak Tempuh (Odometer)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step={0.1}
                          value={editKm}
                          onChange={(e) => setEditKm(Number(e.target.value))}
                          className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                          rb KM
                        </span>
                      </div>
                    </div>

                    <div>
                      <RupiahInput
                        value={editHarga}
                        onChange={setEditHarga}
                        label="Harga Penawaran Listing"
                        placeholder="Contoh: 235.000.000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-[#001540] mb-1">Transmisi</label>
                      <select
                        value={editTransmisi}
                        onChange={(e) => setEditTransmisi(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="Automatic">Automatic (Matic)</option>
                        <option value="Manual">Manual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#001540] mb-1">Plat Nomor</label>
                      <select
                        value={editPlat}
                        onChange={(e) => setEditPlat(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="ganjil">Ganjil</option>
                        <option value="genap">Genap</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#001540] mb-1">Lokasi Hub</label>
                      <select
                        value={editLokasi}
                        onChange={(e) => setEditLokasi(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="Hub Fatmawati">Hub Fatmawati</option>
                        <option value="Hub BSD">Hub BSD</option>
                        <option value="Hub Kelapa Gading">Hub Kelapa Gading</option>
                        <option value="Jakarta Selatan">Jakarta Selatan</option>
                        <option value="Bogor">Bogor</option>
                        <option value="Jakarta Utara">Jakarta Utara</option>
                      </select>
                    </div>
                  </div>

                  {/* Status Tayang Toggle in Form */}
                  <div>
                    <label className="block font-bold text-[#001540] mb-1">Status Bursa Kendaraan</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditStatus('tayang')}
                        className={`py-2 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          editStatus === 'tayang'
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${editStatus === 'tayang' ? 'bg-white' : 'bg-emerald-500'}`} />
                        <span>Tayangkan ke Bursa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditStatus('draft')}
                        className={`py-2 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          editStatus === 'draft'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${editStatus === 'draft' ? 'bg-white' : 'bg-amber-500'}`} />
                        <span>Simpan sebagai Draft</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Photo Upload Zone (Interactive for Edit) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-[#001540]">
                      Galeri Foto Unit (Foto Anda Sendiri)
                    </label>
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                      {editGalleryPhotos.length} Foto
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    {/* Hidden File Input */}
                    <input
                      ref={editFileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => handleUploadFiles(e.target.files, true)}
                      className="hidden"
                    />

                    <div className="grid grid-cols-4 gap-2">
                      {editGalleryPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          className="group relative aspect-video rounded-lg overflow-hidden shadow-xs bg-slate-200 border border-slate-300"
                        >
                          <img
                            src={photo.url}
                            alt="Foto Mobil"
                            className="w-full h-full object-cover"
                          />
                          {photo.isPrimary ? (
                            <span className="absolute bottom-1 right-1 bg-[#001540] text-[9px] text-white px-1.5 py-0.5 rounded font-bold shadow-xs">
                              Utama
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPrimaryPhoto(photo.id, true)}
                              className="absolute bottom-1 right-1 bg-black/60 hover:bg-[#001540] text-[8px] text-white px-1 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              Jadikan Utama
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id, true)}
                            className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                            title="Hapus foto ini"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}

                      {/* Unggah Button */}
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="aspect-video rounded-lg bg-white border border-dashed border-blue-400 hover:border-blue-600 flex flex-col items-center justify-center text-blue-600 cursor-pointer hover:bg-blue-50/50 transition-colors shadow-2xs"
                      >
                        {uploadingPhoto ? (
                          <Spinner size={16} />
                        ) : (
                          <>
                            <Camera className="h-4 w-4 text-blue-600" />
                            <span className="text-[9px] mt-0.5 font-bold">+ Unggah</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 text-center">
                      Unggah foto mobil Anda sendiri. Klik foto untuk menjadikannya foto utama di bursa.
                    </p>
                  </div>
                </div>

                {/* 11 Features Checklist */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#001540]">Spesifikasi &amp; Fitur Unggulan (Input Klaster)</label>
                    <span className="text-[10px] text-blue-800 font-bold bg-blue-100 px-2 py-0.5 rounded-full">
                      {editFeatureCount} / 11 Terpilih
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {[
                      { id: 'rear_camera', label: 'Kamera belakang' },
                      { id: 'sun_roof', label: 'Sunroof' },
                      { id: 'auto_retract', label: 'Spion lipat otomatis' },
                      { id: 'epb', label: 'Rem parkir elektrik (EPB)' },
                      { id: 'map_nav', label: 'Navigasi GPS bawaan' },
                      { id: 'vsc', label: 'Kontrol stabilitas (VSC)' },
                      { id: 'keyless', label: 'Keyless & Smart Entry' },
                      { id: 'sports_mode', label: 'Mode berkendara sport' },
                      { id: 'camera_360', label: 'Kamera 360 derajat' },
                      { id: 'power_sliding', label: 'Pintu geser elektrik' },
                      { id: 'acc', label: 'Adaptive Cruise Control (ACC)' },
                    ].map((item) => (
                      <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                        <input
                          type="checkbox"
                          checked={editFeatures[item.id] || false}
                          onChange={() => toggleEditFeature(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-[11px] font-medium">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Real-Time ML Panel */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border border-blue-200 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[#FE6A2B]" />
                      <span className="text-[11px] uppercase font-extrabold text-[#001540]">
                        Prediksi Klaster K-Means Real-Time
                      </span>
                    </div>
                    {editScenarioPred && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300">
                        ✓ Model Aktif
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-blue-200 bg-white p-2 text-center shadow-2xs">
                      <div className="text-[10px] font-bold text-blue-700">Produksi</div>
                      <div className="text-[9px] text-slate-400 mb-1">4 Fitur ML</div>
                      <SegmentBadge klaster={editPredKlaster} nama={editScenarioPred?.produksi.nama_pendek} size="sm" />
                    </div>

                    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-2 text-center shadow-2xs">
                      <div className="text-[10px] font-bold text-purple-700">Skenario A</div>
                      <div className="text-[9px] text-slate-400 mb-1">Tipe Bodi</div>
                      <SegmentBadge klaster={editScenarioPred?.skenario_a.klaster ?? editPredKlaster} nama={editScenarioPred?.skenario_a.nama_pendek} size="sm" />
                    </div>

                    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-2 text-center shadow-2xs">
                      <div className="text-[10px] font-bold text-teal-700">Skenario B</div>
                      <div className="text-[9px] text-slate-400 mb-1">Fitur &amp; KM</div>
                      <SegmentBadge klaster={editScenarioPred?.skenario_b.klaster ?? editPredKlaster} nama={editScenarioPred?.skenario_b.nama_pendek} size="sm" />
                    </div>
                  </div>

                  {/* Benchmark Diagram */}
                  <div className="pt-2 border-t border-blue-200/50 space-y-2">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Benchmark Harga Pasar</span>
                      <span className="text-[11px] font-bold text-[#001540]">
                        Target: Rp {Math.round(editHarga / 1000000)} Jt
                      </span>
                    </div>

                    <div className="relative pt-4 pb-2">
                      <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div className="w-1/4 bg-slate-200" />
                        <div className="w-1/2 bg-emerald-200 flex items-center justify-center">
                          <span className="text-[8px] text-emerald-900 font-extrabold uppercase">Rentang Wajar (Q1 - Q3)</span>
                        </div>
                        <div className="w-1/4 bg-slate-200" />
                      </div>

                      <motion.div
                        animate={{ left: `${editMarkerPos}%` }}
                        transition={spring.soft}
                        className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                      >
                        <span className="text-[9px] font-extrabold text-white bg-[#001540] px-1.5 py-0.5 rounded shadow-sm">
                          Rp {Math.round(editHarga / 1000000)} Jt
                        </span>
                        <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-[#001540]" />
                      </motion.div>
                    </div>

                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <Verified className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{editPredPosisi.verdict}</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {editHarga > editPredPosisi.median ? `+${Math.round(((editHarga - editPredPosisi.median) / editPredPosisi.median) * 100)}%` : `${Math.round(((editHarga - editPredPosisi.median) / editPredPosisi.median) * 100)}%`} dari median
                      </span>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditDrawerOpen(false)}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-[#001540] hover:bg-[#0F2A5F] text-white font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {editSubmitting ? <Spinner size={16} /> : 'Simpan Perubahan ke Bursa'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= DRAWER: Tambah Unit Baru ======================= */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black cursor-pointer"
            />

            <motion.div
              variants={slideInRight}
              initial="hidden"
              animate="show"
              exit="exit"
              className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-md p-6 border-b border-slate-200 z-20 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase text-[#FE6A2B] tracking-wider">
                      Formulir Stok Dealer
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] text-slate-500 font-semibold">Hub Fatmawati</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-[#001540] tracking-tight">
                    Tambah Unit Baru
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Lengkapi data teknis unit untuk estimasi klaster K-Means &amp; verifikasi harga otomatis.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Form */}
              <form onSubmit={handleAddSubmit} className="p-6 space-y-6 flex-1 text-xs">
                
                {/* Core Vehicle Data */}
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-[#001540] mb-1">Nama &amp; Varian Lengkap Kendaraan</label>
                    <input
                      type="text"
                      required
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-[#001540] mb-1">Merek Kendaraan</label>
                      <select
                        value={formMerk}
                        onChange={(e) => setFormMerk(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="Toyota">Toyota</option>
                        <option value="Honda">Honda</option>
                        <option value="Mitsubishi">Mitsubishi</option>
                        <option value="Daihatsu">Daihatsu</option>
                        <option value="Suzuki">Suzuki</option>
                        <option value="Hyundai">Hyundai</option>
                        <option value="Wuling">Wuling</option>
                        <option value="Nissan">Nissan</option>
                        <option value="Mazda">Mazda</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-purple-800 mb-1">Tipe Bodi (Sken. A)</label>
                      <select
                        value={formTipeBodi}
                        onChange={(e) => setFormTipeBodi(e.target.value)}
                        className="w-full px-3 py-2 bg-purple-50/50 border border-purple-200 rounded-lg text-purple-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                      >
                        <option value="MPV">MPV</option>
                        <option value="SUV">SUV</option>
                        <option value="Hatchback">Hatchback</option>
                        <option value="Sedan">Sedan</option>
                        <option value="Niaga">Niaga</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#001540] mb-1">Tahun Produksi</label>
                      <input
                        type="number"
                        value={formTahun}
                        onChange={(e) => setFormTahun(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#001540] mb-1">Jarak Tempuh (Odometer)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step={0.1}
                          value={formKm}
                          onChange={(e) => setFormKm(Number(e.target.value))}
                          className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                          rb KM
                        </span>
                      </div>
                    </div>

                    {/* Rupiah Currency Input */}
                    <div>
                      <RupiahInput
                        value={formHarga}
                        onChange={setFormHarga}
                        label="Harga Penawaran Listing"
                        placeholder="Contoh: 235.000.000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-[#001540] mb-1">Transmisi</label>
                      <select
                        value={formTransmisi}
                        onChange={(e) => setFormTransmisi(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="Automatic">Automatic (Matic)</option>
                        <option value="Manual">Manual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#001540] mb-1">Plat Nomor</label>
                      <select
                        value={formPlat}
                        onChange={(e) => setFormPlat(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="ganjil">Ganjil</option>
                        <option value="genap">Genap</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#001540] mb-1">Lokasi Hub</label>
                      <select
                        value={formLokasi}
                        onChange={(e) => setFormLokasi(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="Hub Fatmawati">Hub Fatmawati</option>
                        <option value="Hub BSD">Hub BSD</option>
                        <option value="Hub Kelapa Gading">Hub Kelapa Gading</option>
                        <option value="Jakarta Selatan">Jakarta Selatan</option>
                        <option value="Bogor">Bogor</option>
                        <option value="Jakarta Utara">Jakarta Utara</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Photo Upload Zone */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-[#001540]">
                      Galeri Foto Unit (5 - 10 Sudut)
                    </label>
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                      {galleryPhotos.length} Foto
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    {/* Hidden input file */}
                    <input
                      ref={addFileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => handleUploadFiles(e.target.files, false)}
                      className="hidden"
                    />

                    <div className="grid grid-cols-4 gap-2">
                      {galleryPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          className="group relative aspect-video rounded-lg overflow-hidden shadow-xs bg-slate-200 border border-slate-300"
                        >
                          <img
                            src={photo.url}
                            alt="Foto Mobil"
                            className="w-full h-full object-cover"
                          />
                          {photo.isPrimary ? (
                            <span className="absolute bottom-1 right-1 bg-[#001540] text-[9px] text-white px-1.5 py-0.5 rounded font-bold shadow-xs">
                              Utama
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPrimaryPhoto(photo.id, false)}
                              className="absolute bottom-1 right-1 bg-black/60 hover:bg-[#001540] text-[8px] text-white px-1 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              Jadikan Utama
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id, false)}
                            className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                            title="Hapus foto ini"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}

                      {/* Unggah Button */}
                      <button
                        type="button"
                        onClick={() => addFileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="aspect-video rounded-lg bg-white border border-dashed border-blue-400 hover:border-blue-600 flex flex-col items-center justify-center text-blue-600 cursor-pointer hover:bg-blue-50/50 transition-colors shadow-2xs"
                      >
                        {uploadingPhoto ? (
                          <Spinner size={16} />
                        ) : (
                          <>
                            <Camera className="h-4 w-4 text-blue-600" />
                            <span className="text-[9px] mt-0.5 font-bold">+ Unggah</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 text-center">
                      Unggah foto mobil yang ingin Anda tambahkan (PNG/JPG maksimal 8MB).
                    </p>
                  </div>
                </div>

                {/* 11 Features Checklist */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#001540]">Spesifikasi &amp; Fitur Unggulan (Input Klaster)</label>
                    <span className="text-[10px] text-blue-800 font-bold bg-blue-100 px-2 py-0.5 rounded-full">
                      {featureCount} / 11 Terpilih
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {[
                      { id: 'rear_camera', label: 'Kamera belakang' },
                      { id: 'sun_roof', label: 'Sunroof' },
                      { id: 'auto_retract', label: 'Spion lipat otomatis' },
                      { id: 'epb', label: 'Rem parkir elektrik (EPB)' },
                      { id: 'map_nav', label: 'Navigasi GPS bawaan' },
                      { id: 'vsc', label: 'Kontrol stabilitas (VSC)' },
                      { id: 'keyless', label: 'Keyless & Smart Entry' },
                      { id: 'sports_mode', label: 'Mode berkendara sport' },
                      { id: 'camera_360', label: 'Kamera 360 derajat' },
                      { id: 'power_sliding', label: 'Pintu geser elektrik' },
                      { id: 'acc', label: 'Adaptive Cruise Control (ACC)' },
                    ].map((item) => (
                      <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                        <input
                          type="checkbox"
                          checked={features[item.id] || false}
                          onChange={() => toggleFeature(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-[11px] font-medium">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* REAL-TIME ML PANEL */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border border-blue-200 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[#FE6A2B]" />
                      <span className="text-[11px] uppercase font-extrabold text-[#001540]">
                        Algoritma K-Means (k=3)
                      </span>
                    </div>
                    {scenarioPred && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        scenarioPred.evaluasi.apakah_akurat
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {scenarioPred.evaluasi.apakah_akurat ? '✓ Akurat 100%' : '⚠ Beda Prediksi'}
                      </span>
                    )}
                  </div>

                  {/* Sandingkan 3 Skenario Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-blue-200 bg-white p-2 text-center shadow-2xs">
                      <div className="text-[10px] font-bold text-blue-700">Produksi (4 Fitur)</div>
                      <div className="text-[9px] text-slate-400 mb-1">Harga, Thn, KM, Fitur</div>
                      <SegmentBadge klaster={predKlaster} nama={scenarioPred?.produksi.nama_pendek} size="sm" />
                    </div>

                    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-2 text-center shadow-2xs">
                      <div className="text-[10px] font-bold text-purple-700">Skenario A</div>
                      <div className="text-[9px] text-slate-400 mb-1">Harga, Tipe, Tahun</div>
                      <SegmentBadge klaster={scenarioPred?.skenario_a.klaster ?? predKlaster} nama={scenarioPred?.skenario_a.nama_pendek} size="sm" />
                    </div>

                    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-2 text-center shadow-2xs">
                      <div className="text-[10px] font-bold text-teal-700">Skenario B</div>
                      <div className="text-[9px] text-slate-400 mb-1">Harga, KM, Fitur</div>
                      <SegmentBadge klaster={scenarioPred?.skenario_b.klaster ?? predKlaster} nama={scenarioPred?.skenario_b.nama_pendek} size="sm" />
                    </div>
                  </div>

                  {/* Benchmark Diagram with Pin Marker */}
                  <div className="pt-2 border-t border-blue-200/50 space-y-2">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Benchmark Harga Pasar Klaster</span>
                      <span className="text-[11px] font-bold text-[#001540]">
                        Target: Rp {Math.round(formHarga / 1000000)} Jt
                      </span>
                    </div>

                    {/* Bar Track Diagram */}
                    <div className="relative pt-4 pb-2">
                      <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div className="w-1/4 bg-slate-200" />
                        <div className="w-1/2 bg-emerald-200 flex items-center justify-center">
                          <span className="text-[8px] text-emerald-900 font-extrabold uppercase">Rentang Wajar (Q1 - Q3)</span>
                        </div>
                        <div className="w-1/4 bg-slate-200" />
                      </div>

                      <motion.div
                        animate={{ left: `${markerPos}%` }}
                        transition={spring.soft}
                        className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                      >
                        <span className="text-[9px] font-extrabold text-white bg-[#001540] px-1.5 py-0.5 rounded shadow-sm">
                          Rp {Math.round(formHarga / 1000000)} Jt
                        </span>
                        <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-[#001540]" />
                      </motion.div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Q1: Rp {Math.round(predPosisi.q1 / 1000000)} Jt</span>
                      <span className="font-bold text-slate-600">Median: Rp {Math.round(predPosisi.median / 1000000)} Jt</span>
                      <span>Q3: Rp {Math.round(predPosisi.q3 / 1000000)} Jt</span>
                    </div>

                    {/* Verdict Microchip */}
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <Verified className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{predPosisi.verdict}</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {formHarga > predPosisi.median ? `+${Math.round(((formHarga - predPosisi.median) / predPosisi.median) * 100)}%` : `${Math.round(((formHarga - predPosisi.median) / predPosisi.median) * 100)}%`} dari median
                      </span>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-[#001540] hover:bg-[#0F2A5F] text-white font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? <Spinner size={16} /> : 'Tayangkan ke Bursa CekGarasi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toast show={!!toastMsg} message={toastMsg} type="success" onClose={() => setToastMsg('')} />
    </div>
  );
}
