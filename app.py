"""
Backend FastAPI pour la génération de CV.
Expose un endpoint POST /generate qui reçoit les données et retourne le PDF.
Support des sections dynamiques et réorganisables.
"""
import os
import sys
import tempfile
import shutil
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Union

# Ajouter le répertoire courant au path pour les imports
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

# Charger le fichier .env depuis la racine du projet (dossier parent)
load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
from openai import OpenAI
from pypdf import PdfReader

from core.LatexRenderer import LatexRenderer
from core.PdfCompiler import PdfCompiler
from translations import get_section_title


# === Modèles Pydantic ===

class PersonalInfo(BaseModel):
    name: str = ""
    title: Optional[str] = ""
    location: str = ""
    email: str = ""
    phone: str = ""
    github: str = ""
    github_url: str = ""


class EducationItem(BaseModel):
    school: str = ""
    degree: str = ""
    dates: str = ""
    subtitle: Optional[str] = ""
    description: Optional[str] = ""


class ExperienceItem(BaseModel):
    title: str = ""
    company: str = ""
    dates: str = ""
    highlights: List[str] = []


class ProjectItem(BaseModel):
    name: str = ""
    year: Union[str, int] = ""
    highlights: List[str] = []

    @field_validator('year', mode='before')
    @classmethod
    def convert_year_to_str(cls, v):
        return str(v) if v is not None else ""


class SkillsItem(BaseModel):
    languages: str = ""
    tools: str = ""


class LeadershipItem(BaseModel):
    role: str = ""
    place: Optional[str] = ""
    dates: str = ""
    highlights: List[str] = []


class CustomItem(BaseModel):
    title: str = ""
    subtitle: Optional[str] = ""
    dates: Optional[str] = ""
    highlights: List[str] = []


# Types de sections supportés
SectionType = Literal['summary', 'education', 'experiences', 'projects', 'skills', 'leadership', 'languages', 'custom']


class CVSection(BaseModel):
    """Section du CV avec type, titre et contenu."""
    id: str
    type: SectionType
    title: str
    isVisible: bool = True
    items: Any  # Le type dépend du type de section

    @field_validator('items', mode='before')
    @classmethod
    def validate_items(cls, v, info):
        # Les items peuvent être une liste, un dict (skills), ou une string (languages)
        return v


class ResumeData(BaseModel):
    """Données complètes du CV avec sections dynamiques."""
    personal: PersonalInfo
    sections: List[CVSection] = []
    template_id: str = "harvard"
    lang: str = "fr"  # Langue pour les titres de sections dans le PDF


# === Application FastAPI ===

app = FastAPI(
    title="CV Generator API",
    description="API pour générer des CV en PDF à partir de données JSON",
    version="2.0.0"
)

# Configuration CORS pour permettre les requêtes du frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, restreindre aux domaines autorisés
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chemin vers les templates
TEMPLATE_DIR = Path(__file__).parent
TEMPLATES_FOLDER = TEMPLATE_DIR / "templates"
DEFAULT_TEMPLATE = "harvard"
VALID_TEMPLATES = {
    "harvard", "harvard_compact", "harvard_large",
    "europass", "europass_compact", "europass_large",
    "mckinsey", "mckinsey_compact", "mckinsey_large",
    "aurianne", "aurianne_compact", "aurianne_large",
    "stephane", "stephane_compact", "stephane_large",
    "michel", "michel_compact", "michel_large",
    "double", "double_compact", "double_large",
}

# Dossier des fichiers statiques (frontend buildé)
STATIC_DIR = TEMPLATE_DIR / "static"


def convert_section_items(section: CVSection, lang: str = "fr") -> Dict[str, Any]:
    """Convertit une section en dictionnaire pour le rendu LaTeX.

    Note: On utilise 'content' au lieu de 'items' pour éviter le conflit
    avec la méthode dict.items() dans Jinja2.

    Args:
        section: La section CV à convertir.
        lang: Code langue pour la traduction des titres (fr, en).
    """
    # Utiliser le titre traduit pour le PDF
    translated_title = get_section_title(section.type, lang, section.title)

    section_dict = {
        "id": section.id,
        "type": section.type,
        "title": translated_title,
        "isVisible": section.isVisible,
    }

    # Traiter les items selon le type de section
    if section.type == "skills":
        # Skills est un dictionnaire
        if isinstance(section.items, dict):
            section_dict["content"] = section.items
        elif hasattr(section.items, 'model_dump'):
            section_dict["content"] = section.items.model_dump()
        else:
            section_dict["content"] = {"languages": "", "tools": ""}
    elif section.type in ("languages", "summary"):
        # Languages et Summary sont des strings
        section_dict["content"] = str(section.items) if section.items else ""
    else:
        # Les autres types sont des listes
        if isinstance(section.items, list):
            section_dict["content"] = [
                item.model_dump() if hasattr(item, 'model_dump') else item
                for item in section.items
            ]
        else:
            section_dict["content"] = []

    return section_dict


@app.post("/generate")
async def generate_cv(data: ResumeData):
    """
    Génère un CV PDF à partir des données fournies.

    Args:
        data: Données du CV avec sections dynamiques.

    Returns:
        FileResponse: Le fichier PDF généré.
    """
    # Créer un dossier temporaire pour la compilation
    temp_dir = tempfile.mkdtemp(prefix="cv_")
    temp_path = Path(temp_dir)

    try:
        # Déterminer le template à utiliser (fallback sur harvard si invalide)
        template_id = data.template_id if data.template_id in VALID_TEMPLATES else DEFAULT_TEMPLATE
        template_filename = f"{template_id}.tex"

        # Copier le template dans le dossier temporaire
        template_src = TEMPLATES_FOLDER / template_filename
        if not template_src.exists():
            template_src = TEMPLATES_FOLDER / f"{DEFAULT_TEMPLATE}.tex"
        template_dst = temp_path / template_filename
        shutil.copy(template_src, template_dst)

        # Préparer les données pour le rendu (avec titres traduits)
        lang = data.lang if data.lang in ("fr", "en") else "fr"
        render_data: Dict[str, Any] = {
            "personal": data.personal.model_dump(),
            "sections": [convert_section_items(s, lang) for s in data.sections],
        }

        # Rendre le template LaTeX
        renderer = LatexRenderer(temp_path, template_filename)
        tex_content = renderer.render(render_data)

        # Écrire le fichier .tex
        tex_file = temp_path / "main.tex"
        tex_file.write_text(tex_content, encoding="utf-8")

        # Compiler en PDF
        compiler = PdfCompiler(tex_file)
        compiler.compile(clean=True)

        # Vérifier que le PDF a été généré
        pdf_file = temp_path / "main.pdf"
        if not pdf_file.exists():
            raise HTTPException(status_code=500, detail="Échec de la génération du PDF")

        # Retourner le PDF
        return FileResponse(
            path=str(pdf_file),
            filename="cv.pdf",
            media_type="application/pdf",
            background=None
        )

    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Erreur de compilation LaTeX: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur inattendue: {e}")


@app.get("/default-data")
async def get_default_data():
    """
    Retourne les données par défaut du CV (depuis data.yml).
    Utile pour pré-remplir le formulaire frontend.
    Le frontend convertira l'ancien format vers le nouveau format avec sections.
    """
    import yaml

    yaml_path = TEMPLATE_DIR / "data.yml"
    if not yaml_path.exists():
        raise HTTPException(status_code=404, detail="Fichier data.yml introuvable")

    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    return data


@app.post("/import")
async def import_cv(file: UploadFile = File(...)):
    """
    Importe un CV depuis un fichier PDF.

    Extrait le texte du PDF et utilise l'API OpenAI pour mapper
    le contenu vers la structure ResumeData.

    Args:
        file: Fichier PDF uploadé.

    Returns:
        ResumeData: Données structurées du CV.
    """
    # Vérifier que c'est un PDF
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Le fichier doit être un PDF")

    # Vérifier la clé API OpenAI
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Clé API OpenAI non configurée (OPENAI_API_KEY)"
        )

    try:
        # Extraire le texte du PDF
        pdf_content = await file.read()

        # Créer un fichier temporaire pour pypdf
        temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        temp_pdf.write(pdf_content)
        temp_pdf.close()

        try:
            reader = PdfReader(temp_pdf.name)
            text_content = ""
            for page in reader.pages:
                text_content += page.extract_text() + "\n"
        finally:
            Path(temp_pdf.name).unlink()

        if not text_content.strip():
            raise HTTPException(
                status_code=400,
                detail="Impossible d'extraire le texte du PDF"
            )

        # Appeler OpenAI pour structurer les données
        client = OpenAI(api_key=api_key)

        system_prompt = """Tu es un assistant spécialisé dans l'extraction de données de CV.
Analyse le texte du CV fourni et retourne un JSON avec la structure exacte suivante:

{
  "personal": {
    "name": "Nom complet",
    "title": "Titre professionnel",
    "location": "Ville, Pays",
    "email": "email@example.com",
    "phone": "+33 6 12 34 56 78",
    "github": "username",
    "github_url": "https://github.com/username"
  },
  "sections": [
    {
      "id": "sec-1",
      "type": "education",
      "title": "Education",
      "isVisible": true,
      "items": [
        {"school": "Nom école", "degree": "Diplôme", "dates": "2020 - 2024", "subtitle": "Mention/GPA", "description": "Description"}
      ]
    },
    {
      "id": "sec-2",
      "type": "experiences",
      "title": "Experiences",
      "isVisible": true,
      "items": [
        {"title": "Poste", "company": "Entreprise", "dates": "Jan 2023 - Present", "highlights": ["Point 1", "Point 2"]}
      ]
    },
    {
      "id": "sec-3",
      "type": "projects",
      "title": "Projects",
      "isVisible": true,
      "items": [
        {"name": "Nom projet", "year": "2023", "highlights": ["Description 1", "Description 2"]}
      ]
    },
    {
      "id": "sec-4",
      "type": "skills",
      "title": "Technical Skills",
      "isVisible": true,
      "items": {"languages": "Python, JavaScript, C++", "tools": "Git, Docker, Linux"}
    },
    {
      "id": "sec-5",
      "type": "leadership",
      "title": "Leadership",
      "isVisible": true,
      "items": [
        {"role": "Rôle", "place": "Organisation", "dates": "2022 - 2023", "highlights": ["Action 1"]}
      ]
    },
    {
      "id": "sec-6",
      "type": "languages",
      "title": "Languages",
      "isVisible": true,
      "items": "Français (natif), Anglais (courant)"
    }
  ],
  "template_id": "harvard"
}

IMPORTANT:
- Pour "skills", items est un OBJET avec "languages" et "tools" (pas un array)
- Pour "languages", items est une STRING simple
- Pour les autres types, items est un ARRAY d'objets
- Génère des IDs uniques pour chaque section (sec-1, sec-2, etc.)
- Si une info n'est pas dans le CV, utilise une chaîne vide "" ou un array vide []
- N'invente pas d'informations, extrais uniquement ce qui est présent"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Voici le texte extrait du CV:\n\n{text_content}"}
            ],
            response_format={"type": "json_object"}
        )

        import json
        result = json.loads(response.choices[0].message.content)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import: {str(e)}")


@app.get("/api/health")
async def health():
    """Endpoint de santé pour le monitoring."""
    return {"status": "ok", "message": "CV Generator API v2"}


@app.get("/health_db")
async def health_db():
    """Endpoint de santé pour vérifier la connexion à la base de données."""
    from database.db_config import check_db_connection

    if check_db_connection():
        return {"status": "ok", "database": "connected"}
    else:
        raise HTTPException(status_code=503, detail="Database connection failed")


# Servir le frontend statique en production
if STATIC_DIR.exists():
    # Monter les assets statiques
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Route catch-all pour servir le SPA React."""
        file_path = STATIC_DIR / full_path

        if file_path.is_file():
            return FileResponse(file_path)

        return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
