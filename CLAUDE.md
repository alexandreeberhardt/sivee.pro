# CLAUDE.md - Project Guidelines and Context

## Project Overview
This repository (`site_UX`) hosts a CV (Resume) Generator application. It consists of a **React/TypeScript frontend** and a **Python/FastAPI backend** that generates PDFs using **LaTeX**.

## Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Vitest (Testing).
- **Backend:** Python 3.13+, FastAPI, SQLAlchemy (SQLite/PostgreSQL), Alembic (Migrations), UV (Package Manager).
- **Core Engine:** LaTeX (TexLive) for PDF compilation, Jinja2 for templating.
- **Infrastructure:** Docker, Docker Compose, Nginx.

## Architecture & Structure
- `frontend/`: Single Page Application (SPA).
  - `src/components/`: UI Components (atomic design).
  - `src/hooks/`: Custom React hooks (logic separation).
  - `src/api/`: Axios client and API integration.
- `curriculum-vitae/` (Backend):
  - `api/`: FastAPI routes/endpoints.
  - `core/`: Business logic (PDF compilation, Resume building).
  - `database/`: SQL Models and connection logic.
  - `templates/`: `.tex` LaTeX templates.
  - `alembic/`: Database migrations.
- `site_UX/` (Root): Deployment scripts, Docker configurations, Nginx config.

## Development Commands

### Docker (Recommended for full stack)
- **Start All:** `docker-compose up --build`
- **Stop All:** `docker-compose down`

### Backend (`/curriculum-vitae`)
- **Package Manager:** Uses `uv`.
- **Install Dependencies:** `uv sync`
- **Run Dev Server:** `uv run main.py` (Runs on port 8000).
- **Run Tests:** `uv run pytest`
- **Database Migrations:**
  - Create migration: `uv run alembic revision --autogenerate -m "message"`
  - Apply migration: `uv run alembic upgrade head`

### Frontend (`/frontend`)
- **Install Dependencies:** `npm install`
- **Run Dev Server:** `npm run dev` (Runs on port 5173).
- **Build:** `npm run build`
- **Run Tests:** `npm run test`
- **Lint:** `npm run lint`

## Code Guidelines

### General
- **Language:** English for code (variable names, comments) and commit messages.
- **Formatting:** Prettier (Frontend), Black/Ruff (Backend).

### Backend (Python)
- **Typing:** Strict type hinting is required for all function arguments and return values.
- **Validation:** Use Pydantic schemas (`auth/schemas.py`, etc.) for data validation.
- **Architecture:** Keep business logic in `core/` and route logic in `api/`.
- **LaTeX:** When modifying `.tex` templates, ensure special characters are escaped in the Python renderer (`LatexRenderer.py`).

### Frontend (React/TS)
- **Components:** Functional components with strict TypeScript interfaces.
- **Styling:** Use Tailwind CSS utility classes. Avoid custom CSS files unless necessary.
- **State:** Use Context API (`AuthContext`) for global state and custom hooks for complex local logic.
- **Testing:** Write unit tests for new components and logic using Vitest/React Testing Library.

## Deployment
- Deployment is handled via scripts in `scripts/` (`scripts/deploy.sh`, `scripts/migrate.sh`).
- Production runs via `docker-compose.yml` behind Nginx.
- Ensure the `site_UX` folder contains valid `uv.lock` and `package-lock.json` before deployment.
