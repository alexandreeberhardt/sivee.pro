"""Add feedback table and bonus columns to users

Revision ID: 5d6e7f8g9h0i
Revises: 4c5d6e7f8g9h
Create Date: 2026-02-14 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5d6e7f8g9h0i"
down_revision: str | Sequence[str] | None = "4c5d6e7f8g9h"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add feedback_completed_at, bonus_resumes, bonus_downloads and feedbacks table."""
    # Add bonus columns to users
    op.add_column(
        "users",
        sa.Column("feedback_completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("bonus_resumes", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "users",
        sa.Column("bonus_downloads", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )

    # Create feedbacks table
    op.create_table(
        "feedbacks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("profile", sa.String(100), nullable=True),
        sa.Column("target_sector", sa.String(255), nullable=True),
        sa.Column("source", sa.String(100), nullable=True),
        sa.Column("ease_rating", sa.Integer(), nullable=False),
        sa.Column("time_spent", sa.String(50), nullable=True),
        sa.Column("obstacles", sa.Text(), nullable=True),
        sa.Column("alternative", sa.String(255), nullable=True),
        sa.Column("suggestions", sa.Text(), nullable=True),
        sa.Column("nps", sa.Integer(), nullable=True),
        sa.Column("future_help", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_feedbacks_id", "feedbacks", ["id"])


def downgrade() -> None:
    """Remove feedbacks table and bonus columns from users."""
    op.drop_index("ix_feedbacks_id", table_name="feedbacks")
    op.drop_table("feedbacks")
    op.drop_column("users", "bonus_downloads")
    op.drop_column("users", "bonus_resumes")
    op.drop_column("users", "feedback_completed_at")
