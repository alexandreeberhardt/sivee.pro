# Development Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| Python | 3.13+ | [python.org](https://www.python.org/) |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Docker | 20+ | [docker.com](https://www.docker.com/) |
| Redis | 7+ | Provided via Docker Compose |

## Tech Stack

**Backend**
- Python 3.13 + FastAPI
- SQLAlchemy + PostgreSQL
- Alembic (migrations)
- Gunicorn + Uvicorn (production)
- LaTeX (PDF compilation)
- boto3 (S3 storage)
- Redis (rate limiting, OAuth code exchange)

**Frontend**
- React 18 + TypeScript
- Tailwind CSS
- dnd-kit (drag and drop)
- i18next (internationalization — fr, en, de, es, it, pt)
- Vite

**Infrastructure**
- Docker + Docker Compose
- Nginx (reverse proxy)
- Certbot (SSL)

## Project Structure

```text
sivee/
├── curriculum-vitae/          # Backend (git submodule)
│   ├── api/                   # FastAPI routes (resumes)
│   ├── auth/                  # Authentication routes and schemas
│   ├── core/                  # Business logic (LaTeX, PDF, email, storage)
│   ├── database/              # SQLAlchemy models and DB config
│   ├── alembic/               # Database migrations
│   ├── app.py                 # FastAPI application entry point
│   ├── tests/                 # Backend tests (pytest)
│   └── templates/             # LaTeX templates (.tex)
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── context/           # Auth context (AuthContext)
│   │   ├── hooks/             # Custom hooks (useResumeManager, usePdfGeneration, …)
│   │   ├── api/               # Axios client and API functions
│   │   ├── locales/           # i18n translations (fr/en/de/es/it/pt)
│   │   └── test/              # Test setup and helpers
│   └── package.json
├── infra/vps/                       # VPS deployment configs
│   ├── nginx_saas.conf        # Nginx configuration
│   ├── SECURITY.md            # Security checklist
│   ├── backup_db.sh           # DB backup script
│   └── restore_db.sh          # DB restore script
├── docker-compose.yml         # Production setup
├── docker-compose.dev.yml     # Development setup
├── scripts/deploy.sh                  # Deployment script
├── scripts/migrate.sh                 # Migration script
└── scripts/test.sh                    # Test suite runner
```

## Local Installation (Without Docker)

### Backend

Redis must be running locally:

```bash
# macOS
brew install redis && brew services start redis

# Or Docker
docker run -d -p 6379:6379 redis:7-alpine
```

Then start the backend:

```bash
cd curriculum-vitae
uv sync
uv run uvicorn app:app --reload --port 8000
```

The API docs are available at http://localhost:8000/docs (Swagger UI).

### Frontend (in a new terminal)

```bash
cd frontend
npm install
npm run dev
```

## Tests

### Run all tests

```bash
./scripts/test.sh
```

### Backend tests only

```bash
cd curriculum-vitae
uv run pytest tests/ -v
```

The backend test suite uses SQLite in-memory for speed. See `curriculum-vitae/tests/conftest.py` for the test database setup and authentication helpers.

### Frontend tests only

```bash
cd frontend
npm test              # Single run
npm run test:watch    # Watch mode (re-runs on changes)
```

Frontend tests use Vitest + React Testing Library + jsdom. A custom `renderWithProviders` helper in `src/test/render.tsx` wraps components with Router, AuthProvider, and i18n.

## Development Troubleshooting

### Reset development database

To start fresh:

```bash
# Stop and remove containers and volumes
docker compose -f docker-compose.dev.yml down -v

# Restart
docker compose -f docker-compose.dev.yml up --build
```

### Submodule not initialized

If the `curriculum-vitae/` folder is empty after cloning:

```bash
git submodule update --init --recursive
```

### Redis connection errors

Ensure Redis is running before starting the backend. The backend connects to `redis://localhost:6379` by default (configurable via `REDIS_URL` env var). Auth endpoints will fail without Redis.
