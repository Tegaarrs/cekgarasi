CREATE DATABASE IF NOT EXISTS cekgarasi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cekgarasi;

CREATE TABLE segments (            -- lookup; id = K-Means cluster id
  id TINYINT UNSIGNED PRIMARY KEY,
  nama_lengkap VARCHAR(60) NOT NULL UNIQUE,
  nama_pendek VARCHAR(30) NOT NULL UNIQUE,
  warna_hex CHAR(7) NOT NULL,
  deskripsi VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE brands (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE car_models (          -- value of model_mobil, uppercase, e.g. 'BRIO'
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id SMALLINT UNSIGNED NOT NULL,
  nama VARCHAR(30) NOT NULL,
  UNIQUE KEY uq_brand_model (brand_id, nama),
  CONSTRAINT fk_model_brand FOREIGN KEY (brand_id) REFERENCES brands(id)
) ENGINE=InnoDB;

CREATE TABLE features (            -- the 11 binary car features
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(40) NOT NULL UNIQUE,
  nama_id VARCHAR(60) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  no_hp VARCHAR(20) NULL,
  password_hash VARCHAR(255) NULL,
  firebase_uid VARCHAR(128) NULL UNIQUE,
  role ENUM('pembeli','admin') NOT NULL DEFAULT 'pembeli',
  hp_terverifikasi TINYINT(1) NOT NULL DEFAULT 0,
  pref_harga_min BIGINT UNSIGNED NULL,
  pref_harga_max BIGINT UNSIGNED NULL,
  pref_tahun_min SMALLINT UNSIGNED NULL,
  segmen_awal_id TINYINT UNSIGNED NULL,
  cabang VARCHAR(60) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_segmen FOREIGN KEY (segmen_awal_id) REFERENCES segments(id),
  CONSTRAINT ck_user_login CHECK (password_hash IS NOT NULL OR firebase_uid IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE cars (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama_mobil VARCHAR(100) NOT NULL,
  model_id SMALLINT UNSIGNED NOT NULL,
  tahun SMALLINT UNSIGNED NOT NULL,
  jarak_tempuh_ribu_km DECIMAL(8,3) NOT NULL,   -- thousands of km
  lokasi VARCHAR(40) NULL,                      -- NULL when source value was 'Unknown'
  transmisi ENUM('Manual','Automatic') NOT NULL,
  jenis_plat ENUM('ganjil','genap') NOT NULL,   -- 'odd plate' -> ganjil, 'even plate' -> genap
  harga_rp BIGINT UNSIGNED NOT NULL,            -- rupiah
  cicilan_rp BIGINT UNSIGNED NULL,              -- informational only, NEVER an ML feature
  total_fitur TINYINT UNSIGNED NOT NULL DEFAULT 0,  -- must equal COUNT(car_features) for the car
  klaster TINYINT UNSIGNED NOT NULL,
  pca1 DOUBLE NULL,
  pca2 DOUBLE NULL,
  status ENUM('tayang','draft') NOT NULL DEFAULT 'tayang',
  dibuat_oleh INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cars_tahun (tahun),
  KEY idx_cars_harga (harga_rp),
  KEY idx_cars_klaster_harga (klaster, harga_rp),
  KEY idx_cars_model (model_id),
  KEY idx_cars_lokasi (lokasi),
  KEY idx_cars_status (status),
  CONSTRAINT fk_car_model FOREIGN KEY (model_id) REFERENCES car_models(id),
  CONSTRAINT fk_car_segmen FOREIGN KEY (klaster) REFERENCES segments(id),
  CONSTRAINT fk_car_admin FOREIGN KEY (dibuat_oleh) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT ck_car_tahun CHECK (tahun BETWEEN 1990 AND 2100),
  CONSTRAINT ck_car_harga CHECK (harga_rp > 0),
  CONSTRAINT ck_car_km CHECK (jarak_tempuh_ribu_km >= 0),
  CONSTRAINT ck_car_fitur CHECK (total_fitur BETWEEN 0 AND 11)
) ENGINE=InnoDB;

CREATE TABLE car_features (
  car_id INT UNSIGNED NOT NULL,
  feature_id TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (car_id, feature_id),
  CONSTRAINT fk_cf_car FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
  CONSTRAINT fk_cf_feature FOREIGN KEY (feature_id) REFERENCES features(id)
) ENGINE=InnoDB;

CREATE TABLE favorites (
  user_id INT UNSIGNED NOT NULL,
  car_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, car_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_car FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE view_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  car_id INT UNSIGNED NOT NULL,
  dilihat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vh_user_time (user_id, dilihat_pada),
  CONSTRAINT fk_vh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_vh_car FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE test_drives (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(20) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL,
  car_id INT UNSIGNED NOT NULL,
  tanggal DATE NOT NULL,
  jam TIME NOT NULL,
  cabang VARCHAR(60) NOT NULL,
  catatan VARCHAR(500) NULL,
  status ENUM('menunggu','terkonfirmasi','selesai','dibatalkan') NOT NULL DEFAULT 'menunggu',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_td_status_tanggal (status, tanggal),
  KEY idx_td_car (car_id),
  CONSTRAINT fk_td_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_td_car FOREIGN KEY (car_id) REFERENCES cars(id)
) ENGINE=InnoDB;

CREATE TABLE ml_evaluasi_k (       -- results of the training notebook, k = 2..6
  k TINYINT UNSIGNED PRIMARY KEY,
  inertia DOUBLE NOT NULL,
  silhouette DOUBLE NOT NULL,
  is_production TINYINT(1) NOT NULL DEFAULT 0,
  sumber ENUM('notebook','server') NOT NULL DEFAULT 'notebook'
) ENGINE=InnoDB;

CREATE TABLE ml_metrik (           -- validation metrics from the notebook
  kunci VARCHAR(60) PRIMARY KEY,
  nilai DOUBLE NOT NULL,
  keterangan VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE VIEW v_cars_lengkap AS
SELECT c.*, b.nama AS merek, m.nama AS model_mobil, s.nama_lengkap AS segmen_nama,
       s.nama_pendek AS segmen_pendek, s.warna_hex AS segmen_warna
FROM cars c
JOIN car_models m ON m.id = c.model_id
JOIN brands b ON b.id = m.brand_id
JOIN segments s ON s.id = c.klaster;
