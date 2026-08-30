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
MODEL = "openai/gpt-oss-120b"

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


# ── Curated problem-title → verified-slug maps ────────────────────────────────
# The LLM is not reliable at generating correct deep-link slugs (it hallucinates
# plausible-looking but broken /problems/<slug> URLs), which is why links were
# previously downgraded to generic keyword-search pages. That's safe but lands
# the user on a search results list instead of the specific problem.
#
# For the small set of extremely well-known, stable practice problems below —
# the classic interview questions the AI is instructed to prefer — we know the
# exact, verified slug, so we can link straight to the problem page instead of
# a search. Anything NOT in these tables (less common/obscure problems) still
# safely falls back to the search/category page, exactly as before, rather
# than guessing a slug that might 404.
LEETCODE_PROBLEM_SLUGS = {
    # Arrays & Hashing
    "two sum": "two-sum",
    "contains duplicate": "contains-duplicate",
    "valid anagram": "valid-anagram",
    "group anagrams": "group-anagrams",
    "top k frequent elements": "top-k-frequent-elements",
    "product of array except self": "product-of-array-except-self",
    "valid sudoku": "valid-sudoku",
    "longest consecutive sequence": "longest-consecutive-sequence",
    "majority element": "majority-element",
    "missing number": "missing-number",
    "rotate array": "rotate-array",
    "intersection of two arrays": "intersection-of-two-arrays",
    "intersection of two arrays ii": "intersection-of-two-arrays-ii",
    "single number": "single-number",
    # Two Pointers / Sliding Window
    "valid palindrome": "valid-palindrome",
    "3sum": "3sum",
    "container with most water": "container-with-most-water",
    "trapping rain water": "trapping-rain-water",
    "best time to buy and sell stock": "best-time-to-buy-and-sell-stock",
    "longest substring without repeating characters": "longest-substring-without-repeating-characters",
    "longest repeating character replacement": "longest-repeating-character-replacement",
    "minimum window substring": "minimum-window-substring",
    "minimum size subarray sum": "minimum-size-subarray-sum",
    # Stack
    "valid parentheses": "valid-parentheses",
    "min stack": "min-stack",
    "evaluate reverse polish notation": "evaluate-reverse-polish-notation",
    "generate parentheses": "generate-parentheses",
    "daily temperatures": "daily-temperatures",
    "largest rectangle in histogram": "largest-rectangle-in-histogram",
    # Binary Search
    "binary search": "binary-search",
    "search a 2d matrix": "search-a-2d-matrix",
    "koko eating bananas": "koko-eating-bananas",
    "find minimum in rotated sorted array": "find-minimum-in-rotated-sorted-array",
    "search in rotated sorted array": "search-in-rotated-sorted-array",
    "median of two sorted arrays": "median-of-two-sorted-arrays",
    # Linked List
    "reverse linked list": "reverse-linked-list",
    "merge two sorted lists": "merge-two-sorted-lists",
    "reorder list": "reorder-list",
    "remove nth node from end of list": "remove-nth-node-from-end-of-list",
    "copy list with random pointer": "copy-list-with-random-pointer",
    "add two numbers": "add-two-numbers",
    "linked list cycle": "linked-list-cycle",
    "merge k sorted lists": "merge-k-sorted-lists",
    "reverse nodes in k-group": "reverse-nodes-in-k-group",
    "palindrome linked list": "palindrome-linked-list",
    # Trees
    "invert binary tree": "invert-binary-tree",
    "maximum depth of binary tree": "maximum-depth-of-binary-tree",
    "diameter of binary tree": "diameter-of-binary-tree",
    "balanced binary tree": "balanced-binary-tree",
    "same tree": "same-tree",
    "subtree of another tree": "subtree-of-another-tree",
    "lowest common ancestor of a binary search tree": "lowest-common-ancestor-of-a-binary-search-tree",
    "binary tree level order traversal": "binary-tree-level-order-traversal",
    "validate binary search tree": "validate-binary-search-tree",
    "kth smallest element in a bst": "kth-smallest-element-in-a-bst",
    "construct binary tree from preorder and inorder traversal": "construct-binary-tree-from-preorder-and-inorder-traversal",
    "binary tree maximum path sum": "binary-tree-maximum-path-sum",
    "serialize and deserialize binary tree": "serialize-and-deserialize-binary-tree",
    "symmetric tree": "symmetric-tree",
    "binary tree inorder traversal": "binary-tree-inorder-traversal",
    # Tries
    "implement trie (prefix tree)": "implement-trie-prefix-tree",
    "design add and search words data structure": "design-add-and-search-words-data-structure",
    "word search ii": "word-search-ii",
    # Heap / Priority Queue
    "kth largest element in an array": "kth-largest-element-in-an-array",
    "find median from data stream": "find-median-from-data-stream",
    "task scheduler": "task-scheduler",
    # Backtracking
    "subsets": "subsets",
    "subsets ii": "subsets-ii",
    "combination sum": "combination-sum",
    "permutations": "permutations",
    "word search": "word-search",
    "palindrome partitioning": "palindrome-partitioning",
    "letter combinations of a phone number": "letter-combinations-of-a-phone-number",
    "n-queens": "n-queens",
    # Graphs
    "number of islands": "number-of-islands",
    "clone graph": "clone-graph",
    "course schedule": "course-schedule",
    "course schedule ii": "course-schedule-ii",
    "pacific atlantic water flow": "pacific-atlantic-water-flow",
    "redundant connection": "redundant-connection",
    "word ladder": "word-ladder",
    "network delay time": "network-delay-time",
    # Dynamic Programming
    "climbing stairs": "climbing-stairs",
    "house robber": "house-robber",
    "house robber ii": "house-robber-ii",
    "longest palindromic substring": "longest-palindromic-substring",
    "palindromic substrings": "palindromic-substrings",
    "decode ways": "decode-ways",
    "coin change": "coin-change",
    "maximum product subarray": "maximum-product-subarray",
    "word break": "word-break",
    "longest increasing subsequence": "longest-increasing-subsequence",
    "partition equal subset sum": "partition-equal-subset-sum",
    "unique paths": "unique-paths",
    "longest common subsequence": "longest-common-subsequence",
    "edit distance": "edit-distance",
    # Greedy
    "maximum subarray": "maximum-subarray",
    "jump game": "jump-game",
    "jump game ii": "jump-game-ii",
    "gas station": "gas-station",
    # Intervals
    "insert interval": "insert-interval",
    "merge intervals": "merge-intervals",
    "non-overlapping intervals": "non-overlapping-intervals",
    # Math & Geometry
    "rotate image": "rotate-image",
    "spiral matrix": "spiral-matrix",
    "set matrix zeroes": "set-matrix-zeroes",
    "happy number": "happy-number",
    "plus one": "plus-one",
    "multiply strings": "multiply-strings",
    "fizz buzz": "fizz-buzz",
    # Bit Manipulation
    "number of 1 bits": "number-of-1-bits",
    "counting bits": "counting-bits",
    "reverse bits": "reverse-bits",
    "sum of two integers": "sum-of-two-integers",
    "fizz buzz": "fizz-buzz",
    "fizzbuzz": "fizz-buzz",  # LLMs/authors often write this as one word
    # SQL
    "second highest salary": "second-highest-salary",
}

HACKERRANK_PROBLEM_SLUGS = {
    "solve me first": "solve-me-first",
    "simple array sum": "simple-array-sum",
    "compare the triplets": "compare-the-triplets",
    "a very big sum": "a-very-big-sum",
    "diagonal difference": "diagonal-difference",
    "plus minus": "plus-minus",
    "staircase": "staircase",
    "mini-max sum": "mini-max-sum",
    "birthday cake candles": "birthday-cake-candles",
    "time conversion": "time-conversion",
    "grading students": "grading-students",
    "apple and orange": "apple-and-orange",
    "kangaroo": "kangaroo",
    "between two sets": "between-two-sets",
    "migratory birds": "migratory-birds",
    "day of the programmer": "day-of-the-programmer",
    "sock merchant": "sock-merchant",
    "drawing book": "drawing-book",
    "counting valleys": "counting-valleys",
    "electronics shop": "electronics-shop",
    "cats and a mouse": "cats-and-a-mouse",
    "picking numbers": "picking-numbers",
    "climbing the leaderboard": "climbing-the-leaderboard",
    "the hurdle race": "the-hurdle-race",
    "designer pdf viewer": "designer-pdf-viewer",
    "utopian tree": "utopian-tree",
    "angry professor": "angry-professor",
}


def _normalize_problem_title(title: str) -> str:
    """Lowercase + collapse whitespace/punctuation for dictionary lookups."""
    import re as _re
    return _re.sub(r"\s+", " ", (title or "").strip().lower())


def _build_practice_link(problem_title: str, platform: str, fallback_url: str = "") -> str:
    """
    Build the link for a practice problem, preferring a direct link to the
    EXACT problem page over a generic keyword-search page.

    If the problem is one of our verified classics, link straight to it.
    Otherwise, fall back to the existing safe search/category page — we
    deliberately do not guess an unverified slug, since a wrong guess is a
    dead 404, which is worse than a search page.
    """
    import urllib.parse

    key = _normalize_problem_title(problem_title)
    platform_l = (platform or "").strip().lower()

    if "leetcode" in platform_l:
        slug = LEETCODE_PROBLEM_SLUGS.get(key)
        if slug:
            return f"https://leetcode.com/problems/{slug}/description/"
        return f"https://leetcode.com/problemset/?search={urllib.parse.quote_plus(problem_title)}"

    if "hackerrank" in platform_l:
        slug = HACKERRANK_PROBLEM_SLUGS.get(key)
        if slug:
            return f"https://www.hackerrank.com/challenges/{slug}/problem"
        return "https://www.hackerrank.com/domains/algorithms"

    if "geeksforgeeks" in platform_l or platform_l == "gfg":
        return f"https://www.geeksforgeeks.org/explore?page=1&search={urllib.parse.quote_plus(problem_title)}"

    if "codeforces" in platform_l:
        return "https://codeforces.com/problemset"

    # Unknown/"Other" platform — keep whatever safe URL was already produced
    return fallback_url


def _sanitize_day_links(data: dict) -> dict:
    """
    Post-process LLM day output to ensure all links are safe and working.

    Strategies applied:
    - YouTube: any non-search YouTube URL is converted to a search URL using the resource title.
    - LeetCode / HackerRank: practice problems matching a verified title in
      LEETCODE_PROBLEM_SLUGS / HACKERRANK_PROBLEM_SLUGS link straight to that
      exact problem page; everything else keeps the safe search/category link.
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

    # Sanitize practice problem links — prefer a direct link to the exact
    # problem (via the curated slug tables) over a generic keyword search.
    for problem in data.get("practice", []):
        if isinstance(problem, dict):
            safe_url = _fix_url(problem.get("link", ""), problem.get("problem", ""))
            problem["link"] = _build_practice_link(
                problem.get("problem", ""),
                problem.get("platform", ""),
                fallback_url=safe_url,
            )

    return data


def _dedupe_practice_problems(outline: list) -> list:
    """
    Deterministic safety net so no practice problem (e.g. a LeetCode/HackerRank
    question) is assigned to more than one day across the whole roadmap.

    The outline prompt already instructs the LLM not to repeat problems across
    days, but for long roadmaps (many weeks = many days, each needing 2 unique
    problems) LLMs occasionally repeat a well-known question (e.g. "Two Sum")
    by mistake. Since the entire outline — and therefore every day's
    suggested_problems — is generated in this one pass, we can walk the days
    in order here and drop any problem whose normalized title already
    appeared on an earlier day, before it's ever stored or shown to the user.

    This intentionally does not invent a replacement problem (that would risk
    fabricating something inaccurate) — a day may end up with 1 problem
    instead of 2 rather than a duplicate, which is the safer trade-off.
    """
    seen: set[str] = set()
    removed = 0
    for day in outline:
        if not isinstance(day, dict):
            continue
        problems = day.get("suggested_problems") or []
        unique_problems = []
        for p in problems:
            if not isinstance(p, dict):
                continue
            title = (p.get("problem") or "").strip().lower()
            key = re.sub(r"\s+", " ", title)
            if not key:
                continue
            if key in seen:
                removed += 1
                continue
            seen.add(key)
            unique_problems.append(p)
        day["suggested_problems"] = unique_problems

    if removed:
        logger.info("DEDUPE_PRACTICE_PROBLEMS | removed=%d duplicate problem(s) across roadmap outline", removed)

    return outline


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

    # Deterministic backstop: strip any practice problem repeated across days
    data = _dedupe_practice_problems(data)

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

