from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import date, time, datetime


# Auth Schemas
class UserRegister(BaseModel):
    nama: str = Field(..., min_length=2, max_length=100)
    email: str
    password: str = Field(..., min_length=6)
    no_hp: Optional[str] = None
    no_telepon: Optional[str] = None
    nik: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    pekerjaan: Optional[str] = None
    kota_domisili: Optional[str] = None
    alamat_lengkap: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class GoogleLogin(BaseModel):
    id_token: str


class VerifyOtp(BaseModel):
    no_hp: Optional[str] = None
    no_telepon: Optional[str] = None
    email: Optional[str] = None
    otp: Optional[str] = None
    kode_otp: Optional[str] = None


class BuyerPreference(BaseModel):
    pref_harga_min: Optional[int] = None
    pref_harga_max: Optional[int] = None
    segmen_awal_id: Optional[int] = None
    fokus_penggunaan: Optional[str] = None
    tahun_min: Optional[int] = None
    harga_min: Optional[int] = None
    harga_max: Optional[int] = None


class UserOut(BaseModel):
    id: int
    nama: str
    email: str
    no_hp: Optional[str] = None
    nik: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    pekerjaan: Optional[str] = None
    kota_domisili: Optional[str] = None
    alamat_lengkap: Optional[str] = None
    role: str
    hp_terverifikasi: int
    pref_harga_min: Optional[int] = None
    pref_harga_max: Optional[int] = None
    pref_tahun_min: Optional[int] = None
    segmen_awal_id: Optional[int] = None
    fokus_penggunaan: Optional[str] = None
    cabang: Optional[str] = None

    class Config:
        from_attributes = True


class AdminUserCreate(BaseModel):
    nama: str
    email: str
    no_hp: Optional[str] = None
    nik: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    pekerjaan: Optional[str] = None
    kota_domisili: Optional[str] = None
    alamat_lengkap: Optional[str] = None
    password: Optional[str] = "password123"
    role: Optional[str] = "pembeli"
    hp_terverifikasi: Optional[int] = 1
    pref_harga_min: Optional[int] = None
    pref_harga_max: Optional[int] = None
    segmen_awal_id: Optional[int] = None
    fokus_penggunaan: Optional[str] = None


class AdminUserUpdate(BaseModel):
    nama: Optional[str] = None
    email: Optional[str] = None
    no_hp: Optional[str] = None
    nik: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    pekerjaan: Optional[str] = None
    kota_domisili: Optional[str] = None
    alamat_lengkap: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    hp_terverifikasi: Optional[int] = None
    pref_harga_min: Optional[int] = None
    pref_harga_max: Optional[int] = None
    segmen_awal_id: Optional[int] = None
    fokus_penggunaan: Optional[str] = None
    is_active: Optional[int] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# Buyer & Common Schemas
class SegmentStat(BaseModel):
    count: int
    share: float
    q1_harga: float
    median_harga: float
    q3_harga: float
    median_tahun: int
    mean_km: float
    mean_total_fitur: float
    share_automatic: float


class SegmentOut(BaseModel):
    id: int
    nama_lengkap: str
    nama_pendek: str
    warna_hex: str
    deskripsi: Optional[str] = None
    stats: Optional[SegmentStat] = None

    class Config:
        from_attributes = True


class FeatureOut(BaseModel):
    id: int
    kode: str
    nama_id: str

    class Config:
        from_attributes = True


class CarListItem(BaseModel):
    id: int
    nama_mobil: str
    merek: str
    model_mobil: str
    tahun: int
    jarak_tempuh_ribu_km: float
    lokasi: Optional[str] = None
    transmisi: str
    jenis_plat: str
    harga_rp: int
    cicilan_rp: Optional[int] = None
    total_fitur: int
    klaster: int
    segmen_nama: str
    segmen_pendek: str
    segmen_warna: str
    status: str
    foto_url: Optional[str] = None
    foto_gallery: Optional[List[str]] = None
    pca1: Optional[float] = None
    pca2: Optional[float] = None

    class Config:
        from_attributes = True


class PosisiHarga(BaseModel):
    q1: Optional[float] = None
    median: Optional[float] = None
    q3: Optional[float] = None
    verdict: str
    selisih_median_rp: float


class CarDetail(CarListItem):
    features: List[FeatureOut] = []
    posisi_harga: Optional[PosisiHarga] = None
    mobil_serupa: List[CarListItem] = []


class SegmenCocok(BaseModel):
    id: int
    nama: str
    median_harga: float
    tahun_tipikal: int


class SearchResult(BaseModel):
    hasil: List[CarListItem]
    total: int
    segmen_cocok: Optional[SegmenCocok] = None
    rekomendasi: List[CarListItem] = []


class FilterOptions(BaseModel):
    brands: List[str]
    models: List[str]
    transmisi: List[str]
    lokasi: List[str]
    tahun_min: int
    tahun_max: int
    harga_min: int
    harga_max: int


class UserPreferenceIn(BaseModel):
    pref_harga_min: Optional[int] = None
    pref_harga_max: Optional[int] = None
    pref_tahun_min: Optional[int] = None


class TestDriveCreate(BaseModel):
    car_id: Optional[int] = None
    mobil_id: Optional[int] = None
    tanggal: Optional[date] = None
    tanggal_booking: Optional[str] = None
    jam: Optional[time] = None
    jam_booking: Optional[str] = None
    cabang: str = "Jakarta Pusat"
    catatan: Optional[str] = None
    nama_pemesan: Optional[str] = None
    no_telepon: Optional[str] = None


class TestDriveOut(BaseModel):
    id: int
    kode: str
    user_id: int
    car_id: int
    nama_mobil: Optional[str] = None
    tanggal: date
    jam: time
    cabang: str
    catatan: Optional[str] = None
    status: str
    created_at: datetime
    nama_user: Optional[str] = None
    email_user: Optional[str] = None
    no_hp_user: Optional[str] = None

    class Config:
        from_attributes = True


# Admin Schemas
class AdminSummary(BaseModel):
    total_stok: int
    median_harga: int
    jumlah_segmen: int
    silhouette_k3: float
    test_drive_minggu_ini: int
    insights: List[str]
    harga_di_luar_rentang: List[CarListItem]


class AdminPredictSegmentIn(BaseModel):
    tahun: int = Field(..., ge=1990, le=2100)
    jarak_tempuh_ribu_km: float = Field(..., ge=0)
    harga_rp: int = Field(..., gt=0)
    total_fitur: int = Field(..., ge=0, le=11)


class AdminPredictSegmentOut(BaseModel):
    klaster: int
    nama_segmen: str
    nama_pendek: str
    warna: str
    benchmark_harga: PosisiHarga


class AdminCarSaveIn(BaseModel):
    nama_mobil: str = Field(..., min_length=2, max_length=100)
    model_id: int
    tahun: int = Field(..., ge=1990, le=2100)
    jarak_tempuh_ribu_km: float = Field(..., ge=0)
    lokasi: Optional[str] = None
    transmisi: str
    jenis_plat: str
    harga_rp: int = Field(..., gt=0)
    cicilan_rp: Optional[int] = None
    feature_ids: List[int] = []
    status: str = "tayang"


class AdminExperimentIn(BaseModel):
    k: int = Field(..., ge=2, le=6)


class EksperimenKRequest(BaseModel):
    k: int = Field(..., ge=2, le=6)


class PrediksiSegmenRequest(BaseModel):
    tahun: int = Field(..., ge=1990, le=2100)
    jarak_tempuh_ribu_km: float = Field(..., ge=0)
    harga_rp: int = Field(..., gt=0)
    total_fitur: int = Field(..., ge=0, le=11)


class CarCreate(BaseModel):
    nama_mobil: str
    merek: str
    model_mobil: str
    tipe_bodi: Optional[str] = None
    tahun: int
    jarak_tempuh_ribu_km: float
    lokasi: Optional[str] = None
    transmisi: str = "Automatic"
    jenis_plat: str = "ganjil"
    harga_rp: int
    cicilan_rp: Optional[int] = None
    feature_ids: List[int] = []
    status: str = "tayang"
    foto_url: Optional[str] = None
    foto_gallery: Optional[List[str]] = None


class CarUpdate(BaseModel):
    nama_mobil: Optional[str] = None
    merek: Optional[str] = None
    model_mobil: Optional[str] = None
    tipe_bodi: Optional[str] = None
    tahun: Optional[int] = None
    jarak_tempuh_ribu_km: Optional[float] = None
    lokasi: Optional[str] = None
    transmisi: Optional[str] = None
    jenis_plat: Optional[str] = None
    harga_rp: Optional[int] = None
    cicilan_rp: Optional[int] = None
    feature_ids: Optional[List[int]] = None
    status: Optional[str] = None
    foto_url: Optional[str] = None
    foto_gallery: Optional[List[str]] = None


class BulkStatusUpdate(BaseModel):
    car_ids: List[int]
    status: str


class BulkDeleteRequest(BaseModel):
    car_ids: List[int]


class LeadStatusUpdate(BaseModel):
    status: str


class UjiSkenarioRequest(BaseModel):
    skenario: str = Field(..., pattern="^(produksi|A|B)$")
    k: int = Field(..., ge=2, le=6)


class UjiKomparasiSkenarioRequest(BaseModel):
    harga_rp: float = Field(..., gt=0)
    tahun: int = Field(..., ge=1990, le=2030)
    jarak_tempuh_ribu_km: float = Field(..., ge=0)
    total_fitur: int = Field(default=3, ge=0, le=20)
    tipe_bodi: str = Field(default="MPV")


class FavoriteIn(BaseModel):
    car_id: int


class FavoriteNoteUpdate(BaseModel):
    catatan: Optional[str] = Field(None, max_length=500)


