"""Resume API routes with JWT authentication."""

import contextlib
import json
import shutil
import tempfile
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from auth.dependencies import CurrentUser
from core.LatexRenderer import LatexRenderer
from core.PdfCompiler import PdfCompiler
from database.db_config import get_db
from database.models import Resume, User
from translations import get_section_title

router = APIRouter(prefix="/api/resumes", tags=["Resumes"])

# SECURITY: Resource limits to prevent abuse
MAX_RESUMES_PER_GUEST = 1
MAX_RESUMES_PER_USER = 3
MAX_RESUMES_PER_PREMIUM = 100
MAX_DOWNLOADS_PER_GUEST = 1
MAX_DOWNLOADS_PER_USER = 3
MAX_DOWNLOADS_PER_PREMIUM = 1000
MAX_JSON_CONTENT_SIZE = 100 * 1024  # 100 KB max for JSON content

# Template configuration
TEMPLATE_DIR = Path(__file__).parent.parent
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


# === Pydantic Schemas ===


class ResumeCreate(BaseModel):
    """Schema for creating a resume."""

    name: str = Field(..., max_length=255)
    json_content: dict | None = None

    @field_validator("json_content")
    @classmethod
    def validate_json_size(cls, v: dict | None) -> dict | None:
        """Validate JSON content size to prevent DoS attacks."""
        if v is not None:
            json_size = len(json.dumps(v))
            if json_size > MAX_JSON_CONTENT_SIZE:
                raise ValueError(
                    f"JSON content too large ({json_size} bytes). "
                    f"Maximum allowed: {MAX_JSON_CONTENT_SIZE} bytes."
                )
        return v


class ResumeUpdate(BaseModel):
    """Schema for updating a resume."""

    name: str | None = Field(default=None, max_length=255)
    json_content: dict | None = None

    @field_validator("json_content")
    @classmethod
    def validate_json_size(cls, v: dict | None) -> dict | None:
        """Validate JSON content size to prevent DoS attacks."""
        if v is not None:
            json_size = len(json.dumps(v))
            if json_size > MAX_JSON_CONTENT_SIZE:
                raise ValueError(
                    f"JSON content too large ({json_size} bytes). "
                    f"Maximum allowed: {MAX_JSON_CONTENT_SIZE} bytes."
                )
        return v


class ResumeResponse(BaseModel):
    """Schema for resume response."""

    id: int
    user_id: int
    name: str
    json_content: dict | None
    s3_url: str | None

    model_config = {"from_attributes": True}


class ResumeListResponse(BaseModel):
    """Schema for listing resumes."""

    resumes: list[ResumeResponse]
    total: int


# === Routes ===


@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def create_resume(
    resume_data: ResumeCreate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Resume:
    """Create a new resume for the authenticated user.

    Args:
        resume_data: Resume data (name, json_content).
        current_user: Authenticated user from JWT token.
        db: Database session.

    Returns:
        The created resume.

    Raises:
        HTTPException: 429 if user has reached max resumes limit.
    """
    # SECURITY: Check if user has reached max resumes limit per tier
    if current_user.is_guest:
        max_resumes = MAX_RESUMES_PER_GUEST
    elif current_user.is_premium:
        max_resumes = MAX_RESUMES_PER_PREMIUM
    else:
        max_resumes = MAX_RESUMES_PER_USER
    max_resumes += current_user.bonus_resumes

    resume_count = db.query(Resume).filter(Resume.user_id == current_user.id).count()
    if resume_count >= max_resumes:
        if current_user.is_guest:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Guest accounts are limited to {MAX_RESUMES_PER_GUEST} resume. "
                "Create a free account to save more resumes.",
            )
        if current_user.is_premium:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Maximum number of resumes reached ({MAX_RESUMES_PER_PREMIUM}).",
            )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum number of resumes reached ({MAX_RESUMES_PER_USER}). "
            "Upgrade to Premium to save more resumes.",
        )

    new_resume = Resume(
        user_id=current_user.id,
        name=resume_data.name,
        json_content=resume_data.json_content,
    )

    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)

    return new_resume


@router.get("", response_model=ResumeListResponse)
async def list_resumes(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """List all resumes for the authenticated user.

    Args:
        current_user: Authenticated user from JWT token.
        db: Database session.

    Returns:
        List of user's resumes with total count.
    """
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    return {"resumes": resumes, "total": len(resumes)}


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Resume:
    """Get a specific resume by ID.

    Args:
        resume_id: ID of the resume to retrieve.
        current_user: Authenticated user from JWT token.
        db: Database session.

    Returns:
        The resume if found and owned by user.

    Raises:
        HTTPException: 404 if resume not found or not owned by user.
    """
    resume = (
        db.query(Resume)
        .filter(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,  # Security: only own resumes
        )
        .first()
    )

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    return resume


@router.put("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: int,
    resume_data: ResumeUpdate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Resume:
    """Update a resume.

    Args:
        resume_id: ID of the resume to update.
        resume_data: Fields to update.
        current_user: Authenticated user from JWT token.
        db: Database session.

    Returns:
        The updated resume.

    Raises:
        HTTPException: 404 if resume not found or not owned by user.
    """
    resume = (
        db.query(Resume)
        .filter(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,  # Security: only own resumes
        )
        .first()
    )

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    # Update only provided fields
    if resume_data.name is not None:
        resume.name = resume_data.name
    if resume_data.json_content is not None:
        resume.json_content = resume_data.json_content

    db.commit()
    db.refresh(resume)

    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Delete a resume.

    Args:
        resume_id: ID of the resume to delete.
        current_user: Authenticated user from JWT token.
        db: Database session.

    Raises:
        HTTPException: 404 if resume not found or not owned by user.
    """
    resume = (
        db.query(Resume)
        .filter(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,  # Security: only own resumes
        )
        .first()
    )

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    db.delete(resume)
    db.commit()


def _get_monthly_download_count(user: User, db: Session) -> int:
    """Get the user's download count for the current month, resetting if needed.

    If the stored reset timestamp is from a previous month, reset the counter to 0.

    Args:
        user: The user to check.
        db: Database session.

    Returns:
        Current monthly download count.
    """
    now = datetime.now(UTC)
    reset_at = user.download_count_reset_at

    if reset_at is None or (reset_at.year, reset_at.month) != (now.year, now.month):
        user.download_count = 0
        user.download_count_reset_at = now
        db.flush()

    return user.download_count


def _convert_section_items(section: dict[str, Any], lang: str = "fr") -> dict[str, Any]:
    """Convert a section dict for LaTeX rendering.

    Args:
        section: Section data from json_content.
        lang: Language code for translation.

    Returns:
        Section dict ready for LaTeX template.
    """
    section_type = section.get("type", "custom")
    translated_title = get_section_title(section_type, lang, section.get("title", ""))

    section_dict = {
        "id": section.get("id", ""),
        "type": section_type,
        "title": translated_title,
        "isVisible": section.get("isVisible", True),
    }

    items = section.get("items", [])
    if section_type == "skills":
        # Compatibilité avec l'ancien format {languages, tools}
        if isinstance(items, dict):
            categories = []
            if (items.get("languages") or "").strip():
                categories.append({"category": "Programming Languages", "skills": items["languages"]})
            if (items.get("tools") or "").strip():
                categories.append({"category": "Tools", "skills": items["tools"]})
            section_dict["content"] = categories
        elif isinstance(items, list):
            section_dict["content"] = items
        else:
            section_dict["content"] = []
    elif section_type in ("languages", "summary"):
        section_dict["content"] = str(items) if items else ""
    else:
        section_dict["content"] = items if isinstance(items, list) else []

    return section_dict


@router.post("/{resume_id}/generate")
async def generate_resume_pdf(
    resume_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    template_id: str = "harvard",
    lang: str = "fr",
) -> StreamingResponse:
    """Generate a PDF from a saved resume.

    Args:
        resume_id: ID of the resume to generate.
        current_user: Authenticated user from JWT token.
        db: Database session.
        template_id: LaTeX template to use.
        lang: Language for section titles (fr, en).

    Returns:
        PDF file response.

    Raises:
        HTTPException: 404 if resume not found, 400 if no content.
    """
    # SECURITY: Enforce monthly download limits per tier
    if current_user.is_guest:
        max_downloads = MAX_DOWNLOADS_PER_GUEST
    elif current_user.is_premium:
        max_downloads = MAX_DOWNLOADS_PER_PREMIUM
    else:
        max_downloads = MAX_DOWNLOADS_PER_USER
    max_downloads += current_user.bonus_downloads

    current_downloads = _get_monthly_download_count(current_user, db)
    if current_downloads >= max_downloads:
        if current_user.is_guest:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Guest accounts are limited to {MAX_DOWNLOADS_PER_GUEST} download per month. "
                    "Create a free account to get more downloads."
                ),
            )
        if current_user.is_premium:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Monthly download limit reached ({MAX_DOWNLOADS_PER_PREMIUM}).",
            )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Monthly download limit reached ({MAX_DOWNLOADS_PER_USER}). "
            "Upgrade to Premium to get more downloads.",
        )

    resume = (
        db.query(Resume)
        .filter(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
        .first()
    )

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    if not resume.json_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume has no content to generate",
        )

    # Create temporary directory for compilation
    temp_dir = tempfile.mkdtemp(prefix="cv_")
    temp_path = Path(temp_dir)
    pdf_content = None
    resume_name = resume.name

    try:
        # Validate template
        template_id = template_id if template_id in VALID_TEMPLATES else DEFAULT_TEMPLATE
        template_filename = f"{template_id}.tex"

        # Copy template
        template_src = TEMPLATES_FOLDER / template_filename
        if not template_src.exists():
            template_src = TEMPLATES_FOLDER / f"{DEFAULT_TEMPLATE}.tex"
        template_dst = temp_path / template_filename
        shutil.copy(template_src, template_dst)

        # Prepare data for rendering
        lang = lang if lang in ("fr", "en") else "fr"
        json_content = resume.json_content

        render_data: dict[str, Any] = {
            "personal": json_content.get("personal", {}),
            "sections": [_convert_section_items(s, lang) for s in json_content.get("sections", [])],
        }

        # Render LaTeX template
        renderer = LatexRenderer(temp_path, template_filename)
        tex_content = renderer.render(render_data)

        # Write .tex file
        tex_file = temp_path / "main.tex"
        tex_file.write_text(tex_content, encoding="utf-8")

        # Compile to PDF
        compiler = PdfCompiler(tex_file)
        compiler.compile(clean=True)

        # Verify PDF was generated
        pdf_file = temp_path / "main.pdf"
        if not pdf_file.exists():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="PDF generation failed",
            )

        # SECURITY: Read PDF content before cleanup to ensure temp files are always deleted
        pdf_content = pdf_file.read_bytes()

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LaTeX compilation error: {e}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {e}",
        ) from e
    finally:
        # SECURITY: Always clean up temporary files, even on exceptions
        with contextlib.suppress(Exception):
            shutil.rmtree(temp_path)

    # Increment download counter after successful generation
    current_user.download_count += 1
    db.commit()

    # Return PDF from memory (temp files already cleaned up)
    return StreamingResponse(
        BytesIO(pdf_content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={resume_name}.pdf"},
    )
