# CV Generator SaaS

A web application to generate professional PDF resumes from a dynamic form interface. Built with FastAPI (Python) and React, with LaTeX-based PDF generation.

**Live demo**: [sivee.pro](https://sivee.pro)

## Features

- **Dynamic sections**: Add, remove, reorder and toggle visibility of CV sections
- **Drag and drop**: Reorganize sections by dragging them
- **Custom sections**: Create personalized sections with custom titles
- **Real-time editing**: Edit all CV content through an intuitive web interface
- **PDF generation**: High-quality PDF output using LaTeX compilation
- **PDF Import**: Import existing CVs using AI-powered extraction with real-time streaming
- **Responsive design**: Works on desktop and mobile devices
- **User accounts**: Register, login, and manage multiple CVs
- **Guest accounts**: Try the app without registration (limited to 3 CVs)
- **Google OAuth**: Sign in with Google account
- **GDPR compliance**: Export and delete your data anytime
- **Smart template sizing**: Auto-fit content to one page with optimal template selection

## Tech Stack

**Backend**
- Python 3.13 + FastAPI
- SQLAlchemy + PostgreSQL
- Alembic (migrations)
- Gunicorn + Uvicorn (production)
- LaTeX (PDF compilation)
- boto3 (S3 storage)

**Frontend**
- React 18 + TypeScript
- Tailwind CSS
- dnd-kit (drag and drop)
- Vite

**Infrastructure**
- Docker + Docker Compose
- Nginx (reverse proxy)
- Certbot (SSL)

## Project Structure

```
site-CV/
├── curriculum-vitae/     # Backend (git submodule)
│   ├── core/             # Business logic (LaTeX, PDF)
│   ├── database/         # SQLAlchemy models
│   ├── alembic/          # Database migrations
│   ├── app.py            # FastAPI application
│   └── templates/        # LaTeX templates
├── frontend/             # React application
├── vps/                  # VPS deployment configs
│   ├── nginx_saas.conf   # Nginx configuration
│   ├── SECURITY.md       # Security checklist
│   ├── backup_db.sh      # Database backup script
│   └── restore_db.sh     # Database restore script
├── docker-compose.yml    # Production setup
├── docker-compose.dev.yml # Development setup
├── Dockerfile            # Production image
├── Dockerfile.dev        # Development image
├── deploy.sh             # Production deployment
├── migrate.sh            # Database migrations
└── test.sh               # Run test suite

```

---

## Development Setup

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone --recursive <repository-url>
cd site-CV

# Copy environment file
cp .env.example .env
# Edit .env with your API keys (optional for dev)

# Start development environment
docker compose -f docker-compose.dev.yml up --build

# Access:
# - Frontend: http://localhost:5173
# - Backend:  http://localhost:8000
# - Database: localhost:5432
```

**Hot Reload**: Any changes to Python or React files will automatically restart the server.

### Option 2: Local Setup

```bash
# Backend
cd curriculum-vitae
uv sync
uv run uvicorn app:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## Database Migrations

### Workflow: Adding a New Database Column

Example: Adding a `profile_photo_url` column to the `User` table.

#### Step 1: Modify the model

Edit `curriculum-vitae/database/models.py`:

```python
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    profile_photo_url = Column(String(500), nullable=True)  # NEW COLUMN
```

#### Step 2: Generate the migration

```bash
# Using the migrate script
./migrate.sh generate "Add profile photo to users"

# Or manually (if running locally)
cd curriculum-vitae
DATABASE_URL="postgresql://cvuser:devpassword@localhost:5432/cvdatabase" \
  uv run alembic revision --autogenerate -m "Add profile photo to users"
```

#### Step 3: Review the migration

Check the generated file in `curriculum-vitae/alembic/versions/`:

```python
def upgrade() -> None:
    op.add_column('users', sa.Column('profile_photo_url', sa.String(500), nullable=True))

def downgrade() -> None:
    op.drop_column('users', 'profile_photo_url')
```

#### Step 4: Apply the migration locally

```bash
./migrate.sh
# Or: ./migrate.sh dev
```

#### Step 5: Test

```bash
# Verify the column exists
docker compose -f docker-compose.dev.yml exec db \
  psql -U cvuser -d cvdatabase -c "\d users"
```

#### Step 6: Deploy to production

```bash
# Commit your changes
git add -A
git commit -m "Add profile photo column to users"
git push

# On the VPS
cd /opt/cv-generator
./deploy.sh  # This runs migrations automatically
```

### Migration Commands

```bash
./migrate.sh                    # Apply pending migrations (auto-detect env)
./migrate.sh generate "message" # Generate new migration (dev only)
./migrate.sh history            # Show migration history
./migrate.sh current            # Show current version
./migrate.sh downgrade          # Rollback one migration
./migrate.sh prod               # Force production mode
./migrate.sh dev                # Force development mode
```

---

## Tests

```bash
./test.sh
```

This runs both backend (pytest) and frontend (Vitest) test suites.

---

## Production Deployment

### Deploy

```bash
./deploy.sh
```

That's it. The script handles everything:
1. Pulls latest changes from git
2. Builds Docker images
3. Starts/restarts services
4. Waits for database to be ready
5. Runs database migrations
6. Shows service status

### Initial Setup (VPS)

See `vps/SECURITY.md` for the complete security checklist.

```bash
# Clone and configure
git clone --recursive <repository-url> /opt/cv-generator
cd /opt/cv-generator
cp .env.example .env
nano .env  # Configure your variables

# Deploy
./deploy.sh
```

### Database Backups

```bash
# Manual backup
./vps/backup_db.sh

# Restore from backup
./vps/restore_db.sh cv_database_2024-01-15_03-00-00.sql.gz

# Setup automatic daily backups (cron)
(crontab -l; echo "0 3 * * * /opt/cv-generator/vps/backup_db.sh >> /var/log/cv-backup.log 2>&1") | crontab -
```

---

## API Endpoints

### CV Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/default-data` | Returns default CV data |
| POST | `/generate` | Generates PDF from JSON |
| POST | `/import` | Import CV from PDF (AI) |
| POST | `/import-stream` | Import CV with SSE streaming |
| POST | `/optimal-size` | Find optimal template size |
| GET | `/api/health` | Health check |
| GET | `/health_db` | Database health check |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/guest` | Create guest account |
| POST | `/api/auth/upgrade` | Upgrade guest to full account |
| GET | `/api/auth/google/login` | Redirect to Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/google/exchange` | Exchange OAuth code for JWT |
| GET | `/api/auth/me` | Get current user info |
| GET | `/api/auth/me/export` | Export user data (GDPR) |
| DELETE | `/api/auth/me` | Delete account (GDPR) |

### Resume Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resumes` | Create new resume |
| GET | `/api/resumes` | List all user resumes |
| GET | `/api/resumes/{id}` | Get specific resume |
| PUT | `/api/resumes/{id}` | Update resume |
| DELETE | `/api/resumes/{id}` | Delete resume |
| POST | `/api/resumes/{id}/generate` | Generate PDF from saved resume |

### Limits

- **Guest users**: 3 resumes max
- **Registered users**: 50 resumes max
- **Resume content**: 100 KB max per resume

---

## Environment Variables

See `.env.example` for a complete template with descriptions.

```bash
# Database (auto-configured in Docker)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
POSTGRES_USER=cvuser
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=cvdatabase

# JWT Authentication (required)
JWT_SECRET_KEY=your_jwt_secret_key_here_min_32_chars
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google OAuth2 (optional)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# CORS & Frontend
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Mistral AI (for PDF import feature)
MISTRAL_API_KEY=...

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=your-bucket
AWS_REGION=eu-west-3

# Application
WORKERS=4        # Gunicorn workers (prod)
LOG_LEVEL=info   # Logging level
```

---

## Troubleshooting

### Database connection issues

```bash
# Check if PostgreSQL is running
docker compose ps

# Check database logs
docker compose logs db

# Connect to database manually
docker compose exec db psql -U cvuser -d cvdatabase
```

### Migration issues

```bash
# Check current state
./migrate.sh current
./migrate.sh history

# If stuck, check the alembic_version table
docker compose exec db psql -U cvuser -d cvdatabase \
  -c "SELECT * FROM alembic_version;"
```

### Reset development database

```bash
# Stop and remove dev containers + volumes
docker compose -f docker-compose.dev.yml down -v

# Restart fresh
docker compose -f docker-compose.dev.yml up --build
```

---

## License

MIT License
