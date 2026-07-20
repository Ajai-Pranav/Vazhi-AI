"""
routes/study_material.py
────────────────────────────────────────────────────────────────────────────
Study Material generation route.

POST /study-material/generate  — LLM generates Markdown study material
GET  /study-material/history   — List the current user's saved materials
GET  /study-material/{id}      — Fetch a specific material (full content)
DELETE /study-material/{id}    — Delete a material owned by the current user
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from database import get_db
import db_models
from models.schemas import (
    StudyMaterialRequest,
    StudyMaterialResponse,
    StudyMaterialListItem,
)
from services.auth_service import get_current_user
from services.groq_service import generate_study_material
from limiter import limiter

logger = logging.getLogger("VazhiAI.study_material")

router = APIRouter(prefix="/study-material", tags=["study-material"])


# ── Generate ──────────────────────────────────────────────────────────────────

@router.post(
    "/generate",
    response_model=StudyMaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("5/hour")
async def generate_material(
    request: Request,
    payload: StudyMaterialRequest,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    """
    Call the Groq LLM to generate study material for the requested topic(s).
    Saves the result to the DB and returns the full Markdown content.
    Rate-limited to 5 calls per hour per user to control token costs.
    """
    logger.info(
        "STUDY_MATERIAL_GENERATE | user=%s | topics=%s | difficulty=%s | length=%s",
        current_user.id,
        payload.topics,
        payload.difficulty,
        payload.output_length,
    )

    try:
        markdown = await generate_study_material(
            topics=payload.topics,
            difficulty=payload.difficulty,
            education_level=payload.education_level,
            language=payload.language or "English",
            output_length=payload.output_length,
        )
    except ValueError as exc:
        logger.error("STUDY_MATERIAL_LLM_ERROR | user=%s | error=%s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI returned an invalid response. Please try again.",
        )
    except Exception as exc:
        logger.exception("STUDY_MATERIAL_UNEXPECTED | user=%s | error=%s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate study material. Please try again later.",
        )

    # Persist to DB
    record = db_models.StudyMaterial(
        user_id=current_user.id,
        topics=payload.topics,
        difficulty=payload.difficulty,
        education_level=payload.education_level,
        language=payload.language or "English",
        output_length=payload.output_length,
        markdown_content=markdown,
        generation_status="completed",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    logger.info(
        "STUDY_MATERIAL_SAVED | user=%s | material_id=%s | chars=%d",
        current_user.id,
        record.id,
        len(markdown),
    )

    return StudyMaterialResponse(
        id=record.id,
        topics=record.topics,
        difficulty=record.difficulty,
        language=record.language,
        output_length=record.output_length,
        markdown_content=record.markdown_content,
        generated_at=record.created_at,
    )


# ── List history ──────────────────────────────────────────────────────────────

@router.get("/history", response_model=list[StudyMaterialListItem])
async def list_history(
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    """Return a paginated list of the current user's generated study materials (no content body)."""
    records = (
        db.query(db_models.StudyMaterial)
        .filter(db_models.StudyMaterial.user_id == current_user.id)
        .order_by(db_models.StudyMaterial.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        StudyMaterialListItem(
            id=r.id,
            topics=r.topics,
            difficulty=r.difficulty,
            language=r.language,
            output_length=r.output_length,
            generated_at=r.created_at,
        )
        for r in records
    ]


# ── Fetch single ──────────────────────────────────────────────────────────────

@router.get("/{material_id}", response_model=StudyMaterialResponse)
async def get_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    """Fetch the full content of a specific study material owned by the current user."""
    record = (
        db.query(db_models.StudyMaterial)
        .filter(
            db_models.StudyMaterial.id == material_id,
            db_models.StudyMaterial.user_id == current_user.id,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Study material not found")

    return StudyMaterialResponse(
        id=record.id,
        topics=record.topics,
        difficulty=record.difficulty,
        language=record.language,
        output_length=record.output_length,
        markdown_content=record.markdown_content,
        generated_at=record.created_at,
    )


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    """Delete a study material owned by the current user."""
    record = (
        db.query(db_models.StudyMaterial)
        .filter(
            db_models.StudyMaterial.id == material_id,
            db_models.StudyMaterial.user_id == current_user.id,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Study material not found")

    db.delete(record)
    db.commit()
    logger.info("STUDY_MATERIAL_DELETED | user=%s | material_id=%s", current_user.id, material_id)
