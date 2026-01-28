"""
Backend FastAPI pour la génération de CV.
Expose un endpoint POST /generate qui reçoit les données et retourne le PDF.
Support des sections dynamiques et réorganisables.
"""
import tempfile
import shutil
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator

from core.LatexRenderer import LatexRenderer
from core.PdfCompiler import PdfCompiler


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
SectionType = Literal['education', 'experiences', 'projects', 'skills', 'leadership', 'languages', 'custom']


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
VALID_TEMPLATES = {"harvard", "europass", "mckinsey", "aurianne"}

# Dossier des fichiers statiques (frontend buildé)
STATIC_DIR = TEMPLATE_DIR / "static"


def convert_section_items(section: CVSection) -> Dict[str, Any]:
    """Convertit une section en dictionnaire pour le rendu LaTeX.

    Note: On utilise 'content' au lieu de 'items' pour éviter le conflit
    avec la méthode dict.items() dans Jinja2.
    """
    section_dict = {
        "id": section.id,
        "type": section.type,
        "title": section.title,
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
    elif section.type == "languages":
        # Languages est une string
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

        # Préparer les données pour le rendu
        render_data: Dict[str, Any] = {
            "personal": data.personal.model_dump(),
            "sections": [convert_section_items(s) for s in data.sections],
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


@app.get("/api/health")
async def health():
    """Endpoint de santé pour le monitoring."""
    return {"status": "ok", "message": "CV Generator API v2"}


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
