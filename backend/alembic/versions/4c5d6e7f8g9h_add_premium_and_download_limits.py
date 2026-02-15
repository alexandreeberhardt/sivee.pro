"""Add premium tier and download limits

Revision ID: 4c5d6e7f8g9h
Revises: 3b4c5d6e7f8g
Create Date: 2026-02-13 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4c5d6e7f8g9h"
down_revision: str | Sequence[str] | None = "3b4c5d6e7f8g"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add is_premium, download_count, download_count_reset_at columns to users table."""
    op.add_column(
        "users",
        sa.Column("is_premium", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "users",
        sa.Column("download_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "users",
        sa.Column("download_count_reset_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Remove premium and download limit columns from users table."""
    op.drop_column("users", "download_count_reset_at")
    op.drop_column("users", "download_count")
    op.drop_column("users", "is_premium")
