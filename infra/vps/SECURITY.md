# Guide de Sécurité VPS - CV Generator SaaS

## Prérequis
- VPS Debian 11/12 ou Ubuntu 22.04/24.04
- Accès root ou sudo
- Nom de domaine pointant vers le VPS

---

## 1. Mise à jour du système

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip
```

---

## 2. Installation de Docker

```bash
# Installer les dépendances
sudo apt install -y ca-certificates curl gnupg lsb-release

# Ajouter la clé GPG Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Ajouter le repository (Debian)
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Pour Ubuntu, remplacer 'debian' par 'ubuntu' dans les commandes ci-dessus

# Installer Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Vérifier l'installation
docker --version
docker compose version
```

> **Note**: Déconnectez-vous et reconnectez-vous pour que le groupe docker soit pris en compte.

---

## 3. Configuration du pare-feu (UFW)

```bash
# Installer UFW
sudo apt install -y ufw

# Configurer les règles par défaut
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Autoriser SSH (IMPORTANT: à faire en premier !)
sudo ufw allow 22/tcp comment 'SSH'

# Autoriser HTTP et HTTPS
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Activer le pare-feu
sudo ufw enable

# Vérifier le statut
sudo ufw status verbose
```

### Résultat attendu :
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere        # SSH
80/tcp                     ALLOW       Anywhere        # HTTP
443/tcp                    ALLOW       Anywhere        # HTTPS
```

---

## 4. Sécurisation SSH

Éditer `/etc/ssh/sshd_config` :

```bash
sudo nano /etc/ssh/sshd_config
```

Modifier ces paramètres :

```
# Désactiver la connexion root
PermitRootLogin no

# Utiliser uniquement l'authentification par clé
PasswordAuthentication no
PubkeyAuthentication yes

# Désactiver les méthodes inutilisées
ChallengeResponseAuthentication no
UsePAM yes

# Timeout de connexion
ClientAliveInterval 300
ClientAliveCountMax 2
```

Redémarrer SSH :

```bash
sudo systemctl restart sshd
```

> **⚠️ ATTENTION**: Assurez-vous d'avoir votre clé SSH configurée avant de désactiver PasswordAuthentication !

---

## 5. Installation de Nginx

```bash
sudo apt install -y nginx

# Vérifier l'installation
nginx -v

# Activer au démarrage
sudo systemctl enable nginx
```

---

## 6. Configuration de l'application

### Créer les dossiers

```bash
# Dossier de l'application
sudo mkdir -p /opt/cv-generator
sudo chown $USER:$USER /opt/cv-generator

# Dossier pour les backups
sudo mkdir -p /var/backups/cv-generator
sudo chown $USER:$USER /var/backups/cv-generator

# Dossier pour Certbot
sudo mkdir -p /var/www/certbot
```

### Cloner et configurer

```bash
cd /opt/cv-generator
git clone <votre-repo> .

# Configurer les variables d'environnement
cp .env.example .env
nano .env  # Éditer avec vos vraies valeurs
```

---

## 7. Certificat SSL avec Certbot

```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Générer le certificat (remplacer par votre domaine)
sudo certbot --nginx -d cv.alexeber.fr

# Vérifier le renouvellement automatique
sudo certbot renew --dry-run
```

### Renouvellement automatique

Certbot ajoute automatiquement un timer systemd. Vérifier :

```bash
sudo systemctl status certbot.timer
```

---

## 8. Configuration Nginx

```bash
# Copier la configuration
sudo cp /opt/cv-generator/infra/vps/nginx_saas.conf /etc/nginx/sites-available/cv-generator

# Activer le site
sudo ln -s /etc/nginx/sites-available/cv-generator /etc/nginx/sites-enabled/

# Désactiver le site par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester et recharger
sudo nginx -t
sudo systemctl reload nginx
```

---

## 9. Fail2ban (protection contre les attaques brute-force)

```bash
# Installer Fail2ban
sudo apt install -y fail2ban

# Créer une configuration locale
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Ajouter/modifier :

```ini
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
```

Redémarrer :

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status
```

---

## 10. Déploiement

```bash
cd /opt/cv-generator

# Premier déploiement
./scripts/deploy.sh

# Vérifier que tout fonctionne
curl -I https://cv.alexeber.fr/api/health
curl -I https://cv.alexeber.fr/health_db
```

---

## 11. Monitoring et logs

### Logs Docker
```bash
# Logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f cv-generator
docker compose logs -f db
```

### Logs Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Espace disque
```bash
# Vérifier l'espace
df -h

# Nettoyer Docker (images inutilisées)
docker system prune -a
```

---

## 12. Checklist de sécurité

- [ ] Système à jour (`apt update && apt upgrade`)
- [ ] Pare-feu UFW activé (ports 22, 80, 443 uniquement)
- [ ] SSH : authentification par clé uniquement
- [ ] SSH : connexion root désactivée
- [ ] Fail2ban installé et actif
- [ ] HTTPS configuré avec Certbot
- [ ] Renouvellement auto SSL vérifié
- [ ] Variables d'environnement sécurisées (`.env` non commité)
- [ ] Backups automatiques configurés
- [ ] Logs accessibles et surveillés

---

## Commandes utiles

```bash
# Statut des services
sudo systemctl status nginx
sudo systemctl status docker
docker compose ps

# Redémarrer l'application
cd /opt/cv-generator && docker compose restart

# Mise à jour de l'application
cd /opt/cv-generator && ./scripts/deploy.sh

# Backup manuel
./backup_db.sh

# Voir les connexions actives
sudo ss -tulpn
```
