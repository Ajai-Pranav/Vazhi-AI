from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from models.schemas import StudentProfile, CareerSuggestion, ChatMessageResponse, ChatMessageCreate
from services.auth_service import get_current_user
from services.groq_service import client, generate_chat_response, explore_paths_chat, generate_roadmap_outline
from database import get_db
import db_models
import json
import re
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessageInput(BaseModel):
    role: str
    content: str

class ChatRefineRequest(BaseModel):
    profile: StudentProfile
    history: List[ChatMessageInput]
    message: str

class ChatRefineResponse(BaseModel):
    reply: str
    suggestions: Optional[List[CareerSuggestion]] = None

@router.post("/refine-suggestions", response_model=ChatRefineResponse)
async def refine_suggestions(
    body: ChatRefineRequest,
    current_user: db_models.User = Depends(get_current_user),
):
    """
    Refine suggestions conversationally. Accepts student profile, previous conversation history, 
    and the user's new message. Returns conversational response and optionally updated suggestions.
    """
    try:
        tech = ", ".join(body.profile.tech_stack) if body.profile.tech_stack else "Not specified"
        
        system_prompt = f"""You are an expert career guidance AI advisor for college students in India.
You have previously suggested career roadmap options for this student:

STUDENT PROFILE:
- Name: {body.profile.name}
- Age: {body.profile.age}
- College: {body.profile.college}
- Course: {body.profile.course}
- Current Year: {body.profile.current_year} of {body.profile.total_years}
- Known Tech Stack: {tech}
- Dream Job/Goal: {body.profile.dream_job}
- Current Confusion/Problem: {body.profile.confusion}

INSTRUCTIONS:
1. Conversational Refinement: The user is chatting with you to refine their suggested career paths. They may ask for changes like "give more options", "show beginner-friendly suggestions", "less coding focused", "higher salary options", or ask general questions.
2. If the user asks for new suggestions or to modify/refine the existing paths, you MUST regenerate exactly 3 to 4 suggestions matching their request and provide them in the JSON structure.
3. If they are just asking a question, chatting, or asking for clarification without wanting to change/regenerate career paths, set the "suggestions" field to null.
4. Response Format: You must ALWAYS respond ONLY with a valid JSON object matching the schema below. Do not output markdown, preambles, or explanations outside the JSON.
5. Unlawful / Non-Educational Input Handling: If the user's message or profile contains unlawful, illegal, or harmful details (e.g. hacking, weapons, illegal activities), or details completely unrelated to education or careers, you MUST decline. In this case, return a JSON response where "reply" is set exactly to "It is not legally correct to do that." and "suggestions" is set to null.

Expected JSON structure:
{{
  "reply": "Your conversational reply to the student's message (1-3 sentences). Always include this.",
  "suggestions": [  // Provide 3-4 suggestions if the user asked to refine/change suggestions. If they are just chatting or no change is requested/needed, set this to null.
    {{
      "title": "short catchy path title",
      "description": "2–3 sentence overview of this career path",
      "why_this_fits_user": "specific explanation referencing their confusion and background (2–3 sentences)",
      "required_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
      "roadmap_steps": ["Step 1: ...", "Step 2: ...", "Step 3: ...", "Step 4: ...", "Step 5: ...", "Step 6: ..."],
      "estimated_timeline": "e.g. 8–12 months",
      "difficulty": "Beginner or Intermediate or Advanced"
    }}
  ]
}}"""

        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        for msg in body.history:
            messages.append({"role": msg.role, "content": msg.content})
            
        messages.append({"role": "user", "content": body.message})
        
        chat_completion = await client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=4000,
        )
        
        raw = chat_completion.choices[0].message.content
        
        # --- Robust JSON extraction ---
        # Stage 1: strip markdown fences and try direct parse
        clean = re.sub(r"```(?:json)?", "", raw).strip()
        data = None
        try:
            data = json.loads(clean)
        except json.JSONDecodeError:
            pass
        
        # Stage 2: if direct parse failed, locate the first {...} block in the text
        if data is None:
            match = re.search(r'\{[\s\S]*\}', clean)
            if match:
                try:
                    data = json.loads(match.group())
                except json.JSONDecodeError:
                    pass
        
        # Stage 3: complete fallback — return the raw LLM text as a plain reply
        # instead of raising a 500 that the frontend shows as "Sorry, I had an error"
        if data is None:
            return ChatRefineResponse(
                reply=clean[:1000] if clean else "I had trouble formatting my response. Please try rephrasing your question.",
                suggestions=None
            )
        
        if "reply" not in data:
            data["reply"] = "Here are the updated suggestions based on your request."
            
        return ChatRefineResponse(**data)
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse AI response as JSON: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error in chat refinement: {str(e)}"
        )


@router.get("/history", response_model=List[ChatMessageResponse])
async def get_chat_history(
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    query = db.query(db_models.ChatMessage).filter(
        db_models.ChatMessage.user_id == current_user.id
    )
    if session_id:
        query = query.filter(db_models.ChatMessage.session_id == session_id)
    return query.order_by(db_models.ChatMessage.created_at.asc()).all()


class UserMessageInput(BaseModel):
    message: str
    session_id: Optional[str] = None
    day_number: Optional[int] = None


@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(
    body: UserMessageInput,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    roadmap = db.query(db_models.Roadmap).filter(
        db_models.Roadmap.user_id == current_user.id,
        db_models.Roadmap.is_active == True,
    ).first()
    
    roadmap_title = roadmap.title if roadmap else "General Guidance"
    
    day_details = {}
    if roadmap and body.day_number is not None:
        day_str = str(body.day_number)
        if roadmap.detailed_days and day_str in roadmap.detailed_days:
            day_details = roadmap.detailed_days[day_str]
            
    history_messages = db.query(db_models.ChatMessage).filter(
        db_models.ChatMessage.user_id == current_user.id
    )
    if body.session_id:
        history_messages = history_messages.filter(db_models.ChatMessage.session_id == body.session_id)
        
    recent_history = history_messages.order_by(db_models.ChatMessage.created_at.desc()).limit(10).all()
    recent_history.reverse()
    
    formatted_history = []
    for h in recent_history:
        formatted_history.append({"role": h.role, "content": h.content})
        
    profile_dict = {
        "name": current_user.name,
        "age": current_user.age,
        "college": current_user.college,
        "course": current_user.course,
        "current_year": current_user.current_year,
        "total_years": current_user.total_years,
        "tech_stack": current_user.tech_stack or [],
        "dream_job": current_user.dream_job or "",
    }
    
    user_msg = db_models.ChatMessage(
        user_id=current_user.id,
        session_id=body.session_id,
        role="user",
        content=body.message
    )
    db.add(user_msg)
    db.commit()
    
    try:
        reply_content = await generate_chat_response(
            message=body.message,
            history=formatted_history,
            profile=profile_dict,
            roadmap_title=roadmap_title,
            day_number=body.day_number or 0,
            day_details=day_details
        )
        
        assistant_msg = db_models.ChatMessage(
            user_id=current_user.id,
            session_id=body.session_id,
            role="assistant",
            content=reply_content
        )
        db.add(assistant_msg)
        db.commit()
        db.refresh(assistant_msg)
        
        return assistant_msg
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate advisor reply: {str(e)}")


class ExplorePathsRequest(BaseModel):
    message: str
    history: List[ChatMessageInput] = []
    confirm_new_roadmap: bool = False

class ExplorePathsResponse(BaseModel):
    reply: str
    intent: str
    roadmap_updated: bool = False
    needs_confirmation: bool = False
    updated_roadmap: Optional[dict] = None


@router.post("/explore-paths", response_model=ExplorePathsResponse)
async def explore_paths_chat_endpoint(
    body: ExplorePathsRequest,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    """
    Explore Paths chatbot endpoint. Handles roadmap modifications,
    restructuring, and new roadmap generation through conversation.
    """
    try:
        # Fetch active roadmap
        roadmap = db.query(db_models.Roadmap).filter(
            db_models.Roadmap.user_id == current_user.id,
            db_models.Roadmap.is_active == True,
        ).first()

        roadmap_dict = None
        if roadmap:
            roadmap_dict = {
                "id": roadmap.id,
                "title": roadmap.title,
                "description": roadmap.description,
                "duration_weeks": roadmap.duration_weeks,
                "experience_level": roadmap.experience_level,
                "learning_pace": roadmap.learning_pace,
                "available_time": roadmap.available_time,
                "difficulty": roadmap.difficulty,
                "outline": roadmap.outline or [],
                "required_skills": roadmap.required_skills or [],
                "roadmap_steps": roadmap.roadmap_steps or [],
            }

        user_profile = {
            "name": current_user.name,
            "field": current_user.field or "",
            "educational_status": current_user.educational_status or "Student",
            "dream_job": current_user.dream_job or "",
            "tech_stack": current_user.tech_stack or [],
            "experience_level": current_user.experience_level or "Beginner",
            "college": current_user.college or "",
            "course": current_user.course or "",
        }

        # Build conversation history
        formatted_history = [{"role": msg.role, "content": msg.content} for msg in body.history]
        # Add current user message
        formatted_history.append({"role": "user", "content": body.message})

        # Call LLM
        result = await explore_paths_chat(
            user_profile=user_profile,
            current_roadmap=roadmap_dict,
            conversation_history=formatted_history,
            confirm_new_roadmap=body.confirm_new_roadmap,
        )

        intent = result.get("intent", "general_chat")
        reply = result.get("reply", "I'm not sure how to help with that. Could you rephrase?")
        updated_outline = result.get("updated_outline")
        needs_confirmation = result.get("needs_confirmation", False)
        roadmap_updated = False
        updated_roadmap_data = None

        # Handle minor/major modifications — update the existing roadmap outline
        if intent in ("minor_modification", "major_restructuring") and updated_outline and roadmap:
            # Smart cache management: only clear changed or removed days
            old_outline_map = {d.get("day"): d for d in (roadmap.outline or [])}
            new_detailed_days = {}
            old_detailed_days = roadmap.detailed_days or {}
            
            for new_day in updated_outline:
                day_num = new_day.get("day")
                day_num_str = str(day_num)
                old_day = old_outline_map.get(day_num)
                
                # Check if the day is identical in title, focus, module, and difficulty
                if (
                    old_day
                    and old_day.get("title") == new_day.get("title")
                    and old_day.get("focus") == new_day.get("focus")
                    and old_day.get("module") == new_day.get("module")
                    and old_day.get("difficulty") == new_day.get("difficulty")
                    and day_num_str in old_detailed_days
                ):
                    # Keep the cached details for this day
                    new_detailed_days[day_num_str] = old_detailed_days[day_num_str]

            roadmap.outline = updated_outline
            roadmap.detailed_days = new_detailed_days
            
            # Update duration_weeks based on updated outline length (5 study days = 1 week)
            if len(updated_outline) > 0:
                roadmap.duration_weeks = (len(updated_outline) + 4) // 5

            db.commit()
            db.refresh(roadmap)
            roadmap_updated = True
            updated_roadmap_data = {
                "id": roadmap.id,
                "title": roadmap.title,
                "outline": roadmap.outline,
                "duration_weeks": roadmap.duration_weeks,
            }

        # Handle new roadmap after confirmation — deactivate old, create placeholder
        if intent == "new_roadmap_confirmed" and body.confirm_new_roadmap:
            new_requirements = result.get("new_roadmap_requirements")
            if new_requirements and isinstance(new_requirements, dict):
                # Deactivate old roadmap
                if roadmap:
                    roadmap.is_active = False
                    db.commit()

                # Create new roadmap from requirements
                new_title = new_requirements.get("title", f"{current_user.dream_job or 'Career'} Roadmap")
                new_desc = new_requirements.get("description", "AI-generated roadmap")
                duration_weeks = new_requirements.get("duration_weeks", 8)
                exp_level = new_requirements.get("experience_level", current_user.experience_level or "Beginner")

                new_roadmap = db_models.Roadmap(
                    user_id=current_user.id,
                    title=new_title,
                    description=new_desc,
                    is_active=True,
                    is_confirmed=False,
                    user_field=current_user.field or "",
                    user_educational_status=current_user.educational_status or "Student",
                    user_dream_job=new_requirements.get("dream_job", current_user.dream_job or ""),
                    duration_weeks=duration_weeks,
                    experience_level=exp_level,
                    required_skills=[],
                    roadmap_steps=[],
                )
                db.add(new_roadmap)
                db.commit()
                db.refresh(new_roadmap)

                # Generate outline for the new roadmap
                try:
                    outline = await generate_roadmap_outline(
                        goal_title=new_title,
                        goal_desc=new_desc,
                        required_skills=[],
                        duration_weeks=duration_weeks,
                        exp_level=exp_level,
                        pace="Moderate",
                        user_field=current_user.field or "",
                        user_status=current_user.educational_status or "Student",
                    )
                    new_roadmap.outline = outline
                    new_roadmap.is_confirmed = True
                    new_roadmap.detailed_days = {}
                    db.commit()
                    db.refresh(new_roadmap)
                except Exception as e:
                    print(f"Failed to generate outline for new roadmap: {e}")

                roadmap_updated = True
                updated_roadmap_data = {
                    "id": new_roadmap.id,
                    "title": new_roadmap.title,
                    "outline": new_roadmap.outline,
                    "duration_weeks": new_roadmap.duration_weeks,
                }
                reply += "\n\n✅ Your new roadmap has been created! Head over to the Roadmap page to start studying."

        return ExplorePathsResponse(
            reply=reply,
            intent=intent,
            roadmap_updated=roadmap_updated,
            needs_confirmation=needs_confirmation,
            updated_roadmap=updated_roadmap_data,
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Explore paths error: {str(e)}")
