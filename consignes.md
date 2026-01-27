# Role
Agis en tant que développeur Fullstack Senior spécialisé en Python (FastAPI) et React.

# Objectif
Transformer le script de génération de CV LaTeX existant en une application web complète ("CV-as-a-Service"). L'utilisateur doit pouvoir cocher des sections, remplir ses données, voir une preview et télécharger le PDF.

# Architecture Cible
1. **Backend** : FastAPI. Réutiliser `core/` et `template.tex`.
2. **Frontend** : React (avec Vite) + Tailwind CSS + Lucide React (icones).
3. **Communication** : API REST pour la génération.
4. **Gestion de fichiers** : Utiliser des dossiers temporaires pour la compilation LaTeX.

# Tâches spécifiques

## 1. Analyse de l'existant
- Utilise `core/LatexRenderer.py` et `core/PdfCompiler.py` comme base.
- Note que `LatexRenderer` utilise des délimiteurs spécifiques (\BLOCK{}, \VAR{}) pour éviter les conflits avec LaTeX.

## 2. Développement du Backend (FastAPI)
- Créer un fichier `app.py`.
- Créer un endpoint `POST /generate` qui :
    - Reçoit un JSON (données du CV + flags d'activation des sections).
    - Met à jour dynamiquement le dictionnaire de données.
    - Appelle le `ResumeBuilder` pour générer le PDF.
    - Retourne le fichier PDF en `FileResponse`.
- Ajouter un middleware CORS pour permettre au frontend de communiquer avec le backend.

## 3. Mise à jour du Template LaTeX
- Modifie `template.tex` pour entourer chaque section (Education, Experiences, Projects, etc.) par des blocs conditionnels Jinja2.
- Exemple : `\BLOCK{if show_education} ... \BLOCK{endif}`.

## 4. Développement du Frontend (React)
- Créer un dossier `frontend/` à la racine.
- Créer une interface avec deux colonnes :
    - **Gauche (Formulaire)** : 
        - Checkbox pour activer/désactiver chaque section (Skills, Projects, etc.).
        - Champs de texte dynamiques (inputs et textareas) basés sur la structure de `data.yml`.
    - **Droite (Preview)** : 
        - Un bouton "Générer & Télécharger le PDF".
        - (Optionnel) Un composant d'affichage de PDF ou un message d'attente.
- Utiliser `fetch` pour envoyer les données au backend FastAPI.

## 5. Industrialisation
- Créer un `Dockerfile` qui :
    - Installe Python 3.13 et les dépendances du `uv.lock`.
    - Installe une distribution LaTeX légère (ex: `texlive-latex-extra`, `latexmk`).
- Créer un script `run.sh` pour lancer le backend et le frontend simultanément.

# Contraintes
- Ne supprime pas les tests unitaires existants dans `tests/`.
- Assure-toi que le filtre `escape_latex` dans `LatexRenderer.py` est toujours utilisé pour la sécurité.
- Garde le code propre, typé et commenté en français.

Commence par analyser les fichiers et propose-moi un plan d'action avant de coder.
