# Guide de déploiement - CV Generator

## Prérequis sur le VPS

- Docker et Docker Compose
- Nginx
- (Optionnel) Certbot pour SSL

## Déploiement

### 1. Cloner le projet

```bash
git clone <votre-repo> /opt/cv-generator
cd /opt/cv-generator
git submodule update --init --recursive
```

### 2. Build et lancement avec Docker

```bash
docker-compose up -d --build
```

Le backend sera accessible sur le port 8000.

### 3. Configuration Nginx

```bash
# Copier la configuration
sudo cp nginx.conf /etc/nginx/sites-available/cv-generator

# Éditer le fichier pour mettre votre domaine
sudo nano /etc/nginx/sites-available/cv-generator

# Activer le site
sudo ln -s /etc/nginx/sites-available/cv-generator /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 4. Configuration SSL avec Let's Encrypt (recommandé)

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir un certificat
sudo certbot --nginx -d cv.votre-domaine.com

# Le certificat sera renouvelé automatiquement
```

## Commandes utiles

```bash
# Voir les logs
docker-compose logs -f

# Redémarrer le service
docker-compose restart

# Mettre à jour
git pull
docker-compose up -d --build

# Arrêter
docker-compose down
```

## Développement local

```bash
# Lancer en mode développement
./run.sh

# Ou manuellement :
# Terminal 1 - Backend
cd curriculum-vitae
uv run uvicorn app:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

## Structure du projet

```
site-CV/
├── curriculum-vitae/     # Sous-module avec le code backend
│   ├── core/             # Logique métier (LaTeX, PDF)
│   ├── app.py            # API FastAPI
│   └── template.tex      # Template LaTeX
├── frontend/             # Application React
│   └── src/              # Code source React
├── Dockerfile            # Image Docker multi-stage
├── docker-compose.yml    # Orchestration
├── nginx.conf            # Configuration Nginx
└── run.sh                # Script de dev local
```
