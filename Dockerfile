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
RUN npm install

# Copier le code source
COPY frontend/ ./

# Build de production
RUN npm run build


# --- Stage 2: Backend + Frontend statique ---
FROM python:3.13-slim

# Variables d'environnement
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Installation de LaTeX et dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-recommended \
    texlive-publishers \
    lmodern \
    latexmk \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Installation de uv pour la gestion des dépendances Python
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copier les fichiers de dépendances Python
COPY curriculum-vitae/pyproject.toml curriculum-vitae/uv.lock ./

# Installer les dépendances Python
RUN uv sync --frozen --no-cache

# Copier le code backend
COPY curriculum-vitae/core ./core
COPY curriculum-vitae/app.py ./
COPY curriculum-vitae/templates ./templates
COPY curriculum-vitae/data.yml ./

# Copier le frontend buildé
COPY --from=frontend-builder /app/frontend/dist ./static

# Exposer le port
EXPOSE 8000

# Commande de démarrage
CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
