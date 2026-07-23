"""
prompt_engine.py
─────────────────────────────────────────────────────────────────────────────
Domain-specific prompt builder for VazhiAI broad user network.
Each field/status combination gets a tailored prompt that references the
correct tools, platforms, and career realities for that domain.
"""

import json
from constants import DOMAIN_RESOURCES


def _domain_context(field: str) -> str:
    """Return domain-specific tool/platform/focus context string."""
    ctx = DOMAIN_RESOURCES.get(field, DOMAIN_RESOURCES["Other"])
    platforms = ", ".join(ctx["platforms"])
    tools = ", ".join(ctx["tools"])
    focus = ", ".join(ctx["focus_areas"])
    return f"Key Platforms: {platforms}\nRelevant Tools/Software: {tools}\nFocus Areas: {focus}"


def build_suggestions_prompt(profile: dict) -> str:
    """
    Build a fully personalized career suggestions prompt based on user profile.
    Routes to the appropriate domain-specific template.
    """
    status = profile.get("educational_status", "Student")
    field = profile.get("field", "Computer Science / IT")
    dream_job = profile.get("dream_job", "Not specified")
    custom_goal = profile.get("custom_goal", "")
    experience_level = profile.get("experience_level", "Beginner")
    confusion = profile.get("confusion", "Not specified")
    name = profile.get("name", "User")
    tech_stack = profile.get("tech_stack", [])
    known_tools = profile.get("known_tools", tech_stack)
    target_skills = profile.get("target_skills", [])

    goal_display = custom_goal if (dream_job == "Custom Goal" and custom_goal) else dream_job
    tools_str = ", ".join(known_tools) if known_tools else "None specified"
    target_str = ", ".join(target_skills) if target_skills else "Not specified"
    domain_ctx = _domain_context(field)

    # ── Student: Year info ────────────────────────────────────────────────
    year_info = ""
    if status == "Student":
        current_year = profile.get("current_year")
        total_years = profile.get("total_years")
        college = profile.get("college", "Not specified")
        course = profile.get("course", "Not specified")
        if current_year and total_years:
            years_left = total_years - current_year
            year_info = f"""
- College: {college}
- Course: {course}
- Academic Year: {current_year} of {total_years} ({years_left} year(s) remaining)"""

    # ── Working Professional: Experience info ─────────────────────────────
    work_info = ""
    if status == "Working Professional":
        company = profile.get("current_company", "Not specified")
        yoe = profile.get("years_of_experience", "Not specified")
        role = profile.get("current_role", "Not specified")
        work_info = f"""
- Current Company: {company}
- Current Role: {role}
- Years of Experience: {yoe}"""

    # ── Job Seeker: relevant context ──────────────────────────────────────
    job_seeker_info = ""
    if status == "Job Seeker":
        yoe = profile.get("years_of_experience", 0)
        role = profile.get("current_role", "Not specified")
        job_seeker_info = f"""
- Previous Role: {role}
- Years of Experience: {yoe}
- Actively looking for: {goal_display}"""

    # ── Domain-specific instruction blocks ───────────────────────────────
    domain_instructions = _get_domain_instructions(field, status, goal_display)

    prompt = f"""You are an expert career guidance AI specialized in the Indian education and job market.
Analyze the following user profile and generate exactly 3 to 4 highly personalized, actionable career roadmap suggestions.

USER PROFILE:
- Name: {name}
- Status: {status}
- Field / Department: {field}
- Career Goal: {goal_display}
- Experience Level: {experience_level}
- Known Tools / Skills: {tools_str}
- Target Skills: {target_str}
- Current Challenge / Confusion: {confusion}{year_info}{work_info}{job_seeker_info}

DOMAIN CONTEXT FOR {field.upper()}:
{domain_ctx}

DOMAIN-SPECIFIC INSTRUCTIONS:
{domain_instructions}

GENERAL INSTRUCTIONS:
1. Generate 3–4 DISTINCT career paths realistic for this user's status and timeline.
2. Each suggestion must be specific and practical — NOT generic advice.
3. Factor in Indian job market realities relevant to their field.
4. Address their stated confusion directly in "why_this_fits_user".
5. Make roadmap_steps concrete and sequenced (6–8 steps max).
6. Reference domain-appropriate platforms and tools (not just LeetCode for everyone).
7. Be honest about difficulty levels.
8. For Working Professionals: focus on upskilling, certifications, transitions.
9. For Job Seekers: focus on job-ready skills and portfolio/resume building.
10. For Students: factor in academic timeline and placement preparation.
11. If the user profile (including goals, tech stack, or confusion) contains unlawful, illegal, harmful details (e.g. hacking, illicit substances, weapons, malware), or details completely unrelated to education, academia, or careers (e.g., casual chatting, requests to play games, tell jokes, write fiction), you MUST decline. In this case, return exactly one suggestion with "title": "Invalid Request", "description": "It is not legally correct to do that.", "why_this_fits_user": "It is not legally correct to do that.", "required_skills": [], "roadmap_steps": [], "estimated_timeline": "N/A", and "difficulty": "Beginner".

CRITICAL: Respond ONLY with a valid JSON object. No markdown, no preamble.

Return this exact structure:
{{
  "suggestions": [
    {{
      "title": "short catchy path title",
      "description": "2–3 sentence overview",
      "why_this_fits_user": "specific explanation referencing their confusion and background",
      "required_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
      "roadmap_steps": ["Step 1: ...", "Step 2: ...", "Step 3: ...", "Step 4: ...", "Step 5: ...", "Step 6: ..."],
      "estimated_timeline": "e.g. 6–8 months",
      "difficulty": "Beginner or Intermediate or Advanced"
    }}
  ]
}}"""

    return prompt


def _get_domain_instructions(field: str, status: str, goal: str) -> str:
    """Return domain-specific guidance injected into the prompt."""

    instructions = {
        "Computer Science / IT": f"""
- Recommend DSA practice (LeetCode, Codeforces) for placements/interviews.
- Include system design for intermediate/advanced users.
- Suggest open-source contributions and GitHub projects.
- Cover frameworks relevant to goal: web (React, Node), ML (Python, TensorFlow), DevOps (Docker, K8s), etc.
- For goal '{goal}': tailor tech stack and interview prep accordingly.
- Include competitive programming if goal is product company / FAANG.
""",
        "Mechanical Engineering": f"""
- Recommend CAD software based on goal: SolidWorks for design, AutoCAD for drafting, CATIA for automotive/aerospace.
- Include FEA/FEM simulation tools (ANSYS, Abaqus) for analysis roles.
- Suggest NPTEL courses for theoretical foundations.
- For manufacturing goals: include GD&T, CNC, production planning.
- For goal '{goal}': match tools to industry (automotive, aerospace, manufacturing, HVAC, etc.).
- Recommend internship/project guidance with real-world CAD deliverables.
- Include GATE preparation if goal is higher studies or PSU.
""",
        "Civil Engineering": f"""
- Recommend AutoCAD Civil 3D for design and STAAD Pro / ETABS for structural analysis.
- Include Revit for BIM-focused career paths.
- For site engineer goals: focus on project management, IS codes, quantity surveying.
- Suggest GATE preparation material if goal is higher studies or government jobs.
- Include certification paths: PMP for project management, LEED for green building.
- For goal '{goal}': focus on relevant software and domain (structural, geotechnical, transportation, environmental).
""",
        "Electronics & Communication": f"""
- For embedded systems: recommend Arduino, STM32, Keil µVision, FreeRTOS.
- For PCB design: Altium Designer, KiCad, Eagle.
- For VLSI: Cadence, Synopsys tools, Verilog/VHDL basics.
- For IoT: ESP32, MQTT, cloud platforms (AWS IoT, Azure IoT).
- For signal processing: MATLAB/Simulink, DSP fundamentals.
- For goal '{goal}': recommend appropriate specialization path with project ideas.
- Include GATE preparation if applicable.
""",
        "Electrical & Electronics": f"""
- For power systems: recommend ETAP, PowerWorld, load flow studies.
- For control systems: MATLAB/Simulink, PLC/SCADA (Siemens, Allen Bradley).
- For renewable energy: solar/wind design tools, HOMER, PVSyst.
- For automation: industrial robotics, VFD programming.
- Include GATE preparation for PSU/higher studies goals.
- For goal '{goal}': align with relevant power, control, or automation specialization.
""",
        "Arts & Science": f"""
- Identify the specific specialization (Mathematics, Physics, Chemistry, English, etc.).
- For analytics roles: recommend Python/R, statistics, Excel, Tableau.
- For research: recommend domain-specific databases, LaTeX, research methodology.
- For education: recommend pedagogy, EdTech tools.
- For commerce/finance adjacent: Excel, accounting software, financial modeling.
- For goal '{goal}': recommend upskilling in data or domain-specific certifications.
""",
        "Commerce": f"""
- For CA/CMA aspirants: recommend ICAI study material, practice portals, mock tests.
- For finance roles: Excel, financial modeling, Bloomberg basics, CFA prep.
- For accounting: Tally, SAP FICO, QuickBooks.
- For business analytics: SQL, Excel, Power BI, Python basics.
- For MBA aspirants: CAT/GMAT prep, case study practice, industry reading.
- For goal '{goal}': tailor certification and skill path to the commerce specialization.
""",
        "Other": f"""
- Identify the core skill gap for goal '{goal}'.
- Recommend relevant online platforms (Coursera, edX, Udemy, YouTube).
- Include portfolio/project building appropriate to the field.
- Focus on certifications that add credibility in that domain.
""",
    }

    base = instructions.get(field, instructions["Other"])

    # Append status-specific overlay
    if status == "Working Professional":
        base += f"""
- PROFESSIONAL CONTEXT: Focus on upskilling without disrupting current job.
  Recommend evening/weekend-friendly learning paths.
  Emphasize certifications with industry recognition.
  Include leadership/management tracks if applicable.
"""
    elif status == "Job Seeker":
        base += f"""
- JOB SEEKER CONTEXT: Prioritize job-ready skills and quick wins.
  Recommend portfolio/resume projects that can be completed in 4–8 weeks.
  Include mock interview preparation and profile optimization (LinkedIn, GitHub/portfolio).
  Suggest specific job roles and companies actively hiring in this domain.
"""

    return base.strip()


def build_roadmap_outline_prompt(
    goal_title: str,
    goal_desc: str,
    required_skills: list,
    duration_weeks: int,
    exp_level: str,
    pace: str,
    user_field: str = "",
    user_status: str = "",
) -> str:
    """Build a domain-aware curriculum outline prompt."""
    num_days = max(5, duration_weeks * 5)
    skills_str = ", ".join(required_skills) if required_skills else "Not specified"
    domain_ctx = _domain_context(user_field) if user_field else ""
    domain_instructions = _get_domain_day_instructions(user_field, goal_title) if user_field else ""

    return f"""You are an expert curriculum designer. Generate a structured, progressive day-by-day learning outline of exactly {num_days} study days for the career goal: "{goal_title}".

Description: {goal_desc}
Required Skills: {skills_str}
Duration: {duration_weeks} weeks ({num_days} total study days)
Student Experience Level: {exp_level}
Learning Pace: {pace}
User Field/Domain: {user_field or "General"}
User Status: {user_status or "Student"}

{f"DOMAIN CONTEXT:{chr(10)}{domain_ctx}" if domain_ctx else ""}

{f"DOMAIN-SPECIFIC CURRICULUM NOTES:{chr(10)}{domain_instructions}" if domain_instructions else ""}

CURRICULUM DESIGN PRINCIPLES:
1. LEARNING HIERARCHY: Course → Module → Topic → Concept → Practice/Project
2. DIFFICULTY PROGRESSION:
   - Days 1–{int(num_days * 0.30)}: BEGINNER — Fundamentals, setup, core concepts
   - Days {int(num_days * 0.31)}–{int(num_days * 0.65)}: INTERMEDIATE — Core depth, patterns, tools
   - Days {int(num_days * 0.66)}–{int(num_days * 0.85)}: ADVANCED — Complex topics, real-world patterns
   - Days {int(num_days * 0.86)}–{num_days}: PROJECTS/CAPSTONE — End-to-end projects, portfolio, interview prep
3. PREREQUISITE ORDER: Always introduce prerequisites before advanced topics.
4. PRACTICAL INTEGRATION: Every 4–5 theory days must be followed by a hands-on practice day.
5. DOMAIN ACCURACY: Use tools, software, and terminology appropriate to the field.
6. TARGETED PRACTICE PROBLEMS: For every single day, you must suggest exactly 2 specific practice problems or challenges tailored to that day's topic. Do NOT repeat any problem across different days. The problems must be real and specific (e.g., LeetCode/HackerRank/GFG problem names like 'Two Sum', 'Reverse Linked List', or domain-specific project challenges for other fields).
7. UNLAWFUL / NON-EDUCATIONAL INPUTS: If the career goal or user profile contains unlawful, illegal, or harmful details (e.g. hacking, weapons, illicit substances), or details completely unrelated to education or careers, you MUST decline. In this case, return a single-item JSON array with "day": 1, "title": "Invalid Request", "focus": "It is not legally correct to do that.", "module": "Error", "difficulty": "Beginner", "suggested_problems": [].

CRITICAL: Respond ONLY with a valid JSON object. No markdown, no preamble.
{{
  "outline": [
    {{
      "day": 1,
      "title": "Specific concept/tool name",
      "focus": "1–2 sentence description of what to study",
      "module": "Module N: Module Name",
      "difficulty": "Beginner",
      "suggested_problems": [
        {{"problem": "Specific Problem/Task Title", "platform": "LeetCode|HackerRank|GeeksforGeeks|Tinkercad|GrabCAD|Other"}}
      ]
    }}
  ]
}}"""


def _get_domain_day_instructions(field: str, goal: str) -> str:
    """Domain-specific notes for curriculum outline generation."""
    instructions = {
        "Computer Science / IT": "Include DSA days, system design days, framework days, and project days. End with mock interview prep.",
        "Mechanical Engineering": "Include CAD software tutorials, simulation practice, manufacturing concepts, and a capstone design project.",
        "Civil Engineering": "Include drafting software, structural analysis tools, codes/standards study, and a design project as capstone.",
        "Electronics & Communication": "Include hardware setup days, simulation days, firmware/code days, and a hands-on project (e.g. build an IoT device).",
        "Electrical & Electronics": "Include simulation software days, theory days (power/control), lab-style practice days, and a system design project.",
        "Arts & Science": "Identify specialization from goal and include conceptual depth, analytical tools, and a research/presentation project.",
        "Commerce": "Include accounting software practice, analytical tools (Excel, Power BI), case study days, and a financial model project.",
        "Other": "Focus on core skill building, tool mastery, and a portfolio project aligned to the goal.",
    }
    return instructions.get(field, instructions["Other"])


def build_day_details_prompt(
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
) -> str:
    """Build a domain-aware day detail prompt."""
    domain_ctx = _domain_context(user_field) if user_field else ""
    resource_note = _get_domain_resource_note(user_field)

    # Build pre-assigned problems block
    if suggested_problems:
        problems_list = "\n".join(f"   - {p.get('problem')} on platform {p.get('platform')}" for p in suggested_problems if isinstance(p, dict))
        assigned_block = (
            "\nPRE-ASSIGNED PRACTICE PROBLEMS:\n"
            "You MUST use exactly these pre-assigned practice problems for this day. Do NOT pick or invent any other problems:\n"
            f"{problems_list}\n"
        )
    else:
        assigned_block = ""

    return f"""You are an expert technical tutor. Create a comprehensive single-day study guide for Day {day_number} of the goal: "{goal_title}".

Day Title: {day_title}
Day Focus: {day_focus}
Student Experience Level: {exp_level}
Learning Pace: {pace}
Daily Study Time: {study_time}
User Field/Domain: {user_field or "General"}
User Status: {user_status or "Student"}

{f"DOMAIN CONTEXT:{chr(10)}{domain_ctx}" if domain_ctx else ""}

RESOURCE GUIDANCE FOR THIS DOMAIN:
{resource_note}

{assigned_block}

Provide:
1. SUBTOPICS (4–6 specific items for the day's concept)
2. ESTIMATED DURATION (aligned with {study_time})
3. LEARNING RESOURCES (4 resources — strictly follow URL rules below):
   - 1 Official Documentation: use only the root or well-known section URL of the official docs site
     (e.g., https://react.dev/reference/react, https://docs.python.org/3/library/, https://developer.mozilla.org/en-US/docs/Web/JavaScript)
     DO NOT guess or construct deep sub-paths that might not exist.
   - 1 High-quality tutorial: a well-known tutorial site root or section (e.g., https://www.w3schools.com/python/, https://javascript.info/)
   - 1 YouTube tutorial: ALWAYS use YouTube search URL format with specific, topic-accurate keywords:
     https://www.youtube.com/results?search_query=<URL-encoded keywords for today's exact topic>
     Example: https://www.youtube.com/results?search_query=react+useEffect+hook+tutorial+beginners
   - 1 Practice/interactive resource: use the platform's search or category URL (not a specific problem deep-link)
4. PRACTICE PROBLEMS (strictly format the pre-assigned problems listed above):
   - You MUST include the pre-assigned problems listed in the PRE-ASSIGNED PRACTICE PROBLEMS section above.
   - For each pre-assigned problem, construct a SEARCH URL on the platform for that exact problem title:
     * LeetCode: https://leetcode.com/problemset/?search=<problem+name+url+encoded>
     * HackerRank: https://www.hackerrank.com/domains/algorithms?filters%5Bsubdomains%5D[]=warmup (use domain/category URL)
     * GeeksforGeeks: https://www.geeksforgeeks.org/explore?page=1&search=<problem+name+url+encoded>
     * Codeforces: https://codeforces.com/problemset?search=<problem+name+url+encoded>
     * For other platforms/fields: GrabCAD challenges, textbook chapters, Tinkercad, or case study URLs.
   - Do NOT choose or invent any other problems. Keep platform names and problem titles exactly as pre-assigned.
5. MCQ ASSESSMENT — exactly 10 questions with difficulty distribution:
   - Questions 1–3: EASY (direct recall)
   - Questions 4–6: MEDIUM (application)
   - Questions 7–9: HARD (edge cases, analysis)
   - Question 10: HARD (scenario-based, multi-concept)
6. CODING/PRACTICAL ASSIGNMENT (domain-appropriate hands-on task)
7. REVISION TASKS (2–3 quick reinforcement actions)

CRITICAL: Respond ONLY with valid JSON. No markdown, no preamble.
{{
  "day": {day_number},
  "title": "{day_title}",
  "duration": "e.g. 3 hours",
  "topics": ["topic1", "topic2", "topic3", "topic4"],
  "resources": [
    {{"type": "documentation", "title": "...", "link": "https://..."}},
    {{"type": "tutorial", "title": "...", "link": "https://..."}},
    {{"type": "youtube", "title": "...", "link": "https://www.youtube.com/results?search_query=..."}},
    {{"type": "practice", "title": "...", "link": "https://..."}}
  ],
  "practice": [
    {{"platform": "...", "problem": "...", "difficulty": "Easy", "link": "https://leetcode.com/problemset/?search=problem+name"}}
  ],
  "mcqTest": [
    {{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A", "difficulty": "Easy"}}
  ],
  "codingAssignment": "Detailed hands-on task description",
  "revisionTasks": ["Task 1", "Task 2", "Task 3"]
}}"""


def _get_domain_resource_note(field: str) -> str:
    notes = {
        "Computer Science / IT": "Use official docs (react.dev, docs.python.org, developer.mozilla.org). For YouTube: always use search query URLs. For practice: LeetCode search URLs (https://leetcode.com/problemset/?search=...) and GFG explore (https://www.geeksforgeeks.org/explore?search=...).",
        "Mechanical Engineering": "Use official SolidWorks/AutoCAD docs root URLs, NPTEL lecture pages (https://nptel.ac.in/), GrabCAD challenges (https://grabcad.com/challenges). YouTube: search URLs with specific CAD/simulation terms.",
        "Civil Engineering": "Use NPTEL course pages, official STAAD/ETABS documentation root URLs, IS code references from BIS. YouTube: search URLs with specific structural analysis terms.",
        "Electronics & Communication": "Use Arduino official docs (https://docs.arduino.cc/), STM32 docs, NPTEL embedded pages. YouTube: search URLs. For simulation: Tinkercad (https://www.tinkercad.com/) or Falstad (https://www.falstad.com/circuit/).",
        "Electrical & Electronics": "Use MATLAB/Simulink docs (https://www.mathworks.com/help/), NPTEL power systems pages, IEEE resources. YouTube: search URLs with specific power/control terms.",
        "Arts & Science": "Use Khan Academy (https://www.khanacademy.org/), Coursera subject pages (https://www.coursera.org/). YouTube: search URLs with specific subject and lecture keywords.",
        "Commerce": "Use ICAI official site (https://www.icai.org/), Investopedia (https://www.investopedia.com/), Coursera business pages. YouTube: search URLs with CA/finance-specific terms.",
        "Other": "Use official documentation root URLs, Coursera/edX category pages, YouTube search URLs with domain-specific keywords.",
    }
    return notes.get(field, notes["Other"])


def build_chat_system_prompt(profile: dict, roadmap_title: str, day_number: int, day_details: dict) -> str:
    """Build a domain-aware system prompt for the AI chat mentor."""
    status = profile.get("educational_status", "Student")
    field = profile.get("field", "Computer Science / IT")
    name = profile.get("name", "User")
    goal = profile.get("dream_job", "")
    tech_stack = profile.get("tech_stack", [])
    tools_str = ", ".join(tech_stack) if tech_stack else "Not specified"

    day_info = (
        f"Day {day_number}: {day_details.get('title', '')} (Topics: {', '.join(day_details.get('topics', [])[:3])})"
        if day_details else "No specific day selected"
    )

    domain_mentor_note = {
        "Computer Science / IT": "You are also a skilled software engineer. Provide code examples in relevant languages. Help with DSA, system design, and debugging.",
        "Mechanical Engineering": "You understand CAD/CAM, FEA, and manufacturing. Guide users on SolidWorks, AutoCAD, ANSYS, and mechanical design principles.",
        "Civil Engineering": "You understand structural analysis, AutoCAD Civil, STAAD Pro, and IS codes. Help with design problems and software usage.",
        "Electronics & Communication": "You understand embedded systems, PCB design, VLSI, and IoT. Help with circuit design, firmware, and simulation tools.",
        "Electrical & Electronics": "You understand power systems, control systems, and PLC/SCADA. Help with MATLAB, ETAP, and electrical design.",
        "Arts & Science": "You are a subject matter expert across sciences and arts. Help with conceptual understanding, analytical methods, and research.",
        "Commerce": "You understand accounting, finance, and business analytics. Help with Tally, Excel modeling, CA preparation, and financial concepts.",
    }.get(field, "You are a knowledgeable tutor across multiple domains.")

    return f"""You are VazhiAI Advisor, a personalized AI career mentor and tutor.

STUDENT CONTEXT:
- Name: {name}
- Status: {status}
- Field: {field}
- Career Goal: {goal}
- Known Skills/Tools: {tools_str}
- Active Roadmap: {roadmap_title}
- Current Study Day: {day_info}

DOMAIN EXPERTISE:
{domain_mentor_note}

GUIDELINES:
1. Provide specific, practical advice tailored to their field and goal.
2. Use domain-appropriate terminology and examples.
3. For technical questions, provide clear step-by-step guidance.
4. Keep answers focused (2–4 paragraphs). Use markdown for code/lists.
5. Encourage consistently; address confusion with clarity.
6. Never give generic advice — always connect to their field and goal.
7. Do NOT output JSON. Output clean markdown text.
8. If the user asks for roadmaps, guides, or assistance regarding unlawful, harmful, inappropriate, or completely non-educational/non-career-related topics (e.g., hacking, drug formulation, illegal acts, casual chit-chat/jokes), refuse immediately and respond exactly with: "It is not legally correct to do that." Do not provide any other explanation, preamble, or advice for such requests."""


def build_resume_optimization_prompt(resume_data: dict, target_role: str) -> str:
    """Build a prompt to optimize resume data for ATS keywords and formatting."""
    return f"""You are an ATS (Applicant Tracking System) expert and professional resume writer.
Optimize the following resume data to make it highly professional, keyword-rich, and tailored for the target role: "{target_role}".

RAW RESUME DATA:
{json.dumps(resume_data, indent=2)}

INSTRUCTIONS:
1. Professional Summary: Write a strong, 2-3 sentence professional summary highlighting their top skills and suitability for the "{target_role}" role.
2. Experience Description: For each work experience, rewrite the description into a series of professional bullet points (separated by newlines). Use action verbs, quantify achievements where possible, and weave in ATS keywords relevant to "{target_role}".
3. Project Description: For each project, rewrite the description into clear, impact-driven bullet points (separated by newlines). Focus on the technical challenges solved, tools used, and results achieved.
4. Skills: Organize and clean the skills list. Filter out irrelevant or generic items, and group/list them as professional industry skills.
5. Education: Ensure the education details are formatted cleanly.
6. Tone: Keep the tone active, professional, and clear. Avoid fluff.

CRITICAL: Respond ONLY with a valid JSON object matching the input structure. Do not output markdown, preambles, or explanations.

Expected JSON Structure:
{{
  "summary": "...",
  "education": [
    {{
      "institution": "...",
      "degree": "...",
      "field_of_study": "...",
      "start_year": "...",
      "end_year": "...",
      "grade": "..."
    }}
  ],
  "experience": [
    {{
      "company": "...",
      "role": "...",
      "location": "...",
      "start_date": "...",
      "end_date": "...",
      "description": "bullet point 1\\nbullet point 2..."
    }}
  ],
  "projects": [
    {{
      "title": "...",
      "description": "bullet point 1\\nbullet point 2...",
      "technologies": ["...", "..."],
      "link": "..."
    }}
  ],
  "skills": ["...", "..."]
}}"""


def build_explore_paths_prompt(
    user_profile: dict,
    current_roadmap: dict | None,
    conversation_history: list,
    confirm_new_roadmap: bool = False,
) -> str:
    """Build a prompt for the Explore Paths chatbot that helps users modify or regenerate their roadmap."""
    name = user_profile.get("name", "User")
    field = user_profile.get("field", "General")
    status = user_profile.get("educational_status", "Student")
    dream_job = user_profile.get("dream_job", "Not specified")
    tech_stack = user_profile.get("tech_stack", [])
    tools_str = ", ".join(tech_stack) if tech_stack else "None specified"

    roadmap_context = "No active roadmap found."
    if current_roadmap:
        outline_summary = ""
        outline = current_roadmap.get("outline", [])
        if outline and isinstance(outline, list):
            modules = set()
            for day in outline:
                mod = day.get("module", "")
                if mod:
                    modules.add(mod)
            outline_summary = f"\nModules covered: {', '.join(sorted(modules))}" if modules else ""
            outline_summary += f"\nTotal study days: {len(outline)}"

        roadmap_context = f"""Active Roadmap:
- Title: {current_roadmap.get('title', 'Untitled')}
- Description: {current_roadmap.get('description', 'N/A')}
- Duration: {current_roadmap.get('duration_weeks', 'N/A')} weeks
- Experience Level: {current_roadmap.get('experience_level', 'N/A')}
- Learning Pace: {current_roadmap.get('learning_pace', 'N/A')}
- Available Study Time: {current_roadmap.get('available_time', 'N/A')}
- Difficulty: {current_roadmap.get('difficulty', 'N/A')}{outline_summary}"""

        # Include the complete outline for context so the LLM doesn't truncate any days
        if outline and isinstance(outline, list):
            roadmap_context += "\n\nComplete Roadmap Outline:\n"
            for d in outline:
                roadmap_context += f"  Day {d.get('day', '?')}: {d.get('title', '')} [{d.get('module', '')}] - {d.get('focus', '')} ({d.get('difficulty', 'Intermediate')})\n"

    confirmation_note = ""
    if confirm_new_roadmap:
        confirmation_note = """\nIMPORTANT: The user has CONFIRMED they want a completely new roadmap.
You must now:
1. Set intent to "new_roadmap_confirmed"
2. In your reply, acknowledge the old roadmap will be replaced
3. Ask the user about their updated goals, interests, preferred timeline, and experience level so you can generate the new roadmap
4. Set needs_info to true since you need their requirements"""

    return f"""You are VazhiAI's Roadmap Advisor, an AI assistant that helps users modify or regenerate their career/learning roadmap.

USER PROFILE:
- Name: {name}
- Status: {status}
- Field: {field}
- Career Goal: {dream_job}
- Known Skills: {tools_str}

CURRENT ROADMAP:
{roadmap_context}
{confirmation_note}

Your job is to:
1. Understand the user's request about their roadmap
2. Classify the intent into one of these categories:
   - "minor_modification": Small tweaks — adjust timelines, swap a few topics, change difficulty of specific days
   - "major_restructuring": Significant changes — reorder sections, add/remove major milestones, change focus areas
   - "new_roadmap": User wants a completely different career path/roadmap
   - "new_roadmap_confirmed": User has confirmed they want to replace their current roadmap (only use after confirmation)
   - "clarification": You need more information from the user before making changes
   - "general_chat": User is asking questions, not requesting roadmap changes
3. For minor/major modifications: Generate the COMPLETE updated outline as a JSON array preserving unchanged portions
4. For new_roadmap (unconfirmed): Warn the user and ask for confirmation
5. For new_roadmap_confirmed: Collect requirements for the new roadmap

RULES:
- Preserve unchanged portions of the roadmap for modifications.
- CRITICAL: In VazhiAI, 1 week of study corresponds to exactly 5 study days (e.g., a 12-week roadmap is 60 study days). If the user asks to extend the roadmap by N weeks, you must add exactly N * 5 study days. For example, extending by 2 weeks means adding exactly 10 new study days at the end of the roadmap (continuing the day numbering).
- CRITICAL: For any modifications or extensions, the returned `updated_outline` MUST be the full, complete array containing ALL days of the roadmap (original days + modified/added days). Do not omit or truncate any days under any circumstances.
- Ask follow-up questions when information is missing
- If the user asks about unlawful, illegal, or non-educational topics, refuse with: "It is not legally correct to do that."
- For modifications, the updated_outline must be a valid JSON array with the SAME schema as the current outline: [{{'day': N, 'title': '...', 'focus': '...', 'module': 'Module N: Name', 'difficulty': 'Beginner|Intermediate|Advanced'}}]

CRITICAL: Respond ONLY with valid JSON matching this structure:
{{
  "intent": "minor_modification|major_restructuring|new_roadmap|new_roadmap_confirmed|clarification|general_chat",
  "reply": "Your conversational response explaining what you did or asking for more info",
  "updated_outline": null,
  "needs_confirmation": false,
  "needs_info": false,
  "new_roadmap_requirements": null
}}

For minor_modification or major_restructuring with enough info:
- Set updated_outline to the COMPLETE updated outline JSON array
- Explain changes in reply

For new_roadmap (unconfirmed):
- Set needs_confirmation to true
- Set reply to a warning message asking user to confirm
- Set updated_outline to null

For new_roadmap_confirmed:
- Set needs_info to true if you need their goals/preferences
- Or set new_roadmap_requirements to a summary object if you have enough info:
  {{"title": "...", "description": "...", "duration_weeks": N, "experience_level": "...", "dream_job": "..."}}
"""


# ── Study Material Prompt ──────────────────────────────────────────────────────

def build_study_material_prompt(
    topics: list,
    difficulty: str,
    education_level: str | None,
    language: str,
    output_length: str,
) -> str:
    """
    Build a comprehensive study material generation prompt.
    The LLM returns pure Markdown with 13 structured sections.
    """

    topics_str = ", ".join(topics)
    topics_bullet = "\n".join(f"  - {t}" for t in topics)

    # ── Length guidance ───────────────────────────────────────────────────────
    length_guidance = {
        "Short": (
            "Keep each section concise — 2 to 4 bullet points or a short paragraph. "
            "Total output should be around 600–900 words. Skip sub-headings within sections."
        ),
        "Medium": (
            "Provide moderate depth — 4 to 8 bullet points or 2–3 paragraphs per section. "
            "Total output should be around 1200–1800 words. Include key sub-points."
        ),
        "Detailed": (
            "Be thorough and in-depth — use sub-headings, detailed bullet points, tables, "
            "and code examples where applicable. Total output should be 2500–4000 words. "
            "Cover edge cases, nuances, and advanced considerations."
        ),
    }
    length_instruction = length_guidance.get(output_length, length_guidance["Detailed"])

    # ── Difficulty guidance ───────────────────────────────────────────────────
    difficulty_guidance = {
        "Beginner": (
            "Assume the reader has zero prior knowledge. Use simple language, avoid jargon, "
            "and always explain acronyms. Start from absolute basics."
        ),
        "Intermediate": (
            "Assume the reader knows the basics. Skip trivial definitions. Focus on "
            "connecting concepts, patterns, and practical use-cases."
        ),
        "Advanced": (
            "Assume the reader is experienced. Dive into internals, optimizations, "
            "edge cases, design trade-offs, and production-grade considerations."
        ),
        "Comprehensive": (
            "Cover the topic from beginner fundamentals all the way to advanced concepts. "
            "Progress naturally from simple to complex. Suitable for all skill levels."
        ),
    }
    diff_instruction = difficulty_guidance.get(difficulty, difficulty_guidance["Comprehensive"])

    # ── Education level context ───────────────────────────────────────────────
    edu_context = ""
    if education_level:
        edu_context = f"\nThe learner's education level is: **{education_level}**. Tailor examples and vocabulary accordingly."

    # ── Language instruction ──────────────────────────────────────────────────
    lang_instruction = ""
    if language and language.lower() != "english":
        lang_instruction = f"\n⚠️ Write the ENTIRE response in **{language}**. Section headings must also be in {language}."

    return f"""You are an expert educator and technical writer. Generate comprehensive, well-structured study material for the following topic(s):

{topics_bullet}{edu_context}

## Difficulty Level
{difficulty} — {diff_instruction}

## Output Length
{length_instruction}

## Language
Write the response in {language}.{lang_instruction}

---

## FORMAT INSTRUCTIONS

Return ONLY pure Markdown. No preamble, no "Here is your study material", no JSON wrapper.

Structure the material using EXACTLY these 13 sections in order. Use `##` for section headings:

1. `## Introduction`
   - What the topic is, why it matters, and what the learner will gain

2. `## Fundamental Concepts`
   - Core vocabulary, key terms, prerequisite ideas explained clearly

3. `## Core Theory`
   - Theoretical foundation — principles, laws, formulas, or models that underpin the topic

4. `## Detailed Explanations`
   - Deep-dive into each major concept. Use sub-headings (###) for sub-topics
   - Include analogies and intuition-building explanations

5. `## Practical Examples`
   - Worked examples showing concepts in action
   - For programming/CS topics: include code snippets in fenced code blocks with language tag (e.g. ```python)
   - For non-programming topics: use numerical examples, case studies, or diagrams described in text

6. `## Diagrams & Flowchart Suggestions`
   - Describe (in text) 1–3 diagrams or flowcharts that would illustrate key concepts
   - Format: "**Diagram: [Name]** — [Description of what it shows and how to draw it]"

7. `## Real-World Applications`
   - Where and how this topic is used in industry, research, or everyday life
   - Mention specific companies, tools, or domains where relevant

8. `## Common Mistakes & Misconceptions`
   - List the top 5–8 mistakes learners make
   - Explain WHY each is wrong and what the correct understanding is

9. `## Best Practices`
   - Professional tips, conventions, and standards
   - Use a checklist format (- [ ] item) for actionable items

10. `## Interview & Exam Questions`
    - 8–12 questions covering different difficulty levels
    - Include both conceptual and practical questions
    - Format: **Q: question** followed by **A: answer** (brief but complete)

11. `## Summary`
    - 1 paragraph summarising the entire topic

12. `## Key Takeaways`
    - 5–10 bullet points — the most important things to remember

13. `## References & Further Learning`
    - List 5–8 high-quality resources (books, official docs, courses, websites)
    - Format: `- [Resource Name](URL or description) — one line description`
    - Use real, well-known resources (e.g. MDN, official Python docs, NPTEL, Coursera, O'Reilly books)

---

Now generate the complete study material for: **{topics_str}**
"""
