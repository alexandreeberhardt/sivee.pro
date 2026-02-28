# Database

## Schema

```
┌──────────────────────────────────────────┐       ┌──────────────────────────────┐
│                 users                    │       │          resumes             │
├──────────────────────────────────────────┤       ├──────────────────────────────┤
│ id                    INTEGER  PK        │──┐    │ id           INTEGER  PK     │
│ email                 VARCHAR(255)       │  │    │ user_id      INTEGER  FK ────│──→ users.id
│ password_hash         VARCHAR(255)       │  │    │ name         VARCHAR(255)    │
│ google_id             VARCHAR(255)       │  └────│ json_content JSONB           │
│ is_guest              BOOLEAN            │       │ s3_url       TEXT            │
│ is_verified           BOOLEAN            │       │ created_at   TIMESTAMPTZ     │
│ is_premium            BOOLEAN            │       └──────────────────────────────┘
│ download_count        INTEGER            │
│ download_count_reset_at TIMESTAMPTZ      │       ┌──────────────────────────────┐
│ feedback_completed_at TIMESTAMPTZ        │       │          feedbacks           │
│ bonus_resumes         INTEGER            │       ├──────────────────────────────┤
│ bonus_downloads       INTEGER            │──┐    │ id           INTEGER  PK     │
│ created_at            TIMESTAMPTZ        │  │    │ user_id      INTEGER  FK ────│──→ users.id
└──────────────────────────────────────────┘  └────│ profile      VARCHAR(100)    │
                                                   │ target_sector VARCHAR(255)   │
                                                   │ source       VARCHAR(100)    │
                                                   │ ease_rating  INTEGER         │
                                                   │ time_spent   VARCHAR(50)     │
                                                   │ obstacles    TEXT            │
                                                   │ alternative  VARCHAR(255)    │
                                                   │ suggestions  TEXT            │
                                                   │ nps          INTEGER         │
                                                   │ future_help  TEXT            │
                                                   │ created_at   TIMESTAMPTZ     │
                                                   └──────────────────────────────┘
```

### users

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PK, auto-increment | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | |
| password_hash | VARCHAR(255) | nullable | NULL for OAuth-only users |
| google_id | VARCHAR(255) | UNIQUE, nullable | Google OAuth identifier |
| is_guest | BOOLEAN | NOT NULL, default: false | Guest account flag |
| is_verified | BOOLEAN | NOT NULL, default: false | Email verified flag; required to log in |
| is_premium | BOOLEAN | NOT NULL, default: false | Premium tier flag |
| download_count | INTEGER | NOT NULL, default: 0 | Monthly PDF download counter |
| download_count_reset_at | TIMESTAMPTZ | nullable | Timestamp of last monthly reset |
| feedback_completed_at | TIMESTAMPTZ | nullable | Set when user submits feedback |
| bonus_resumes | INTEGER | NOT NULL, default: 0 | Extra resume slots (awarded via feedback) |
| bonus_downloads | INTEGER | NOT NULL, default: 0 | Extra monthly downloads (awarded via feedback) |
| created_at | TIMESTAMPTZ | default: now() | |

### resumes

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PK, auto-increment | |
| user_id | INTEGER | FK → users.id, NOT NULL | ON DELETE CASCADE |
| name | VARCHAR(255) | NOT NULL | Resume display name |
| json_content | JSONB | nullable | Full CV data as JSON (max 100 KB) |
| s3_url | TEXT | nullable | S3 storage URL for PDF |
| created_at | TIMESTAMPTZ | NOT NULL, default: now() | |

### feedbacks

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PK, auto-increment | |
| user_id | INTEGER | FK → users.id, NOT NULL | ON DELETE CASCADE |
| profile | VARCHAR(100) | nullable | User profile type |
| target_sector | VARCHAR(255) | nullable | Target job sector |
| source | VARCHAR(100) | nullable | How user found Sivee |
| ease_rating | INTEGER | NOT NULL | Ease of use score (1–10) |
| time_spent | VARCHAR(50) | nullable | Time spent on CV |
| obstacles | TEXT | nullable | Difficulties encountered |
| alternative | VARCHAR(255) | nullable | Alternative tools considered |
| suggestions | TEXT | nullable | Improvement suggestions |
| nps | INTEGER | nullable | Net Promoter Score (0–10) |
| future_help | TEXT | nullable | Features desired in the future |
| created_at | TIMESTAMPTZ | default: now() | |

**Relationships:**
- User → Resumes (one-to-many, cascade delete)
- User → Feedbacks (one-to-many, cascade delete; max one feedback per user enforced at application level)

## Migration Workflow

### Adding a New Column

Example: Adding a `profile_photo_url` column to the `User` table.

1. Modify the model in `curriculum-vitae/database/models.py`:

```python
class User(Base):
    __tablename__ = "users"
    # ... existing columns
    profile_photo_url = Column(String(500), nullable=True)
```

2. Generate the migration:

```bash
./scripts/migrate.sh generate "Add profile photo to users"
```

3. Review the generated file in `curriculum-vitae/alembic/versions/`.

4. Apply the migration:

```bash
./scripts/migrate.sh dev
```

### Migration Commands

The `./scripts/migrate.sh` script simplifies Alembic usage:

```bash
./scripts/migrate.sh                    # Apply pending migrations
./scripts/migrate.sh generate "message" # Generate new migration
./scripts/migrate.sh history            # Show history
./scripts/migrate.sh current            # Show current version
./scripts/migrate.sh downgrade          # Rollback last migration
```

## Backups and Restore

### Manual Backup

```bash
./infra/vps/backup_db.sh
```

### Restore from Backup

```bash
./infra/vps/restore_db.sh cv_database_2024-01-15_03-00-00.sql.gz
```

### Automatic Backups (Cron)

Daily backup at 3 AM:

```bash
(crontab -l; echo "0 3 * * * /opt/cv-generator/infra/vps/backup_db.sh >> /var/log/cv-backup.log 2>&1") | crontab -
```
