"""Add catatan and idx_fav_user_created to favorites table

Revision ID: 003_fav_catatan_index
Revises: 002_tipe_bodi_uji_skenario
Create Date: 2026-10-19 13:15:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_fav_catatan_index'
down_revision: Union[str, None] = '002_tipe_bodi_uji_skenario'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('favorites') as batch_op:
        batch_op.add_column(sa.Column('catatan', sa.String(length=500), nullable=True))
        batch_op.create_index('idx_fav_user_created', ['user_id', 'created_at'])


def downgrade() -> None:
    with op.batch_alter_table('favorites') as batch_op:
        batch_op.drop_index('idx_fav_user_created')
        batch_op.drop_column('catatan')
