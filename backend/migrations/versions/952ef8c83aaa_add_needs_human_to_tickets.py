"""add_needs_human_to_tickets

Revision ID: 952ef8c83aaa
Revises: 32dee88efc8a
Create Date: 2026-04-06 13:21:25.546125

Why this migration exists:
  Migration 32dee88 accidentally dropped the 'needs_human' column.
  The column is required by the AI escalation flow in widget.py --
  when the bot can't answer, it sets needs_human=True so future
  messages go straight to the human inbox instead of the bot.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '952ef8c83aaa'
down_revision: Union[str, None] = '32dee88efc8a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tickets', sa.Column('needs_human', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('tickets', 'needs_human')
