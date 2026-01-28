Agis en tant qu'expert Fullstack Python/React. Je souhaite ajouter la gestion de plusieurs templates LaTeX (Harvard, Europass, McKinsey) à mon projet de générateur de CV.

Voici les modifications à effectuer :

1. **Backend (FastAPI) :**
   - Dans `app.py`, modifie le modèle Pydantic `ResumeData` pour inclure un champ `template_id: str = "harvard"`.
   - Mets à jour l'endpoint `/generate` pour qu'il récupère le fichier `.tex` correspondant à l'`template_id` (ex: `templates/{template_id}.tex`) au lieu de forcer `template.tex`.
   - Crée un dossier `templates/` et déplace l'actuel `template.tex` dedans en le renommant `harvard.tex`.
   - Prépare des fichiers de base `europass.tex` et `mckinsey.tex` (même s'ils ne sont que des copies de harvard.tex pour l'instant) pour tester la logique.

2. **Frontend (React/TypeScript) :**
   - Dans `types.ts`, ajoute `template_id` à l'interface `ResumeData`.
   - Dans `App.tsx`, ajoute un composant de sélection (Dropdown ou Cartes) permettant à l'utilisateur de choisir entre "Harvard", "Europass" et "McKinsey".
   - Assure-toi que cet identifiant est bien envoyé dans le corps de la requête POST lors de la génération du PDF.

3. **Infrastructure :**
   - Vérifie que le `Dockerfile` copie bien tout le contenu du nouveau dossier `templates/` dans l'image finale.

Garde une gestion d'erreur robuste : si un template demandé n'existe pas, utilise "harvard" par défaut.
