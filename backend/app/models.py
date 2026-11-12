from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    DECIMAL,
    Enum,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    Index,
    DateTime,
    Date,
    Time,
    Integer,
    SmallInteger,
    BigInteger,
    Float,
    JSON,
    text
)
from sqlalchemy.dialects.mysql import (
    TINYINT,
    SMALLINT as MYSQL_SMALLINT,
    INTEGER as MYSQL_INTEGER,
    BIGINT as MYSQL_BIGINT,
    DOUBLE
)
from sqlalchemy.orm import relationship
from .db import Base


class Segment(Base):
    __tablename__ = "segments"

    id = Column(SmallInteger().with_variant(TINYINT(unsigned=True), "mysql"), primary_key=True, autoincrement=False)
    nama_lengkap = Column(String(60), nullable=False, unique=True)
    nama_pendek = Column(String(30), nullable=False, unique=True)
    warna_hex = Column(String(7), nullable=False)
    deskripsi = Column(String(255), nullable=True)

    cars = relationship("Car", back_populates="segment")
    users = relationship("User", back_populates="segmen_awal")


class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer().with_variant(MYSQL_SMALLINT(unsigned=True), "mysql"), primary_key=True, autoincrement=True)
    nama = Column(String(30), nullable=False, unique=True)

    models = relationship("CarModel", back_populates="brand")


class CarModel(Base):
    __tablename__ = "car_models"

    id = Column(Integer().with_variant(MYSQL_SMALLINT(unsigned=True), "mysql"), primary_key=True, autoincrement=True)
    brand_id = Column(Integer().with_variant(MYSQL_SMALLINT(unsigned=True), "mysql"), ForeignKey("brands.id"), nullable=False)
    nama = Column(String(30), nullable=False)
    tipe_bodi = Column(Enum("Hatchback", "MPV", "SUV", "Sedan", "Niaga", name="car_model_tipe_bodi"), nullable=True)

    __table_args__ = (
        UniqueConstraint("brand_id", "nama", name="uq_brand_model"),
    )

    brand = relationship("Brand", back_populates="models")
    cars = relationship("Car", back_populates="car_model")


class Feature(Base):
    __tablename__ = "features"

    id = Column(Integer().with_variant(TINYINT(unsigned=True), "mysql"), primary_key=True, autoincrement=True)
    kode = Column(String(40), nullable=False, unique=True)
    nama_id = Column(String(60), nullable=False)

    car_features = relationship("CarFeature", back_populates="feature")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer().with_variant(MYSQL_INTEGER(unsigned=True), "mysql"), primary_key=True, autoincrement=True)
    nama = Column(String(100), nullable=False)
    email = Column(String(190), nullable=False, unique=True)
    no_hp = Column(String(20), nullable=True)
    nik = Column(String(20), nullable=True)
    jenis_kelamin = Column(String(20), nullable=True)
    tanggal_lahir = Column(String(20), nullable=True)
    pekerjaan = Column(String(80), nullable=True)
    kota_domisili = Column(String(80), nullable=True)
    alamat_lengkap = Column(String(255), nullable=True)
    password_terdaftar = Column(String(120), nullable=True)
    password_hash = Column(String(255), nullable=True)
    firebase_uid = Column(String(128), nullable=True, unique=True)
    role = Column(Enum("pembeli", "admin", name="user_role"), nullable=False, default="pembeli")
    hp_terverifikasi = Column(SmallInteger().with_variant(TINYINT(1), "mysql"), nullable=False, default=0)
    pref_harga_min = Column(BigInteger().with_variant(MYSQL_BIGINT(unsigned=True), "mysql"), nullable=True)
    pref_harga_max = Column(BigInteger().with_variant(MYSQL_BIGINT(unsigned=True), "mysql"), nullable=True)
    pref_tahun_min = Column(SmallInteger().with_variant(MYSQL_SMALLINT(unsigned=True), "mysql"), nullable=True)
    segmen_awal_id = Column(SmallInteger().with_variant(TINYINT(unsigned=True), "mysql"), ForeignKey("segments.id"), nullable=True)
    fokus_penggunaan = Column(String(60), nullable=True)
    cabang = Column(String(60), nullable=True)
    is_active = Column(SmallInteger().with_variant(TINYINT(1), "mysql"), nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=text("CURRENT_TIMESTAMP")
    )

    __table_args__ = (
        CheckConstraint("password_hash IS NOT NULL OR firebase_uid IS NOT NULL", name="ck_user_login"),
    )

    segmen_awal = relationship("Segment", back_populates="users")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    test_drives = relationship("TestDrive", back_populates="user")


class Car(Base):
    __tablename__ = "cars"

    id = Column(Integer().with_variant(MYSQL_INTEGER(unsigned=True), "mysql"), primary_key=True, autoincrement=True)
    nama_mobil = Column(String(100), nullable=False)
    model_id = Column(SmallInteger().with_variant(MYSQL_SMALLINT(unsigned=True), "mysql"), ForeignKey("car_models.id"), nullable=False)
    tahun = Column(SmallInteger().with_variant(MYSQL_SMALLINT(unsigned=True), "mysql"), nullable=False)
    jarak_tempuh_ribu_km = Column(DECIMAL(8, 3), nullable=False)
    lokasi = Column(String(40), nullable=True)
    transmisi = Column(Enum("Manual", "Automatic", name="car_transmisi"), nullable=False)
    jenis_plat = Column(Enum("ganjil", "genap", name="car_plat"), nullable=False)
    harga_rp = Column(BigInteger().with_variant(MYSQL_BIGINT(unsigned=True), "mysql"), nullable=False)
    cicilan_rp = Column(BigInteger().with_variant(MYSQL_BIGINT(unsigned=True), "mysql"), nullable=True)
    total_fitur = Column(SmallInteger().with_variant(TINYINT(unsigned=True), "mysql"), nullable=False, default=0)
    klaster = Column(SmallInteger().with_variant(TINYINT(unsigned=True), "mysql"), ForeignKey("segments.id"), nullable=False)
    pca1 = Column(Float().with_variant(DOUBLE(), "mysql"), nullable=True)
    pca2 = Column(Float().with_variant(DOUBLE(), "mysql"), nullable=True)
    status = Column(Enum("tayang", "draft", name="car_status"), nullable=False, default="tayang")
    foto_url = Column(String(500), nullable=True)
    foto_gallery = Column(JSON, nullable=True)
    dibuat_oleh = Column(Integer().with_variant(MYSQL_INTEGER(unsigned=True), "mysql"), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=text("CURRENT_TIMESTAMP")
    )

    __table_args__ = (
        Index("idx_cars_tahun", "tahun"),
        Index("idx_cars_harga", "harga_rp"),
        Index("idx_cars_klaster_harga", "klaster", "harga_rp"),
        Index("idx_cars_model", "model_id"),
        Index("idx_cars_lokasi", "lokasi"),
        Index("idx_cars_status", "status"),
        CheckConstraint("tahun BETWEEN 1990 AND 2100", name="ck_car_tahun"),
        CheckConstraint("harga_rp > 0", name="ck_car_harga"),
        CheckConstraint("jarak_tempuh_ribu_km >= 0", name="ck_car_km"),
        CheckConstraint("total_fitur BETWEEN 0 AND 11", name="ck_car_fitur"),
    )

    car_model = relationship("CarModel", back_populates="cars")
    segment = relationship("Segment", back_populates="cars")
    creator = relationship("User", foreign_keys=[dibuat_oleh])
    features = relationship("CarFeature", back_populates="car", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="car", cascade="all, delete-orphan")
    test_drives = relationship("TestDrive", back_populates="car")


class CarFeature(Base):
    __tablename__ = "car_features"

    car_id = Column(Integer().with_variant(MYSQL_INTEGER(unsigned=True), "mysql"), ForeignKey("cars.id", ondelete="CASCADE"), primary_key=True)
    feature_id = Column(SmallInteger().with_variant(TINYINT(unsigned=True), "mysql"), ForeignKey("features.id"), primary_key=True)

    car = relationship("Car", back_populates="features")
    feature = relationship("Feature", back_populates="car_features")


class Favorite(Base):
    __tablename__ = "favorites"

    user_id = Column(Integer().with_variant(MYSQL_INTEGER(unsigned=True), "mysql"), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    car_id = Column(Integer().with_variant(MYSQL_INTEGER(unsigned=True), "mysql"), ForeignKey("cars.id", ondelete="CASCADE"), primary_key=True)
    catatan = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))

    __table_args__ = (
        Index("idx_fav_user_created", "user_id", "created_at"),
    )

    user = relationship("User", back_populates="favorites")
    car = relationship("Car", back_populates="favorites")


class ViewHistory(Base):
    __tablename__ = "view_history"

    id = Column(BigInteger().with_variant(MYSQL_BIGINT(unsigned=True), "mysql"), primary_key=True, autoincrement=True)
    user_id = Column(Integer().with_variant(MYSQL_INTEGER(unsigned=True), "mysql"), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    car_id = Column(Integer().with_variant(MYSQL_INTEGER(unsigned=True), "mysql"), ForeignKey("cars.id", ondelete="CASCADE"), nullable=False)
    dilihat_pada = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))

    __table_args__ = (
        Index("idx_vh_user_time", "user_id", "dilihat_pada"),
    )


class TestDrive(Base):
    __tablename__ = "test_drives"

    id = Column(Integer().with_variant(MYSQL_INTEGER(unsigned=True), "mysql"), primary_key=True, autoincrement=True)
    kode = Column(String(20), nullable=False, unique=True)
    user_id = Column(Integer().with_variant(MYSQL_INTEGER(unsigned=True), "mysql"), ForeignKey("users.id"), nullable=False)
    car_id = Column(Integer().with_variant(MYSQL_INTEGER(unsigned=True), "mysql"), ForeignKey("cars.id"), nullable=False)
    tanggal = Column(Date, nullable=False)
    jam = Column(Time, nullable=False)
    cabang = Column(String(60), nullable=False)
    catatan = Column(String(500), nullable=True)
    status = Column(Enum("menunggu", "terkonfirmasi", "selesai", "dibatalkan", name="td_status"), nullable=False, default="menunggu")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=text("CURRENT_TIMESTAMP")
    )

    __table_args__ = (
        Index("idx_td_status_tanggal", "status", "tanggal"),
        Index("idx_td_car", "car_id"),
    )

    user = relationship("User", back_populates="test_drives")
    car = relationship("Car", back_populates="test_drives")


class MLEvaluasiK(Base):
    __tablename__ = "ml_evaluasi_k"

    k = Column(SmallInteger().with_variant(TINYINT(unsigned=True), "mysql"), primary_key=True, autoincrement=False)
    inertia = Column(Float().with_variant(DOUBLE(), "mysql"), nullable=False)
    silhouette = Column(Float().with_variant(DOUBLE(), "mysql"), nullable=False)
    is_production = Column(SmallInteger().with_variant(TINYINT(1), "mysql"), nullable=False, default=0)
    sumber = Column(Enum("notebook", "server", name="eval_sumber"), nullable=False, default="notebook")


class MLMetrik(Base):
    __tablename__ = "ml_metrik"

    kunci = Column(String(60), primary_key=True)
    nilai = Column(Float().with_variant(DOUBLE(), "mysql"), nullable=False)
    keterangan = Column(String(255), nullable=True)


class MLUjiSkenario(Base):
    __tablename__ = "ml_uji_skenario"

    id = Column(Integer().with_variant(MYSQL_INTEGER(unsigned=True), "mysql"), primary_key=True, autoincrement=True)
    nama = Column(String(20), nullable=False)
    fitur = Column(JSON, nullable=False)
    pakai_tipe = Column(SmallInteger().with_variant(TINYINT(1), "mysql"), nullable=False, default=0)
    k = Column(SmallInteger().with_variant(TINYINT(unsigned=True), "mysql"), nullable=False)
    silhouette = Column(Float().with_variant(DOUBLE(), "mysql"), nullable=False)
    davies_bouldin = Column(Float().with_variant(DOUBLE(), "mysql"), nullable=False)
    calinski_harabasz = Column(Float().with_variant(DOUBLE(), "mysql"), nullable=False)
    silhouette_uji = Column(Float().with_variant(DOUBLE(), "mysql"), nullable=False)
    ari_rata = Column(Float().with_variant(DOUBLE(), "mysql"), nullable=False)
    ari_min = Column(Float().with_variant(DOUBLE(), "mysql"), nullable=False)
    dibuat_pada = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))
