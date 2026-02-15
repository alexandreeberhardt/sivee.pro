"""Update feedbacks table schema with new fields

Revision ID: 6e7f8g9h0i1j
Revises: 5d6e7f8g9h0i
Create Date: 2026-02-14 11:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6e7f8g9h0i1j"
down_revision: str | Sequence[str] | None = "5d6e7f8g9h0i"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(table: str, column: str) -> bool:
    """Check if a column exists in a table."""
    conn = op.get_bind()
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :table AND column_name = :column"
        ),
        {"table": table, "column": column},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    """Replace old feedback columns with new survey fields (idempotent)."""
    # Remove old columns if they exist
    for col in ("rating", "liked", "improvement"):
        if _column_exists("feedbacks", col):
            op.drop_column("feedbacks", col)

    # Add new columns if they don't exist
    new_columns = [
        sa.Column("profile", sa.String(100), nullable=True),
        sa.Column("target_sector", sa.String(255), nullable=True),
        sa.Column("ease_rating", sa.Integer(), nullable=False, server_default=sa.text("5")),
        sa.Column("time_spent", sa.String(50), nullable=True),
        sa.Column("obstacles", sa.Text(), nullable=True),
        sa.Column("alternative", sa.String(255), nullable=True),
        sa.Column("suggestions", sa.Text(), nullable=True),
        sa.Column("nps", sa.Integer(), nullable=True),
        sa.Column("future_help", sa.Text(), nullable=True),
    ]
    for col in new_columns:
        if not _column_exists("feedbacks", col.name):
            op.add_column("feedbacks", col)


def downgrade() -> None:
    """Restore old feedback columns."""
    for col in (
        "future_help",
        "nps",
        "suggestions",
        "alternative",
        "obstacles",
        "time_spent",
        "ease_rating",
        "target_sector",
        "profile",
    ):
        if _column_exists("feedbacks", col):
            op.drop_column("feedbacks", col)

    if not _column_exists("feedbacks", "rating"):
        op.add_column(
            "feedbacks",
            sa.Column("rating", sa.Integer(), nullable=False, server_default=sa.text("3")),
        )
    if not _column_exists("feedbacks", "liked"):
        op.add_column("feedbacks", sa.Column("liked", sa.Text(), nullable=True))
    if not _column_exists("feedbacks", "improvement"):
        op.add_column("feedbacks", sa.Column("improvement", sa.Text(), nullable=True))
