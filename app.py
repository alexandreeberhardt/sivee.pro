"""
Backend FastAPI pour la génération de CV.
Expose un endpoint POST /generate qui reçoit les données et retourne le PDF.
Support des sections dynamiques et réorganisables.
Authentification OAuth2 avec JWT.
"""

import asyncio
import contextlib
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any, Literal

# Ajouter le répertoire courant au path pour les imports
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

# Charger le fichier .env depuis la racine du projet (dossier parent)
load_dotenv(Path(__file__).parent.parent / ".env")

import json  # noqa: E402
import re  # noqa: E402

import pdfplumber  # noqa: E402
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import FileResponse, StreamingResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from mistralai import Mistral  # noqa: E402
from pydantic import BaseModel, Field, field_validator  # noqa: E402

from core.LatexRenderer import LatexRenderer  # noqa: E402
from core.PdfCompiler import PdfCompiler  # noqa: E402
from translations import get_section_title  # noqa: E402

# Limite de taille pour l'import de CV (protection contre les abus)
# 10 000 caractères ≈ 2 500 tokens, suffisant pour un CV de 3-4 pages
MAX_CV_TEXT_LENGTH = 10_000

# Authentication imports
from api.resumes import (  # noqa: E402
    MAX_DOWNLOADS_PER_GUEST,
    MAX_DOWNLOADS_PER_PREMIUM,
    MAX_DOWNLOADS_PER_USER,
    _get_monthly_download_count,
)
from api.resumes import router as resumes_router  # noqa: E402
from auth.routes import router as auth_router  # noqa: E402
from auth.security import decode_access_token  # noqa: E402
from database.db_config import get_db  # noqa: E402
from database.models import User  # noqa: E402

# === Modèles Pydantic ===


class ProfessionalLink(BaseModel):
    """Un lien professionnel (LinkedIn, GitHub, Portfolio, etc.)"""

    platform: str = Field(default="linkedin", max_length=50)
    username: str = Field(default="", max_length=100)
    url: str = Field(default="", max_length=500)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate URL format if provided."""
        if v and not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class PersonalInfo(BaseModel):
    name: str = Field(default="", max_length=200)
    title: str | None = Field(default="", max_length=200)
    location: str = Field(default="", max_length=200)
    email: str = Field(default="", max_length=254)  # RFC 5321 max email length
    phone: str = Field(default="", max_length=50)
    links: list[ProfessionalLink] = Field(default_factory=list, max_length=20)
    # Champs legacy pour la compatibilité ascendante
    github: str | None = Field(default=None, max_length=100)
    github_url: str | None = Field(default=None, max_length=500)

    def model_post_init(self, __context):
        """Migration silencieuse des anciennes données github vers links."""
        # Si links est vide et github/github_url sont définis, migrer
        if not self.links and (self.github or self.github_url):
            self.links = [
                ProfessionalLink(
                    platform="github", username=self.github or "", url=self.github_url or ""
                )
            ]
        # Nettoyer les champs legacy après migration
        object.__setattr__(self, "github", None)
        object.__setattr__(self, "github_url", None)


class EducationItem(BaseModel):
    school: str = Field(default="", max_length=300)
    degree: str = Field(default="", max_length=300)
    dates: str = Field(default="", max_length=100)
    subtitle: str | None = Field(default="", max_length=300)
    description: str | None = Field(default="", max_length=2000)


class ExperienceItem(BaseModel):
    title: str = Field(default="", max_length=300)
    company: str = Field(default="", max_length=300)
    dates: str = Field(default="", max_length=100)
    highlights: list[str] = Field(default_factory=list, max_length=50)


class ProjectItem(BaseModel):
    name: str = Field(default="", max_length=300)
    year: str | int = Field(default="", max_length=50)
    highlights: list[str] = Field(default_factory=list, max_length=50)

    @field_validator("year", mode="before")
    @classmethod
    def convert_year_to_str(cls, v):
        return str(v) if v is not None else ""


class SkillsItem(BaseModel):
    languages: str = Field(default="", max_length=2000)
    tools: str = Field(default="", max_length=2000)


class LeadershipItem(BaseModel):
    role: str = Field(default="", max_length=300)
    place: str | None = Field(default="", max_length=300)
    dates: str = Field(default="", max_length=100)
    highlights: list[str] = Field(default_factory=list, max_length=50)


class CustomItem(BaseModel):
    title: str = Field(default="", max_length=300)
    subtitle: str | None = Field(default="", max_length=300)
    dates: str | None = Field(default="", max_length=100)
    highlights: list[str] = Field(default_factory=list, max_length=50)


# Types de sections supportés
SectionType = Literal[
    "summary", "education", "experiences", "projects", "skills", "leadership", "languages", "custom"
]


class CVSection(BaseModel):
    """Section du CV avec type, titre et contenu."""

    id: str = Field(..., max_length=50)
    type: SectionType
    title: str = Field(..., max_length=200)
    isVisible: bool = True
    items: Any  # Le type dépend du type de section

    @field_validator("items", mode="before")
    @classmethod
    def validate_items(cls, v, info):
        # Les items peuvent être une liste, un dict (skills), ou une string (languages)
        return v


class ResumeData(BaseModel):
    """Données complètes du CV avec sections dynamiques."""

    personal: PersonalInfo
    sections: list[CVSection] = []
    template_id: str = "harvard"
    lang: str = "fr"  # Langue pour les titres de sections dans le PDF


# === Application FastAPI ===

app = FastAPI(
    title="CV Generator API",
    description="API pour générer des CV en PDF à partir de données JSON",
    version="2.0.0",
)

# Configuration CORS - restreint aux domaines autorisés
# SECURITY: Never use ["*"] in production with allow_credentials=True
# En développement, ajouter http://localhost:5173 (Vite) à ALLOWED_ORIGINS
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "https://sivee.pro,https://www.sivee.pro,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Include authentication and API routers
app.include_router(auth_router)
app.include_router(resumes_router)

# Chemin vers les templates
TEMPLATE_DIR = Path(__file__).parent
TEMPLATES_FOLDER = TEMPLATE_DIR / "templates"
DEFAULT_TEMPLATE = "harvard"
VALID_TEMPLATES = {
    "harvard",
    "harvard_compact",
    "harvard_large",
    "europass",
    "europass_compact",
    "europass_large",
    "mckinsey",
    "mckinsey_compact",
    "mckinsey_large",
    "aurianne",
    "aurianne_compact",
    "aurianne_large",
    "stephane",
    "stephane_compact",
    "stephane_large",
    "michel",
    "michel_compact",
    "michel_large",
    "double",
    "double_compact",
    "double_large",
}

# Variantes de taille pour l'auto-sizing
SIZE_VARIANTS = ["large", "normal", "compact"]

# Dossier des fichiers statiques (frontend buildé)
STATIC_DIR = TEMPLATE_DIR / "static"


def get_template_with_size(base_template: str, size: str) -> str:
    """Retourne le nom du template avec le suffixe de taille approprié."""
    if size == "normal":
        return base_template
    return f"{base_template}_{size}"


def get_base_template(template_id: str) -> str:
    """Extrait le template de base (sans suffixe de taille)."""
    return template_id.replace("_compact", "").replace("_large", "")


def generate_pdf_and_count_pages(data: ResumeData, template_id: str) -> tuple[Path, int, Path]:
    """
    Génère un PDF et retourne le chemin, le nombre de pages et le dossier temp.
    Le dossier temp doit être nettoyé par l'appelant.
    """
    temp_dir = tempfile.mkdtemp(prefix="cv_")
    temp_path = Path(temp_dir)

    template_filename = f"{template_id}.tex"

    # Copier le template
    template_src = TEMPLATES_FOLDER / template_filename
    if not template_src.exists():
        template_src = TEMPLATES_FOLDER / f"{DEFAULT_TEMPLATE}.tex"
    template_dst = temp_path / template_filename
    shutil.copy(template_src, template_dst)

    # Préparer les données
    lang = data.lang if data.lang in ("fr", "en") else "fr"
    render_data: dict[str, Any] = {
        "personal": data.personal.model_dump(),
        "sections": [convert_section_items(s, lang) for s in data.sections],
    }

    # Rendre et compiler
    renderer = LatexRenderer(temp_path, template_filename)
    tex_content = renderer.render(render_data)
    tex_file = temp_path / "main.tex"
    tex_file.write_text(tex_content, encoding="utf-8")

    compiler = PdfCompiler(tex_file)
    compiler.compile(clean=True)

    pdf_file = temp_path / "main.pdf"
    if not pdf_file.exists():
        raise RuntimeError("Échec de la génération du PDF")

    # Compter les pages
    with pdfplumber.open(str(pdf_file)) as pdf:
        page_count = len(pdf.pages)

    return pdf_file, page_count, temp_path


def convert_section_items(section: CVSection, lang: str = "fr") -> dict[str, Any]:
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

    # Traiter les items selon le type de section et déterminer has_content
    has_content = False

    if section.type == "skills":
        # Skills est un dictionnaire
        if isinstance(section.items, dict):
            section_dict["content"] = section.items
            # Vérifier si languages OU tools contiennent du contenu
            has_content = bool(
                (section.items.get("languages") or "").strip()
                or (section.items.get("tools") or "").strip()
            )
        elif hasattr(section.items, "model_dump"):
            content = section.items.model_dump()
            section_dict["content"] = content
            has_content = bool(
                (content.get("languages") or "").strip() or (content.get("tools") or "").strip()
            )
        else:
            section_dict["content"] = {"languages": "", "tools": ""}
            has_content = False
    elif section.type in ("languages", "summary"):
        # Languages et Summary sont des strings
        content_str = str(section.items) if section.items else ""
        section_dict["content"] = content_str
        has_content = bool(content_str.strip())
    else:
        # Les autres types sont des listes (education, experiences, projects, leadership, custom)
        if isinstance(section.items, list):
            section_dict["content"] = [
                item.model_dump() if hasattr(item, "model_dump") else item for item in section.items
            ]
            has_content = len(section.items) > 0
        else:
            section_dict["content"] = []
            has_content = False

    section_dict["has_content"] = has_content
    return section_dict


@app.post("/generate")
async def generate_cv(
    data: ResumeData,
    request: Request,
    db: Any = Depends(get_db),  # noqa: B008
):
    """
    Génère un CV PDF à partir des données fournies.

    Args:
        data: Données du CV avec sections dynamiques.
        request: HTTP request (for optional auth header).
        db: Database session.

    Returns:
        FileResponse: Le fichier PDF généré.
    """
    # Extract user from JWT if present (optional auth)
    user = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            try:
                user_id = int(payload["sub"])
                user = db.query(User).filter(User.id == user_id).first()
            except (ValueError, TypeError):
                pass

    # Enforce download limits
    if user:
        if user.is_guest:
            max_downloads = MAX_DOWNLOADS_PER_GUEST
        elif user.is_premium:
            max_downloads = MAX_DOWNLOADS_PER_PREMIUM
        else:
            max_downloads = MAX_DOWNLOADS_PER_USER
        max_downloads += user.bonus_downloads

        current_downloads = _get_monthly_download_count(user, db)
        if current_downloads >= max_downloads:
            if user.is_guest:
                msg = (
                    f"Guest accounts are limited to {MAX_DOWNLOADS_PER_GUEST} "
                    "download per month. Create a free account to get more downloads."
                )
                raise HTTPException(status_code=429, detail=msg)
            if user.is_premium:
                raise HTTPException(
                    status_code=429,
                    detail=f"Monthly download limit reached ({MAX_DOWNLOADS_PER_PREMIUM}).",
                )
            raise HTTPException(
                status_code=429,
                detail=f"Monthly download limit reached ({MAX_DOWNLOADS_PER_USER}). "
                "Upgrade to Premium to get more downloads.",
            )

    # Créer un dossier temporaire pour la compilation
    temp_dir = tempfile.mkdtemp(prefix="cv_")
    temp_path = Path(temp_dir)
    pdf_content = None

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
        render_data: dict[str, Any] = {
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

        # SECURITY: Read PDF content before cleanup to ensure temp files are always deleted
        pdf_content = pdf_file.read_bytes()

    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Erreur de compilation LaTeX: {e}") from e
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur inattendue: {e}") from e
    finally:
        # SECURITY: Always clean up temporary files, even on exceptions
        with contextlib.suppress(Exception):
            shutil.rmtree(temp_path)

    # Increment download counter after successful generation
    if user:
        user.download_count += 1
        db.commit()

    # Return PDF from memory (temp files already cleaned up)
    from io import BytesIO

    return StreamingResponse(
        BytesIO(pdf_content),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=cv.pdf"},
    )


class OptimalSizeResponse(BaseModel):
    """Réponse de l'endpoint optimal-size."""

    optimal_size: str
    template_id: str
    tested_sizes: list[dict[str, Any]]


@app.post("/optimal-size", response_model=OptimalSizeResponse)
async def find_optimal_size(data: ResumeData):
    """
    Trouve la taille optimale de template pour que le CV tienne sur une page.

    Logique:
    - Teste d'abord 'large' (plus d'espace)
    - Si > 1 page, teste 'normal'
    - Si > 1 page, utilise 'compact'

    Returns:
        OptimalSizeResponse avec la taille optimale et le template_id correspondant.
    """
    base_template = get_base_template(data.template_id)
    tested_sizes = []
    temp_dirs = []

    try:
        for size in SIZE_VARIANTS:  # ["large", "normal", "compact"]
            template_id = get_template_with_size(base_template, size)

            # Vérifier que le template existe
            if template_id not in VALID_TEMPLATES:
                continue

            try:
                pdf_file, page_count, temp_path = generate_pdf_and_count_pages(data, template_id)
                temp_dirs.append(temp_path)

                tested_sizes.append(
                    {"size": size, "template_id": template_id, "page_count": page_count}
                )

                # Si le PDF tient sur une page, on a trouvé la taille optimale
                if page_count == 1:
                    return OptimalSizeResponse(
                        optimal_size=size, template_id=template_id, tested_sizes=tested_sizes
                    )
            except Exception as e:
                tested_sizes.append({"size": size, "template_id": template_id, "error": str(e)})

        # Si aucune taille ne permet de tenir sur une page, utiliser compact
        return OptimalSizeResponse(
            optimal_size="compact",
            template_id=get_template_with_size(base_template, "compact"),
            tested_sizes=tested_sizes,
        )

    finally:
        # Nettoyer tous les dossiers temporaires
        for temp_dir in temp_dirs:
            with contextlib.suppress(Exception):
                shutil.rmtree(temp_dir)


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

    with open(yaml_path, encoding="utf-8") as f:
        data = yaml.safe_load(f)

    return data


@app.post("/import")
async def import_cv(file: UploadFile = File(...)):  # noqa: B008
    """
    Importe un CV depuis un fichier PDF.

    Extrait le texte du PDF et utilise l'API Mistral pour mapper
    le contenu vers la structure ResumeData.

    Args:
        file: Fichier PDF uploadé.

    Returns:
        ResumeData: Données structurées du CV.
    """
    # Vérifier que c'est un PDF
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Le fichier doit être un PDF")

    # Vérifier la clé API Mistral
    api_key = os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500, detail="Clé API Mistral non configurée (MISTRAL_API_KEY)"
        )

    try:
        # Extraire le texte du PDF
        pdf_content = await file.read()

        # Créer un fichier temporaire pour pypdf
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(pdf_content)
            temp_pdf_path = temp_pdf.name

        try:
            with pdfplumber.open(temp_pdf_path) as pdf:
                text_content = ""
                for page in pdf.pages:
                    text_content += (page.extract_text() or "") + "\n"
        finally:
            Path(temp_pdf_path).unlink()

        if not text_content.strip():
            raise HTTPException(status_code=400, detail="Impossible d'extraire le texte du PDF")

        # Vérifier la taille du texte extrait (protection contre les abus)
        if len(text_content) > MAX_CV_TEXT_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"Le document est trop volumineux ({len(text_content):,} caractères). "
                f"Maximum autorisé : {MAX_CV_TEXT_LENGTH:,} caractères. "
                "Veuillez fournir un CV plus concis.",
            )

        # Appeler Mistral pour structurer les données
        client = Mistral(api_key=api_key)

        system_prompt = """Tu es un assistant spécialisé dans l'extraction de données de CV.
Analyse le texte du CV fourni et retourne un JSON avec la structure exacte suivante:

{
  "personal": {
    "name": "Nom complet",
    "title": "Titre professionnel",
    "location": "Ville, Pays",
    "email": "email@example.com",
    "phone": "+33 6 12 34 56 78",
    "links": [
      {"platform": "linkedin", "username": "john-doe", "url": "https://linkedin.com/in/john-doe"},
      {"platform": "github", "username": "johndoe", "url": "https://github.com/johndoe"},
      {"platform": "portfolio", "username": "Mon Portfolio", "url": "https://johndoe.dev"},
      {"platform": "behance", "username": "johndoe", "url": "https://behance.net/johndoe"},
      {"platform": "website", "username": "Site Personnel", "url": "https://example.com"},
      {"platform": "other", "username": "Autre Lien", "url": "https://..."}
    ]
  },
  "sections": [
    {
      "id": "sec-1",
      "type": "summary",
      "title": "Summary",
      "isVisible": true,
      "items": "Professionnel expérimenté avec X années d'expérience en..."
    },
    {
      "id": "sec-2",
      "type": "education",
      "title": "Education",
      "isVisible": true,
      "items": [
        {
            "school": "Nom école",
            "degree": "Diplôme",
            "dates": "2020 - 2024",
            "subtitle": "Mention/GPA",
            "description": "Description",
        }
      ]
    },
    {
      "id": "sec-3",
      "type": "experiences",
      "title": "Experiences",
      "isVisible": true,
      "items": [
        {
            "title": "Poste",
            "company": "Entreprise",
            "dates": "Jan 2023 - Present",
            "highlights": ["Point 1", "Point 2"],
        }
      ]
    },
    {
      "id": "sec-4",
      "type": "projects",
      "title": "Projects",
      "isVisible": true,
      "items": [
        {
            "name": "Nom projet",
            "year": "2023",
            "highlights": ["Description 1", "Description 2"],
        }
      ]
    },
    {
      "id": "sec-5",
      "type": "skills",
      "title": "Technical Skills",
      "isVisible": true,
      "items": {
          "languages": "Python, JavaScript, C++",
          "tools": "Git, Docker, Linux",
      }
    },
    {
      "id": "sec-6",
      "type": "leadership",
      "title": "Leadership",
      "isVisible": true,
      "items": [
        {
            "role": "Rôle",
            "place": "Organisation",
            "dates": "2022 - 2023",
            "highlights": ["Action 1"],
        }
      ]
    },
    {
      "id": "sec-7",
      "type": "languages",
      "title": "Languages",
      "isVisible": true,
      "items": "Français (natif), Anglais (courant)"
    }
  ],
  "template_id": "harvard"
}

IMPORTANT:
- "links" est un ARRAY de liens professionnels. Chaque lien a: platform
  (linkedin, github, portfolio, behance, website, other), username (texte affiché),
  url (lien complet)
- N'ajoute que les liens présents dans le CV
- Pour "summary", items est une STRING (le texte du résumé/profil)
- Pour "skills", items est un OBJET avec "languages" et "tools" (pas un array)
- Pour "languages", items est une STRING simple
- Pour les autres types, items est un ARRAY d'objets
- Génère des IDs uniques pour chaque section (sec-1, sec-2, etc.)
- Si une info n'est pas dans le CV, utilise une chaîne vide "" ou un array vide []
- N'invente pas d'informations, extrais uniquement ce qui est présent"""

        response = client.chat.complete(
            model="mistral-small-latest",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Voici le texte extrait du CV:\n\n{text_content}"},
            ],
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import: {str(e)}") from e


@app.post("/import-stream")
async def import_cv_stream(file: UploadFile = File(...)):  # noqa: B008
    """
    Importe un CV depuis un fichier PDF avec streaming SSE.
    Envoie les sections au fur et à mesure qu'elles sont extraites.
    """
    # Vérifier que c'est un PDF
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Le fichier doit être un PDF")

    # Vérifier la clé API Mistral
    api_key = os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500, detail="Clé API Mistral non configurée (MISTRAL_API_KEY)"
        )

    # Lire le PDF avant de commencer le streaming
    pdf_content = await file.read()

    async def generate_stream():
        try:
            # Envoyer l'événement de début d'extraction
            yield f"data: {json.dumps({'type': 'status', 'message': 'extracting'})}\n\n"
            await asyncio.sleep(0)

            # Créer un fichier temporaire pour pypdf
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
                temp_pdf.write(pdf_content)
                temp_pdf_path = temp_pdf.name

            try:
                with pdfplumber.open(temp_pdf_path) as pdf:
                    text_content = ""
                    for page in pdf.pages:
                        text_content += (page.extract_text() or "") + "\n"
            finally:
                Path(temp_pdf_path).unlink()

            if not text_content.strip():
                error_msg = "Impossible d'extraire le texte du PDF"
                yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"
                return

            # Vérifier la taille du texte extrait (protection contre les abus)
            if len(text_content) > MAX_CV_TEXT_LENGTH:
                error_msg = (
                    f"Le document est trop volumineux ({len(text_content):,} caractères). "
                    f"Maximum autorisé : {MAX_CV_TEXT_LENGTH:,} caractères. "
                    "Veuillez fournir un CV plus concis."
                )
                yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"
                return

            # Envoyer l'événement de traitement IA
            yield f"data: {json.dumps({'type': 'status', 'message': 'processing'})}\n\n"
            await asyncio.sleep(0)

            # Appeler Mistral avec streaming
            client = Mistral(api_key=api_key)

            system_prompt = """Tu es un assistant spécialisé dans l'extraction de données de CV.
Analyse le texte du CV fourni et retourne un JSON avec la structure exacte suivante:

{
  "personal": {
    "name": "Nom complet",
    "title": "Titre professionnel",
    "location": "Ville, Pays",
    "email": "email@example.com",
    "phone": "+33 6 12 34 56 78",
    "links": [
      {"platform": "linkedin", "username": "john-doe", "url": "https://linkedin.com/in/john-doe"},
      {"platform": "github", "username": "johndoe", "url": "https://github.com/johndoe"},
      {"platform": "portfolio", "username": "Mon Portfolio", "url": "https://johndoe.dev"},
      {"platform": "behance", "username": "johndoe", "url": "https://behance.net/johndoe"},
      {"platform": "website", "username": "Site Personnel", "url": "https://example.com"},
      {"platform": "other", "username": "Autre Lien", "url": "https://..."}
    ]
  },
  "sections": [
    {
      "id": "sec-1",
      "type": "summary",
      "title": "Summary",
      "isVisible": true,
      "items": "Professionnel expérimenté avec X années d'expérience en..."
    },
    {
      "id": "sec-2",
      "type": "education",
      "title": "Education",
      "isVisible": true,
      "items": [
        {
            "school": "Nom école",
            "degree": "Diplôme",
            "dates": "2020 - 2024",
            "subtitle": "Mention/GPA",
            "description": "Description",
        }
      ]
    },
    {
      "id": "sec-3",
      "type": "experiences",
      "title": "Experiences",
      "isVisible": true,
      "items": [
        {
            "title": "Poste",
            "company": "Entreprise",
            "dates": "Jan 2023 - Present",
            "highlights": ["Point 1", "Point 2"],
        }
      ]
    },
    {
      "id": "sec-4",
      "type": "projects",
      "title": "Projects",
      "isVisible": true,
      "items": [
        {
            "name": "Nom projet",
            "year": "2023",
            "highlights": ["Description 1", "Description 2"],
        }
      ]
    },
    {
      "id": "sec-5",
      "type": "skills",
      "title": "Technical Skills",
      "isVisible": true,
      "items": {
          "languages": "Python, JavaScript, C++",
          "tools": "Git, Docker, Linux",
      }
    },
    {
      "id": "sec-6",
      "type": "leadership",
      "title": "Leadership",
      "isVisible": true,
      "items": [
        {
            "role": "Rôle",
            "place": "Organisation",
            "dates": "2022 - 2023",
            "highlights": ["Action 1"],
        }
      ]
    },
    {
      "id": "sec-7",
      "type": "languages",
      "title": "Languages",
      "isVisible": true,
      "items": "Français (natif), Anglais (courant)"
    },
    {
      "id": "sec-8",
      "type": "custom",
      "title": "Centres d'intérêt",
      "isVisible": true,
      "items": [
        {
            "title": "Sport",
            "subtitle": "",
            "dates": "",
            "highlights": ["Football en club", "Course à pied"],
        },
        {
            "title": "Musique",
            "subtitle": "",
            "dates": "",
            "highlights": ["Piano depuis 10 ans"],
        }
      ]
    }
  ],
  "template_id": "harvard"
}

IMPORTANT:
- "links" est un ARRAY de liens professionnels. Chaque lien a: platform
  (linkedin, github, portfolio, behance, website, other), username (texte affiché),
  url (lien complet)
- N'ajoute que les liens présents dans le CV
- Pour "summary", items est une STRING (le texte du résumé/profil)
- Pour "skills", items est un OBJET avec "languages" et "tools" (pas un array)
- Pour "languages", items est une STRING simple
- Pour "custom", items est un ARRAY d'objets avec: title, subtitle (optionnel),
  dates (optionnel), highlights (array de strings)
- Pour les autres types (education, experiences, projects, leadership), items est
  un ARRAY d'objets selon leur structure respective
- Les types de section connus sont: summary, education, experiences, projects,
  skills, leadership, languages
- Pour TOUTE autre section du CV (Centres d'intérêt, Publications, Certifications,
  Bénévolat, Hobbies, Récompenses, etc.), utilise type="custom" avec le titre
  original de la section
- Génère des IDs uniques pour chaque section (sec-1, sec-2, etc.)
- Si une info n'est pas dans le CV, utilise une chaîne vide "" ou un array vide []
- N'invente pas d'informations, extrais uniquement ce qui est présent
- EXTRAIS TOUTES les sections présentes dans le CV, même celles qui ne
  correspondent pas aux types standards"""

            # Streaming depuis Mistral (async)
            stream = await client.chat.stream_async(
                model="mistral-small-latest",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Voici le texte extrait du CV:\n\n{text_content}"},
                ],
                response_format={"type": "json_object"},
            )

            accumulated_json = ""
            sent_personal = False
            sent_section_ids = set()

            def extract_json_object(text: str, start_key: str) -> tuple[dict | None, int]:
                """Extrait un objet JSON complet après une clé donnée."""
                key_pattern = f'"{start_key}"\\s*:\\s*'
                match = re.search(key_pattern, text)
                if not match:
                    return None, -1

                start = match.end()
                if start >= len(text):
                    return None, -1

                # Trouver le début de l'objet ou array
                while start < len(text) and text[start] in " \t\n\r":
                    start += 1

                if start >= len(text):
                    return None, -1

                open_char = text[start]
                if open_char == "{":
                    close_char = "}"
                elif open_char == "[":
                    close_char = "]"
                elif open_char == '"':
                    # C'est une string, chercher la fin
                    end = start + 1
                    while end < len(text):
                        if text[end] == '"' and text[end - 1] != "\\":
                            try:
                                return json.loads(text[start : end + 1]), end + 1
                            except Exception:
                                return None, -1
                        end += 1
                    return None, -1
                else:
                    return None, -1

                # Compter les brackets pour trouver la fin
                depth = 1
                pos = start + 1
                in_string = False

                while pos < len(text) and depth > 0:
                    char = text[pos]
                    if char == '"' and (pos == 0 or text[pos - 1] != "\\"):
                        in_string = not in_string
                    elif not in_string:
                        if char == open_char:
                            depth += 1
                        elif char == close_char:
                            depth -= 1
                    pos += 1

                if depth == 0:
                    try:
                        return json.loads(text[start:pos]), pos
                    except json.JSONDecodeError:
                        return None, -1

                return None, -1

            async for event in stream:
                if event.data.choices[0].delta.content:
                    accumulated_json += event.data.choices[0].delta.content

                    # Extraire personal dès qu'il est complet
                    if not sent_personal and '"personal"' in accumulated_json:
                        personal_data, _ = extract_json_object(accumulated_json, "personal")
                        if personal_data:
                            msg = json.dumps({"type": "personal", "data": personal_data})
                            yield f"data: {msg}\n\n"
                            await asyncio.sleep(0)
                            sent_personal = True

                    # Extraire les sections individuellement au fur et à mesure
                    # Chercher tous les objets qui commencent par {"id": "sec-
                    section_starts = [
                        m.start() for m in re.finditer(r'\{\s*"id"\s*:\s*"sec-', accumulated_json)
                    ]
                    for start_pos in section_starts:
                        # Compter les brackets pour trouver la fin de cet objet
                        depth = 0
                        pos = start_pos
                        in_string = False

                        while pos < len(accumulated_json):
                            char = accumulated_json[pos]
                            if char == '"' and (pos == 0 or accumulated_json[pos - 1] != "\\"):
                                in_string = not in_string
                            elif not in_string:
                                if char == "{":
                                    depth += 1
                                elif char == "}":
                                    depth -= 1
                                    if depth == 0:
                                        # Objet complet trouvé
                                        try:
                                            section_json = accumulated_json[start_pos : pos + 1]
                                            section = json.loads(section_json)
                                            if (
                                                "id" in section
                                                and section["id"] not in sent_section_ids
                                            ):
                                                msg = json.dumps(
                                                    {"type": "section", "data": section}
                                                )
                                                yield f"data: {msg}\n\n"
                                                await asyncio.sleep(0)
                                                sent_section_ids.add(section["id"])
                                        except json.JSONDecodeError:
                                            pass
                                        break
                            pos += 1

            # Parser le JSON final complet
            try:
                result = json.loads(accumulated_json)
                msg = json.dumps({"type": "complete", "data": result})
                yield f"data: {msg}\n\n"
            except json.JSONDecodeError as e:
                error_msg = json.dumps(
                    {"type": "error", "message": f"Erreur parsing JSON: {str(e)}"}
                )
                yield f"data: {error_msg}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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
