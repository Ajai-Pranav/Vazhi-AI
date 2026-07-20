import logging
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db
import db_models
from models.schemas import (
    RoadmapCreate, RoadmapResponse,
    DailyProgressCreate, DailyProgressResponse,
    DetailedRoadmapConfig, RoadmapOutlineResponse,
    DayRoadmapDetails, TestSubmitRequest, TestScoreResponse,
    TestQuestionResult
)
from services.auth_service import get_current_user
from services.groq_service import generate_roadmap_outline, generate_day_details
from typing import List
from limiter import limiter

logger = logging.getLogger("VazhiAI.roadmaps")
router = APIRouter(prefix="/roadmaps", tags=["roadmaps"])


# ── Background Task Worker Functions ──────────────────────────────────────────

async def bg_generate_outline(
    roadmap_id: str,
    duration_weeks: int,
    experience_level: str,
    available_time: str,
    learning_pace: str,
    user_field: str,
    user_status: str,
):
    """Asynchronous background worker to request and store the roadmap outline."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        roadmap = db.query(db_models.Roadmap).filter(db_models.Roadmap.id == roadmap_id).first()
        if not roadmap:
            logger.error("BG_GENERATE_OUTLINE | Roadmap %s not found", roadmap_id)
            return

        outline_data = await generate_roadmap_outline(
            goal_title=roadmap.title,
            goal_desc=roadmap.description or "",
            required_skills=roadmap.required_skills or [],
            duration_weeks=duration_weeks,
            exp_level=experience_level,
            pace=learning_pace,
            user_field=user_field,
            user_status=user_status,
        )

        roadmap.duration_weeks = duration_weeks
        roadmap.experience_level = experience_level
        roadmap.available_time = available_time
        roadmap.learning_pace = learning_pace
        roadmap.outline = outline_data
        roadmap.detailed_days = {}
        roadmap.days_status = {}
        roadmap.generation_status = "completed"
        roadmap.generation_error = None
        roadmap.is_confirmed = True

        db.commit()
        logger.info("BG_GENERATE_OUTLINE_COMPLETED | roadmap_id=%s", roadmap_id)
    except Exception as e:
        db.rollback()
        logger.exception("BG_GENERATE_OUTLINE_FAILED | roadmap_id=%s | error=%s", roadmap_id, repr(e))
        roadmap = db.query(db_models.Roadmap).filter(db_models.Roadmap.id == roadmap_id).first()
        if roadmap:
            roadmap.generation_status = "failed"
            roadmap.generation_error = str(e)
            db.commit()
    finally:
        db.close()


async def bg_generate_day(
    roadmap_id: str,
    day_number: int,
    day_title: str,
    day_focus: str,
    exp_level: str,
    pace: str,
    study_time: str,
    user_field: str,
    user_status: str,
):
    """Asynchronous background worker to request and store day details."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        roadmap = db.query(db_models.Roadmap).filter(db_models.Roadmap.id == roadmap_id).first()
        if not roadmap:
            logger.error("BG_GENERATE_DAY | Roadmap %s not found", roadmap_id)
            return

        # Find the outline item to get pre-assigned suggested problems
        suggested_problems = None
        for item in (roadmap.outline or []):
            if isinstance(item, dict) and item.get("day") == day_number:
                suggested_problems = item.get("suggested_problems")
                break

        day_details = await generate_day_details(
            goal_title=roadmap.title,
            day_number=day_number,
            day_title=day_title,
            day_focus=day_focus,
            exp_level=exp_level,
            pace=pace,
            study_time=study_time,
            user_field=user_field,
            user_status=user_status,
            suggested_problems=suggested_problems,
        )

        # Merge new day details and update day status
        detailed_days = dict(roadmap.detailed_days or {})
        detailed_days[str(day_number)] = day_details
        roadmap.detailed_days = detailed_days

        days_status = dict(roadmap.days_status or {})
        days_status[str(day_number)] = "completed"
        roadmap.days_status = days_status

        db.commit()
        logger.info("BG_GENERATE_DAY_COMPLETED | roadmap_id=%s | day=%d", roadmap_id, day_number)
    except Exception as e:
        db.rollback()
        logger.exception("BG_GENERATE_DAY_FAILED | roadmap_id=%s | day=%d | error=%s", roadmap_id, day_number, repr(e))
        roadmap = db.query(db_models.Roadmap).filter(db_models.Roadmap.id == roadmap_id).first()
        if roadmap:
            days_status = dict(roadmap.days_status or {})
            days_status[str(day_number)] = "failed"
            roadmap.days_status = days_status
            db.commit()
    finally:
        db.close()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=RoadmapResponse)
async def save_roadmap(
    body: RoadmapCreate,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    # Deactivate previous active roadmaps
    db.query(db_models.Roadmap).filter(
        db_models.Roadmap.user_id == current_user.id,
        db_models.Roadmap.is_active == True,
    ).update({"is_active": False})

    roadmap = db_models.Roadmap(
        user_id=current_user.id,
        user_field=current_user.field,
        user_educational_status=current_user.educational_status,
        user_dream_job=current_user.dream_job,
        **body.model_dump()
    )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)
    return roadmap


@router.get("", response_model=List[RoadmapResponse])
async def get_roadmaps(
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    return db.query(db_models.Roadmap).filter(
        db_models.Roadmap.user_id == current_user.id
    ).all()


@router.get("/active", response_model=RoadmapResponse)
async def get_active_roadmap(
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    roadmap = db.query(db_models.Roadmap).filter(
        db_models.Roadmap.user_id == current_user.id,
        db_models.Roadmap.is_active == True,
    ).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="No active roadmap found")
    return roadmap


@router.post("/active/confirm", response_model=RoadmapResponse)
async def confirm_active_roadmap(
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    roadmap = db.query(db_models.Roadmap).filter(
        db_models.Roadmap.user_id == current_user.id,
        db_models.Roadmap.is_active == True,
    ).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="No active roadmap found")
    roadmap.is_confirmed = True
    db.commit()
    db.refresh(roadmap)
    return roadmap


@router.post("/progress", response_model=DailyProgressResponse)
async def save_progress(
    body: DailyProgressCreate,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    # Upsert by date
    existing = db.query(db_models.DailyProgress).filter(
        db_models.DailyProgress.user_id == current_user.id,
        db_models.DailyProgress.date == body.date,
    ).first()

    if existing:
        existing.completed_tasks = body.completed_tasks
        existing.solved_problems = body.solved_problems
        existing.notes = body.notes
        db.commit()
        db.refresh(existing)
        return existing

    progress = db_models.DailyProgress(
        user_id=current_user.id,
        **body.model_dump()
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)
    return progress


@router.get("/progress", response_model=List[DailyProgressResponse])
async def get_progress(
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    return db.query(db_models.DailyProgress).filter(
        db_models.DailyProgress.user_id == current_user.id
    ).order_by(db_models.DailyProgress.date.desc()).limit(30).all()


@router.post("/active/confirm-custom", response_model=RoadmapResponse)
@limiter.limit("5/minute")
async def confirm_custom_roadmap(
    request: Request,
    body: DetailedRoadmapConfig,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    """
    Starts roadmap outline generation asynchronously.
    Returns 202 Accepted status immediately.
    """
    roadmap = db.query(db_models.Roadmap).filter(
        db_models.Roadmap.user_id == current_user.id,
        db_models.Roadmap.is_active == True,
    ).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="No active roadmap found")

    roadmap.generation_status = "processing"
    roadmap.generation_error = None
    db.commit()
    db.refresh(roadmap)

    # Schedule outline generation in background thread
    background_tasks.add_task(
        bg_generate_outline,
        roadmap_id=roadmap.id,
        duration_weeks=body.duration_weeks,
        experience_level=body.experience_level,
        available_time=body.available_time,
        learning_pace=body.learning_pace,
        user_field=roadmap.user_field or current_user.field or "",
        user_status=roadmap.user_educational_status or current_user.educational_status or "",
    )

    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={
            "message": "Roadmap outline generation started in background.",
            "roadmap_id": roadmap.id,
            "generation_status": "processing",
        }
    )


@router.get("/active/day/{day_number}")
@limiter.limit("20/minute")
async def get_roadmap_day(
    request: Request,
    day_number: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    """
    Fetch day details. If details aren't generated yet, schedules generation
    in the background and returns a 202 status indicating 'processing'.
    """
    roadmap = db.query(db_models.Roadmap).filter(
        db_models.Roadmap.user_id == current_user.id,
        db_models.Roadmap.is_active == True,
        db_models.Roadmap.is_confirmed == True,
    ).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="No confirmed active roadmap found")

    day_str = str(day_number)
    detailed_days = roadmap.detailed_days or {}
    days_status = roadmap.days_status or {}

    # 1. If already generated, return the details immediately
    if day_str in detailed_days:
        return detailed_days[day_str]

    # 2. If already processing, return 202
    if days_status.get(day_str) == "processing":
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={"status": "processing", "day": day_number}
        )

    # 3. Find the outline item to know what we need to generate
    day_outline = None
    for item in (roadmap.outline or []):
        if item.get("day") == day_number:
            day_outline = item
            break

    if not day_outline:
        raise HTTPException(status_code=404, detail=f"Day {day_number} not found in roadmap outline")

    # 4. Mark processing and schedule background task
    new_days_status = dict(days_status)
    new_days_status[day_str] = "processing"
    roadmap.days_status = new_days_status
    db.commit()

    background_tasks.add_task(
        bg_generate_day,
        roadmap_id=roadmap.id,
        day_number=day_number,
        day_title=day_outline.get("title", f"Day {day_number}"),
        day_focus=day_outline.get("focus", ""),
        exp_level=roadmap.experience_level or "Beginner",
        pace=roadmap.learning_pace or "Standard",
        study_time=roadmap.available_time or "2 hours",
        user_field=roadmap.user_field or current_user.field or "",
        user_status=roadmap.user_educational_status or current_user.educational_status or "",
    )

    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={"status": "processing", "day": day_number}
    )


@router.post("/active/progress", response_model=DailyProgressResponse)
async def save_active_progress(
    body: DailyProgressCreate,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    roadmap = db.query(db_models.Roadmap).filter(
        db_models.Roadmap.user_id == current_user.id,
        db_models.Roadmap.is_active == True,
    ).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="No active roadmap found")

    existing = None
    if body.day_number is not None:
        existing = db.query(db_models.DailyProgress).filter(
            db_models.DailyProgress.user_id == current_user.id,
            db_models.DailyProgress.roadmap_id == roadmap.id,
            db_models.DailyProgress.day_number == body.day_number,
        ).first()
    else:
        existing = db.query(db_models.DailyProgress).filter(
            db_models.DailyProgress.user_id == current_user.id,
            db_models.DailyProgress.date == body.date,
        ).first()

    if existing:
        existing.completed_tasks = body.completed_tasks
        existing.solved_problems = body.solved_problems
        existing.notes = body.notes
        existing.date = body.date
        db.commit()
        db.refresh(existing)
        return existing

    progress = db_models.DailyProgress(
        user_id=current_user.id,
        roadmap_id=roadmap.id,
        date=body.date,
        day_number=body.day_number,
        completed_tasks=body.completed_tasks,
        solved_problems=body.solved_problems,
        notes=body.notes
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)
    return progress


@router.get("/active/progress", response_model=List[DailyProgressResponse])
async def get_active_progress(
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    roadmap = db.query(db_models.Roadmap).filter(
        db_models.Roadmap.user_id == current_user.id,
        db_models.Roadmap.is_active == True,
    ).first()
    if not roadmap:
        return []

    return db.query(db_models.DailyProgress).filter(
        db_models.DailyProgress.user_id == current_user.id,
        db_models.DailyProgress.roadmap_id == roadmap.id
    ).all()


@router.post("/active/tests", response_model=TestScoreResponse)
async def submit_active_test(
    body: TestSubmitRequest,
    day_number: int,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    roadmap = db.query(db_models.Roadmap).filter(
        db_models.Roadmap.user_id == current_user.id,
        db_models.Roadmap.is_active == True,
        db_models.Roadmap.is_confirmed == True,
    ).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="No active confirmed roadmap found")

    day_str = str(day_number)
    detailed_days = roadmap.detailed_days or {}
    if day_str not in detailed_days:
        raise HTTPException(status_code=400, detail=f"Day {day_number} details not generated yet")

    day_data = detailed_days[day_str]
    mcqs = day_data.get("mcqTest", [])

    if len(body.answers) != len(mcqs):
        raise HTTPException(
            status_code=400,
            detail=f"Expected {len(mcqs)} answers, but received {len(body.answers)}"
        )

    correct_count = 0
    question_results = []

    for idx, mcq in enumerate(mcqs):
        correct_ans = mcq.get("answer", "").strip().upper()
        selected_ans = body.answers[idx].strip().upper()

        is_correct = (selected_ans == correct_ans)
        if is_correct:
            correct_count += 1

        question_results.append(
            TestQuestionResult(
                question=mcq.get("question", ""),
                options=mcq.get("options", []),
                selected=selected_ans,
                correct=correct_ans
            )
        )

    total_q = len(mcqs)
    score_pct = round((correct_count / total_q) * 10.0, 1) if total_q > 0 else 0.0

    from datetime import date
    today_str = date.today().isoformat()

    existing_test = db.query(db_models.DailyTest).filter(
        db_models.DailyTest.user_id == current_user.id,
        db_models.DailyTest.roadmap_id == roadmap.id,
        db_models.DailyTest.day_number == day_number
    ).first()

    answers_json = [r.model_dump() for r in question_results]

    if existing_test:
        existing_test.score = score_pct
        existing_test.total_questions = total_q
        existing_test.correct_answers = correct_count
        existing_test.answers = answers_json
        existing_test.date = today_str
        db.commit()
    else:
        new_test = db_models.DailyTest(
            user_id=current_user.id,
            roadmap_id=roadmap.id,
            day_number=day_number,
            date=today_str,
            topic=day_data.get("title", ""),
            score=score_pct,
            total_questions=total_q,
            correct_answers=correct_count,
            answers=answers_json
        )
        db.add(new_test)
        db.commit()

    return TestScoreResponse(
        day_number=day_number,
        score=score_pct,
        total_questions=total_q,
        correct_answers=correct_count,
        answers=question_results
    )


@router.get("/active/tests", response_model=List[TestScoreResponse])
async def get_active_tests(
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    roadmap = db.query(db_models.Roadmap).filter(
        db_models.Roadmap.user_id == current_user.id,
        db_models.Roadmap.is_active == True,
    ).first()
    if not roadmap:
        return []

    tests = db.query(db_models.DailyTest).filter(
        db_models.DailyTest.user_id == current_user.id,
        db_models.DailyTest.roadmap_id == roadmap.id
    ).all()

    results = []
    for t in tests:
        ans_list = []
        for ans in (t.answers or []):
            ans_list.append(
                TestQuestionResult(
                    question=ans.get("question", ""),
                    options=ans.get("options", []),
                    selected=ans.get("selected", ""),
                    correct=ans.get("correct", "")
                )
            )
        results.append(
            TestScoreResponse(
                day_number=t.day_number,
                score=t.score,
                total_questions=t.total_questions,
                correct_answers=t.correct_answers,
                answers=ans_list
            )
        )
    return results
