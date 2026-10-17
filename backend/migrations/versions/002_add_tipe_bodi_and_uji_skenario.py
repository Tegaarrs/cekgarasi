"""Add tipe_bodi to car_models and add ml_uji_skenario table

Revision ID: 002_tipe_bodi_uji_skenario
Revises: 001_initial_schema
Create Date: 2026-10-16 16:35:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_tipe_bodi_uji_skenario'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TIPE_BODI = {
    # Hatchback
    'AYLA': 'Hatchback', 'AGYA': 'Hatchback', 'BRIO': 'Hatchback', 'YARIS': 'Hatchback',
    'JAZZ': 'Hatchback', 'IGNIS': 'Hatchback', 'BALENO': 'Hatchback', 'S-PRESSO': 'Hatchback',
    'KARIMUN': 'Hatchback', 'SIRION': 'Hatchback', 'MARCH': 'Hatchback', 'MAZDA 2': 'Hatchback',
    'SPARK': 'Hatchback', 'GO': 'Hatchback',
    
    # MPV
    'AVANZA': 'MPV', 'XPANDER': 'MPV', 'KIJANG INNOVA': 'MPV', 'ERTIGA': 'MPV',
    'XENIA': 'MPV', 'CALYA': 'MPV', 'SIGRA': 'MPV', 'MOBILIO': 'MPV',
    'SIENTA': 'MPV', 'CONFERO': 'MPV', 'CORTEZ': 'MPV', 'STARGAZER': 'MPV',
    'GRAND LIVINA': 'MPV', 'LIVINA': 'MPV', 'SERENA': 'MPV', 'BIANTE': 'MPV',
    'FREED': 'MPV', 'GO+': 'MPV',

    # SUV
    'HR-V': 'SUV', 'CR-V': 'SUV', 'BR-V': 'SUV', 'PAJERO': 'SUV',
    'FORTUNER': 'SUV', 'RUSH': 'SUV', 'TERIOS': 'SUV', 'ALMAZ': 'SUV',
    'CRETA': 'SUV', 'SANTA FE': 'SUV', 'RAIZE': 'SUV', 'ROCKY': 'SUV',
    'XL7': 'SUV', 'CX-5': 'SUV', 'CX-3': 'SUV', 'OUTLANDER': 'SUV',
    'ECLIPSE': 'SUV', 'X-TRAIL': 'SUV', 'JUKE': 'SUV', 'SX4': 'SUV',
    'CROSS': 'SUV', 'ECOSPORT': 'SUV',

    # Sedan
    'CIVIC': 'Sedan', 'CITY': 'Sedan', 'BMW 3': 'Sedan',

    # Niaga
    'CARRY': 'Niaga', 'COLT': 'Niaga'
}


def upgrade() -> None:
    # 1. Add column tipe_bodi to car_models
    with op.batch_alter_table('car_models') as batch_op:
        batch_op.add_column(
            sa.Column('tipe_bodi', sa.Enum('Hatchback', 'MPV', 'SUV', 'Sedan', 'Niaga', name='car_model_tipe_bodi'), nullable=True)
        )

    # 2. Fill car_models.tipe_bodi with mapping by model name
    car_models_table = sa.table(
        'car_models',
        sa.column('nama', sa.String),
        sa.column('tipe_bodi', sa.String)
    )
    for model_name, tipe in TIPE_BODI.items():
        op.execute(
            car_models_table.update().where(car_models_table.c.nama == model_name).values(tipe_bodi=tipe)
        )

    # 3. Create ml_uji_skenario table
    op.create_table(
        'ml_uji_skenario',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nama', sa.String(length=20), nullable=False),
        sa.Column('fitur', sa.JSON(), nullable=False),
        sa.Column('pakai_tipe', sa.SmallInteger(), nullable=False, server_default='0'),
        sa.Column('k', sa.SmallInteger(), nullable=False),
        sa.Column('silhouette', sa.Float(), nullable=False),
        sa.Column('davies_bouldin', sa.Float(), nullable=False),
        sa.Column('calinski_harabasz', sa.Float(), nullable=False),
        sa.Column('silhouette_uji', sa.Float(), nullable=False),
        sa.Column('ari_rata', sa.Float(), nullable=False),
        sa.Column('ari_min', sa.Float(), nullable=False),
        sa.Column('dibuat_pada', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        mysql_engine='InnoDB'
    )


def downgrade() -> None:
    op.drop_table('ml_uji_skenario')
    with op.batch_alter_table('car_models') as batch_op:
        batch_op.drop_column('tipe_bodi')
