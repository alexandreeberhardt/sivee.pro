"""Add guest account support

Revision ID: 3b4c5d6e7f8g
Revises: 2a3b4c5d6e7f
Create Date: 2026-01-31 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3b4c5d6e7f8g"
down_revision: str | Sequence[str] | None = "2a3b4c5d6e7f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add is_guest and created_at columns to users table."""
    # Add is_guest column with default False
    op.add_column(
        "users",
        sa.Column("is_guest", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index(op.f("ix_users_is_guest"), "users", ["is_guest"], unique=False)

    # Add created_at column
    op.add_column("users", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Remove is_guest and created_at columns from users table."""
    op.drop_column("users", "created_at")
    op.drop_index(op.f("ix_users_is_guest"), table_name="users")
    op.drop_column("users", "is_guest")
