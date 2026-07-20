import os
import json
import re
import logging
from dotenv import load_dotenv
load_dotenv()
from groq import AsyncGroq, GroqError
from pydantic import ValidationError, TypeAdapter
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from models.schemas import (
    StudentProfile, SuggestionsResponse, RoadmapOutlineItem, DayRoadmapDetails
)
from services.prompt_engine import (
    build_suggestions_prompt,
    build_roadmap_outline_prompt,
    build_day_details_prompt,
    build_chat_system_prompt,
    build_resume_optimization_prompt,
    build_explore_paths_prompt,
    build_study_material_prompt,
)

logger = logging.getLogger("VazhiAI.groq_service")

client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"

# ── Robust Retry Decorator using Tenacity ─────────────────────────────────────
# Retries up to 3 times on JSON errors, validation errors, or Groq API rate limits/timeouts.
# Uses exponential backoff (e.g. 2s, 4s, 8s).
groq_retry = retry(
    retry=retry_if_exception_type((
        json.JSONDecodeError,
        ValidationError,
        GroqError
    )),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    before_sleep=lambda retry_state: logger.warning(
        f"Retrying Groq API call after exception: {repr(retry_state.outcome.exception())} "
        f"(Attempt {retry_state.attempt_number}/3)"
    ),
    reraise=True
)


def _extract_json(raw: str) -> dict | list:
    """Extract and parse a JSON block from the LLM response."""
    clean = re.sub(r"```(?:json)?", "", raw).strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass
    for pattern in (r'\{[\s\S]*\}', r'\[[\s\S]*\]'):
        match = re.search(pattern, clean)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                continue
    raise json.JSONDecodeError("No valid JSON found in LLM response", raw, 0)


def _sanitize_day_links(data: dict) -> dict:
    """
    Post-process LLM day output to ensure all links are safe and working.

    Strategies applied:
    - YouTube: any non-search YouTube URL is converted to a search URL using the resource title.
    - LeetCode: any deep problem URL (e.g. /problems/<slug>) is replaced with a search URL.
    - HackerRank: any deep challenge URL is replaced with a domain/category URL.
    - GeeksforGeeks: any deep article URL is replaced with a search explore URL.
    - Codeforces: any deep problem URL is replaced with a search URL.
    """
    import urllib.parse

    def _fix_url(url: str, title: str = "") -> str:
        if not url or not isinstance(url, str):
            return url

        # ── YouTube: enforce search format ────────────────────────────────
        if "youtube.com" in url and "search_query" not in url:
            query = urllib.parse.quote_plus(title or "tutorial")
            return f"https://www.youtube.com/results?search_query={query}"

        # ── LeetCode: replace deep /problems/<slug> with search URL ───────
        if "leetcode.com/problems/" in url:
            # Extract slug from URL and use it as search term
            slug = url.split("/problems/")[-1].strip("/").split("/")[0]
            search_term = urllib.parse.quote_plus(slug.replace("-", " "))
            return f"https://leetcode.com/problemset/?search={search_term}"

        # ── HackerRank: replace deep challenge URLs with domain URL ───────
        if "hackerrank.com/challenges/" in url:
            return "https://www.hackerrank.com/domains/algorithms"

        # ── GeeksforGeeks: replace deep article URLs with explore search ──
        if "geeksforgeeks.org/" in url and "/explore" not in url:
            slug = url.rstrip("/").split("/")[-1]
            search_term = urllib.parse.quote_plus(slug.replace("-", " "))
            return f"https://www.geeksforgeeks.org/explore?page=1&search={search_term}"

        # ── Codeforces: replace deep problem URLs with search URL ─────────
        if "codeforces.com/problemset/problem/" in url:
            return "https://codeforces.com/problemset"

        return url

    # Sanitize resources
    for resource in data.get("resources", []):
        if isinstance(resource, dict):
            resource["link"] = _fix_url(
                resource.get("link", ""),
                resource.get("title", "")
            )

    # Sanitize practice problem links
    for problem in data.get("practice", []):
        if isinstance(problem, dict):
            problem["link"] = _fix_url(
                problem.get("link", ""),
                problem.get("problem", "")
            )

    return data


@groq_retry
async def generate_suggestions(profile: StudentProfile) -> SuggestionsResponse:
    """Generate personalized career suggestions using domain-specific prompt."""
    profile_dict = profile.model_dump()
    prompt = build_suggestions_prompt(profile_dict)

    completion = await client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a career guidance expert. Always respond with valid JSON only matching the schema."},
            {"role": "user", "content": prompt},
        ],
        model=MODEL,
        temperature=0.7,
        max_tokens=4000,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content
    data = _extract_json(raw)
    return SuggestionsResponse(**data)


@groq_retry
async def generate_suggestions_from_dict(profile_dict: dict) -> SuggestionsResponse:
    """Generate suggestions from a plain dict profile (used by new onboarding flow)."""
    prompt = build_suggestions_prompt(profile_dict)

    completion = await client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a career guidance expert. Always respond with valid JSON only matching the schema."},
            {"role": "user", "content": prompt},
        ],
        model=MODEL,
        temperature=0.7,
        max_tokens=4000,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content
    data = _extract_json(raw)
    return SuggestionsResponse(**data)


@groq_retry
async def generate_roadmap_outline(
    goal_title: str,
    goal_desc: str,
    required_skills: list,
    duration_weeks: int,
    exp_level: str,
    pace: str,
    user_field: str = "",
    user_status: str = "",
) -> list:
    """Generate a day-by-day roadmap outline using domain-aware prompt."""
    prompt = build_roadmap_outline_prompt(
        goal_title=goal_title,
        goal_desc=goal_desc,
        required_skills=required_skills,
        duration_weeks=duration_weeks,
        exp_level=exp_level,
        pace=pace,
        user_field=user_field,
        user_status=user_status,
    )

    completion = await client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a curriculum design expert. Always respond with valid JSON only containing the curriculum list."},
            {"role": "user", "content": prompt},
        ],
        model=MODEL,
        temperature=0.7,
        max_tokens=8000,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content
    data = _extract_json(raw)

    # Validation and formatting normalization
    if not isinstance(data, list):
        if isinstance(data, dict) and "outline" in data:
            data = data["outline"]
        else:
            raise ValidationError.from_exception_data(
                "Roadmap outline response must be a JSON array.",
                line_errors=[]
            )

    # Validate each item matches the schema
    TypeAdapter(list[RoadmapOutlineItem]).validate_python(data)
    return data


@groq_retry
async def generate_day_details(
    goal_title: str,
    day_number: int,
    day_title: str,
    day_focus: str,
    exp_level: str,
    pace: str,
    study_time: str,
    user_field: str = "",
    user_status: str = "",
    suggested_problems: list = None,
) -> dict:
    """Generate detailed study content for one day using domain-aware prompt."""
    prompt = build_day_details_prompt(
        goal_title=goal_title,
        day_number=day_number,
        day_title=day_title,
        day_focus=day_focus,
        exp_level=exp_level,
        pace=pace,
        study_time=study_time,
        user_field=user_field,
        user_status=user_status,
        suggested_problems=suggested_problems or [],
    )

    completion = await client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a technical tutor. Always respond with valid JSON only matching the schema."},
            {"role": "user", "content": prompt},
        ],
        model=MODEL,
        temperature=0.7,
        max_tokens=6000,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content
    data = _extract_json(raw)

    # Sanitize all links before validation
    data = _sanitize_day_links(data)

    # Validate that it matches DayRoadmapDetails schema strictly
    DayRoadmapDetails.model_validate(data)
    return data


@groq_retry
async def generate_chat_response(
    message: str,
    history: list,
    profile: dict,
    roadmap_title: str,
    day_number: int,
    day_details: dict,
) -> str:
    """Generate a domain-aware AI mentor chat response."""
    system_prompt = build_chat_system_prompt(profile, roadmap_title, day_number, day_details)

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": message})

    completion = await client.chat.completions.create(
        messages=messages,
        model=MODEL,
        temperature=0.7,
        max_tokens=2000,
    )
    return completion.choices[0].message.content.strip()


@groq_retry
async def optimize_resume(resume_data: dict, target_role: str) -> dict:
    """Optimize resume data using Groq LLM to make it ATS-friendly."""
    prompt = build_resume_optimization_prompt(resume_data, target_role)

    completion = await client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are an ATS optimization expert. Always respond with valid JSON only matching the schema."},
            {"role": "user", "content": prompt},
        ],
        model=MODEL,
        temperature=0.3,
        max_tokens=4000,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content
    return _extract_json(raw)


@groq_retry
async def explore_paths_chat(
    user_profile: dict,
    current_roadmap: dict | None,
    conversation_history: list,
    confirm_new_roadmap: bool = False,
) -> dict:
    """Process an Explore Paths chatbot message using the LLM."""
    prompt = build_explore_paths_prompt(
        user_profile=user_profile,
        current_roadmap=current_roadmap,
        conversation_history=conversation_history,
        confirm_new_roadmap=confirm_new_roadmap,
    )

    messages = [{"role": "system", "content": prompt}]
    for msg in conversation_history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    completion = await client.chat.completions.create(
        messages=messages,
        model=MODEL,
        temperature=0.7,
        max_tokens=6000,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content
    data = _extract_json(raw)

    # Basic validations
    if not isinstance(data, dict) or "reply" not in data or "intent" not in data:
        raise ValidationError.from_exception_data(
            "Explore paths response is missing required fields (reply/intent).",
            line_errors=[]
        )
    return data


@groq_retry
async def generate_study_material(
    topics: list,
    difficulty: str,
    education_level: str | None,
    language: str,
    output_length: str,
) -> str:
    """
    Generate comprehensive study material as Markdown using the Groq LLM.

    Returns raw Markdown string — no JSON parsing needed.
    The frontend renders this as HTML and optionally exports it to PDF.

    Token budget scales with output_length:
      Short   → 2 500 tokens  (~600–900 words)
      Medium  → 5 000 tokens  (~1 200–1 800 words)
      Detailed → 8 000 tokens (~2 500–4 000 words)
    """
    max_tokens_map = {
        "Short": 2500,
        "Medium": 5000,
        "Detailed": 8000,
    }
    max_tokens = max_tokens_map.get(output_length, 8000)

    prompt = build_study_material_prompt(
        topics=topics,
        difficulty=difficulty,
        education_level=education_level,
        language=language or "English",
        output_length=output_length,
    )

    completion = await client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert educator and technical writer. "
                    "Generate structured, high-quality study material in pure Markdown. "
                    "Do NOT wrap your response in JSON. Do NOT add any preamble. "
                    "Return ONLY the Markdown content starting with the first ## heading."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        model=MODEL,
        temperature=0.6,
        max_tokens=max_tokens,
        # No response_format=json_object — we want raw Markdown text
    )

    markdown = completion.choices[0].message.content.strip()

    # Minimal sanity check — ensure we got Markdown back, not empty or JSON
    if not markdown or len(markdown) < 50:
        raise ValueError("LLM returned insufficient content for study material generation")

    return markdown

