"""Initial schema matching schema.sql

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-15 13:54:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. segments
    op.create_table(
        'segments',
        sa.Column('id', sa.SmallInteger(), nullable=False),
        sa.Column('nama_lengkap', sa.String(length=60), nullable=False),
        sa.Column('nama_pendek', sa.String(length=30), nullable=False),
        sa.Column('warna_hex', sa.String(length=7), nullable=False),
        sa.Column('deskripsi', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nama_lengkap'),
        sa.UniqueConstraint('nama_pendek'),
        mysql_engine='InnoDB'
    )

    # 2. brands
    op.create_table(
        'brands',
        sa.Column('id', sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column('nama', sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nama'),
        mysql_engine='InnoDB'
    )

    # 3. car_models
    op.create_table(
        'car_models',
        sa.Column('id', sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column('brand_id', sa.SmallInteger(), nullable=False),
        sa.Column('nama', sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(['brand_id'], ['brands.id'], name='fk_model_brand'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('brand_id', 'nama', name='uq_brand_model'),
        mysql_engine='InnoDB'
    )

    # 4. features
    op.create_table(
        'features',
        sa.Column('id', sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column('kode', sa.String(length=40), nullable=False),
        sa.Column('nama_id', sa.String(length=60), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('kode'),
        mysql_engine='InnoDB'
    )

    # 5. users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nama', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=190), nullable=False),
        sa.Column('no_hp', sa.String(length=20), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('firebase_uid', sa.String(length=128), nullable=True),
        sa.Column('role', sa.Enum('pembeli', 'admin'), server_default='pembeli', nullable=False),
        sa.Column('hp_terverifikasi', sa.SmallInteger(), server_default='0', nullable=False),
        sa.Column('pref_harga_min', sa.BigInteger(), nullable=True),
        sa.Column('pref_harga_max', sa.BigInteger(), nullable=True),
        sa.Column('pref_tahun_min', sa.SmallInteger(), nullable=True),
        sa.Column('segmen_awal_id', sa.SmallInteger(), nullable=True),
        sa.Column('cabang', sa.String(length=60), nullable=True),
        sa.Column('is_active', sa.SmallInteger(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=False),
        sa.CheckConstraint('password_hash IS NOT NULL OR firebase_uid IS NOT NULL', name='ck_user_login'),
        sa.ForeignKeyConstraint(['segmen_awal_id'], ['segments.id'], name='fk_user_segmen'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('firebase_uid'),
        mysql_engine='InnoDB'
    )

    # 6. cars
    op.create_table(
        'cars',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nama_mobil', sa.String(length=100), nullable=False),
        sa.Column('model_id', sa.SmallInteger(), nullable=False),
        sa.Column('tahun', sa.SmallInteger(), nullable=False),
        sa.Column('jarak_tempuh_ribu_km', sa.DECIMAL(precision=8, scale=3), nullable=False),
        sa.Column('lokasi', sa.String(length=40), nullable=True),
        sa.Column('transmisi', sa.Enum('Manual', 'Automatic'), nullable=False),
        sa.Column('jenis_plat', sa.Enum('ganjil', 'genap'), nullable=False),
        sa.Column('harga_rp', sa.BigInteger(), nullable=False),
        sa.Column('cicilan_rp', sa.BigInteger(), nullable=True),
        sa.Column('total_fitur', sa.SmallInteger(), server_default='0', nullable=False),
        sa.Column('klaster', sa.SmallInteger(), nullable=False),
        sa.Column('pca1', sa.Float(), nullable=True),
        sa.Column('pca2', sa.Float(), nullable=True),
        sa.Column('status', sa.Enum('tayang', 'draft'), server_default='tayang', nullable=False),
        sa.Column('dibuat_oleh', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=False),
        sa.CheckConstraint('tahun BETWEEN 1990 AND 2100', name='ck_car_tahun'),
        sa.CheckConstraint('harga_rp > 0', name='ck_car_harga'),
        sa.CheckConstraint('jarak_tempuh_ribu_km >= 0', name='ck_car_km'),
        sa.CheckConstraint('total_fitur BETWEEN 0 AND 11', name='ck_car_fitur'),
        sa.ForeignKeyConstraint(['dibuat_oleh'], ['users.id'], name='fk_car_admin', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['klaster'], ['segments.id'], name='fk_car_segmen'),
        sa.ForeignKeyConstraint(['model_id'], ['car_models.id'], name='fk_car_model'),
        sa.PrimaryKeyConstraint('id'),
        mysql_engine='InnoDB'
    )
    op.create_index('idx_cars_tahun', 'cars', ['tahun'])
    op.create_index('idx_cars_harga', 'cars', ['harga_rp'])
    op.create_index('idx_cars_klaster_harga', 'cars', ['klaster', 'harga_rp'])
    op.create_index('idx_cars_model', 'cars', ['model_id'])
    op.create_index('idx_cars_lokasi', 'cars', ['lokasi'])
    op.create_index('idx_cars_status', 'cars', ['status'])

    # 7. car_features
    op.create_table(
        'car_features',
        sa.Column('car_id', sa.Integer(), nullable=False),
        sa.Column('feature_id', sa.SmallInteger(), nullable=False),
        sa.ForeignKeyConstraint(['car_id'], ['cars.id'], name='fk_cf_car', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['feature_id'], ['features.id'], name='fk_cf_feature'),
        sa.PrimaryKeyConstraint('car_id', 'feature_id'),
        mysql_engine='InnoDB'
    )

    # 8. favorites
    op.create_table(
        'favorites',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('car_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['car_id'], ['cars.id'], name='fk_fav_car', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_fav_user', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'car_id'),
        mysql_engine='InnoDB'
    )

    # 9. view_history
    op.create_table(
        'view_history',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('car_id', sa.Integer(), nullable=False),
        sa.Column('dilihat_pada', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['car_id'], ['cars.id'], name='fk_vh_car', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_vh_user', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        mysql_engine='InnoDB'
    )
    op.create_index('idx_vh_user_time', 'view_history', ['user_id', 'dilihat_pada'])

    # 10. test_drives
    op.create_table(
        'test_drives',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('kode', sa.String(length=20), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('car_id', sa.Integer(), nullable=False),
        sa.Column('tanggal', sa.Date(), nullable=False),
        sa.Column('jam', sa.Time(), nullable=False),
        sa.Column('cabang', sa.String(length=60), nullable=False),
        sa.Column('catatan', sa.String(length=500), nullable=True),
        sa.Column('status', sa.Enum('menunggu', 'terkonfirmasi', 'selesai', 'dibatalkan'), server_default='menunggu', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['car_id'], ['cars.id'], name='fk_td_car'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_td_user'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('kode'),
        mysql_engine='InnoDB'
    )
    op.create_index('idx_td_status_tanggal', 'test_drives', ['status', 'tanggal'])
    op.create_index('idx_td_car', 'test_drives', ['car_id'])

    # 11. ml_evaluasi_k
    op.create_table(
        'ml_evaluasi_k',
        sa.Column('k', sa.SmallInteger(), nullable=False),
        sa.Column('inertia', sa.Float(), nullable=False),
        sa.Column('silhouette', sa.Float(), nullable=False),
        sa.Column('is_production', sa.SmallInteger(), server_default='0', nullable=False),
        sa.Column('sumber', sa.Enum('notebook', 'server'), server_default='notebook', nullable=False),
        sa.PrimaryKeyConstraint('k'),
        mysql_engine='InnoDB'
    )

    # 12. ml_metrik
    op.create_table(
        'ml_metrik',
        sa.Column('kunci', sa.String(length=60), nullable=False),
        sa.Column('nilai', sa.Float(), nullable=False),
        sa.Column('keterangan', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('kunci'),
        mysql_engine='InnoDB'
    )

    # 13. view v_cars_lengkap
    op.execute("""
    CREATE OR REPLACE VIEW v_cars_lengkap AS
    SELECT c.*, b.nama AS merek, m.nama AS model_mobil, s.nama_lengkap AS segmen_nama,
           s.nama_pendek AS segmen_pendek, s.warna_hex AS segmen_warna
    FROM cars c
    JOIN car_models m ON m.id = c.model_id
    JOIN brands b ON b.id = m.brand_id
    JOIN segments s ON s.id = c.klaster;
    """)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_cars_lengkap;")
    op.drop_table('ml_metrik')
    op.drop_table('ml_evaluasi_k')
    op.drop_table('test_drives')
    op.drop_table('view_history')
    op.drop_table('favorites')
    op.drop_table('car_features')
    op.drop_table('cars')
    op.drop_table('users')
    op.drop_table('features')
    op.drop_table('car_models')
    op.drop_table('brands')
    op.drop_table('segments')
