# ============================================
# Dockerfile multi-stage pour CV Generator
# Stage 1: Build du frontend
# Stage 2: Backend Python + LaTeX + Frontend statique
# ============================================

# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copier les fichiers de dépendances
COPY frontend/package.json frontend/package-lock.json* ./

# Installer les dépendances
RUN npm ci --only=production=false

# Copier le code source
COPY frontend/ ./

# Build de production
RUN npm run build


# --- Stage 2: Backend + Frontend statique ---
FROM python:3.13-slim

# Variables d'environnement
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV WORKERS=4
ENV LOG_LEVEL=info

# Installation de LaTeX et dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-recommended \
    texlive-publishers \
    texlive-pictures \
    lmodern \
    latexmk \
    curl \
    ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Installation de uv pour la gestion des dépendances Python
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copier les fichiers de dépendances Python
COPY curriculum-vitae/pyproject.toml curriculum-vitae/uv.lock ./

# Installer les dépendances Python
RUN uv sync --no-cache

# Copier le code backend
COPY curriculum-vitae/core ./core
COPY curriculum-vitae/database ./database
COPY curriculum-vitae/auth ./auth
COPY curriculum-vitae/api ./api
COPY curriculum-vitae/app.py ./
COPY curriculum-vitae/translations.py ./
COPY curriculum-vitae/templates ./templates

# Copier Alembic pour les migrations
COPY curriculum-vitae/alembic ./alembic
COPY curriculum-vitae/alembic.ini ./

# Copier le frontend buildé
COPY --from=frontend-builder /app/frontend/dist ./static

# Créer un utilisateur non-root pour la sécurité
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

# Exposer le port
EXPOSE 8000

# Commande de démarrage avec Gunicorn + Uvicorn workers
CMD ["sh", "-c", "uv run gunicorn app:app --bind 0.0.0.0:8000 --workers ${WORKERS:-4} --worker-class uvicorn.workers.UvicornWorker --timeout 120 --access-logfile - --error-logfile - --log-level ${LOG_LEVEL:-info}"]
