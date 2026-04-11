"""add_organisation_columns

Revision ID: a719c288dcf1
Revises: 952ef8c83aaa
Create Date: 2026-04-11 10:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a719c288dcf1'
down_revision: Union[str, None] = '952ef8c83aaa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to 'organisations' table
    op.add_column('organisations', sa.Column('allowed_domains', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=False))
    op.add_column('organisations', sa.Column('paypal_sub_id', sa.String(length=255), nullable=True))
    op.add_column('organisations', sa.Column('sub_status', sa.String(length=50), server_default='inactive', nullable=False))
    op.add_column('organisations', sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('organisations', 'trial_ends_at')
    op.drop_column('organisations', 'sub_status')
    op.drop_column('organisations', 'paypal_sub_id')
    op.drop_column('organisations', 'allowed_domains')
