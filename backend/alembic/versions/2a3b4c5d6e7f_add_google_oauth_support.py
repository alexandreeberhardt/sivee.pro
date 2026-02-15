"""Add Google OAuth support

Revision ID: 2a3b4c5d6e7f
Revises: 1ff2366bc5ce
Create Date: 2026-01-30 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2a3b4c5d6e7f"
down_revision: str | Sequence[str] | None = "1ff2366bc5ce"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add google_id column and make password_hash nullable."""
    # Add google_id column
    op.add_column("users", sa.Column("google_id", sa.String(length=255), nullable=True))
    op.create_index(op.f("ix_users_google_id"), "users", ["google_id"], unique=True)

    # Make password_hash nullable for OAuth users
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=True)


def downgrade() -> None:
    """Remove google_id column and make password_hash not nullable."""
    # Make password_hash not nullable again
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=False)

    # Remove google_id column
    op.drop_index(op.f("ix_users_google_id"), table_name="users")
    op.drop_column("users", "google_id")
