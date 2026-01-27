#!/bin/bash
# Script de lancement pour le développement local

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== CV Generator - Développement ===${NC}"

# Vérifier les prérequis
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Erreur: $1 n'est pas installé${NC}"
        exit 1
    fi
}

check_command "python3"
check_command "node"
check_command "npm"

# Dossier racine du projet
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/curriculum-vitae"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Fonction de nettoyage
cleanup() {
    echo -e "\n${YELLOW}Arrêt des services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Installer les dépendances backend si nécessaire
echo -e "${YELLOW}Installation des dépendances backend...${NC}"
cd "$BACKEND_DIR"
if command -v uv &> /dev/null; then
    uv sync
else
    pip install -e .
fi

# Installer les dépendances frontend si nécessaire
echo -e "${YELLOW}Installation des dépendances frontend...${NC}"
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    npm install
fi

# Lancer le backend
echo -e "${GREEN}Démarrage du backend (port 8000)...${NC}"
cd "$BACKEND_DIR"
if command -v uv &> /dev/null; then
    uv run uvicorn app:app --reload --host 0.0.0.0 --port 8000 &
else
    python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000 &
fi
BACKEND_PID=$!

# Attendre que le backend soit prêt
sleep 2

# Lancer le frontend
echo -e "${GREEN}Démarrage du frontend (port 5173)...${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}"
echo "======================================"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "======================================"
echo -e "${NC}"
echo "Appuyez sur Ctrl+C pour arrêter"

# Attendre
wait
