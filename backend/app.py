import json
import os
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request

import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import date
from scholarship_catalog import SCHOLARSHIPS as FALLBACK_SCHOLARSHIPS

# Initialize FastAPI
app = FastAPI()


def load_local_env():
    env_path = Path(__file__).with_name(".env")
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_local_env()

# Enable CORS so React (localhost:3000) can call FastAPI (localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = None


def initialize_firestore():
    global db

    service_account_path = Path(__file__).with_name("serviceAccountKey.json")
    if not service_account_path.exists():
        print("ScholarSync backend starting without Firebase Admin credentials. Using demo data mode.")
        return

    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(str(service_account_path))
            firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception as exc:
        print(f"Failed to initialize Firebase Admin. Using demo data mode. Error: {exc}")
        db = None


initialize_firestore()


def to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def to_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def normalize_text(value):
    return str(value or "").strip().lower()


def parse_deadline(deadline_value):
    if not deadline_value:
        return None

    try:
        return date.fromisoformat(str(deadline_value).strip())
    except ValueError:
        return None


def is_active_scholarship(scholarship):
    deadline_value = scholarship.get("deadline")
    parsed_deadline = parse_deadline(deadline_value)

    if parsed_deadline is None:
        return True

    return parsed_deadline >= date.today()


def serialize_scholarship(scholarship):
    source = scholarship.get("source")
    if not source:
        source = "provider" if scholarship.get("createdBy") else "official"

    return {
        "name": scholarship.get("name"),
        "provider": scholarship.get("provider", "Government of India"),
        "scheme": scholarship.get("scheme", "National Scholarship Portal"),
        "eligibility": scholarship.get("eligibility"),
        "deadline": scholarship.get("deadline"),
        "tags": scholarship.get("tags"),
        "amount": scholarship.get("amount", "Not specified"),
        "country": scholarship.get("country", "India"),
        "level": scholarship.get("level", "Student"),
        "applyLink": scholarship.get("applyLink", "https://scholarships.gov.in/"),
        "source": source,
        "targetLevel": scholarship.get("targetLevel"),
        "eligibleEducationLevels": scholarship.get("eligibleEducationLevels", []),
        "eligibleCastes": scholarship.get("eligibleCastes", []),
        "eligibleGenders": scholarship.get("eligibleGenders", []),
        "eligibleReligions": scholarship.get("eligibleReligions", []),
        "maxFamilyIncome": scholarship.get("maxFamilyIncome"),
        "minimumPercentage": scholarship.get("minimumPercentage"),
    }


def summarize_student_context(profile, answers):
    merged_answers = {
        "gender": answers.get("gender") or profile.get("gender"),
        "caste": answers.get("caste") or profile.get("caste"),
        "religion": answers.get("religion") or profile.get("religion"),
        "educationLevel": answers.get("educationLevel") or profile.get("educationLevel"),
        "familyIncome": answers.get("familyIncome"),
        "percentage": answers.get("percentage"),
    }

    if not merged_answers["familyIncome"]:
        merged_answers["familyIncome"] = to_int(profile.get("fatherIncome")) + to_int(profile.get("motherIncome"))

    if not merged_answers["percentage"]:
        merged_answers["percentage"] = max(
            to_float(profile.get("tenthPercentage")),
            to_float(profile.get("twelfthPercentage")),
            to_float(profile.get("collegeCgpa")) * 10,
        )

    return merged_answers


def build_gemini_prompt(payload):
    user_message = str(payload.get("message") or "").strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")

    profile = payload.get("profile") or {}
    answers = payload.get("answers") or {}
    recommendations = payload.get("recommendations") or []
    available_scholarships = payload.get("availableScholarships") or []
    selected_scholarship = payload.get("selectedScholarship") or None
    recent_messages = payload.get("recentMessages") or []
    needs_question_flow = bool(payload.get("needsQuestionFlow"))
    current_question = payload.get("currentQuestion") or None

    student_context = summarize_student_context(profile, answers)

    system_rules = [
        "You are ScholarSync AI Assistant, a helpful scholarship chatbot for Indian government scholarships.",
        "Use only the student details, answers, scholarships, and selected scholarship provided below.",
        "Do not invent scholarships, eligibility, deadlines, amounts, or application rules that are not in the provided data.",
        "If profile details are incomplete and the app is still collecting information, do not recommend scholarships yet.",
        "If more details are needed, ask only one concise scholarship-related question.",
        "If recommendations already exist, help the user compare, understand fit, or choose a scholarship in a smooth conversational flow.",
        "If a scholarship is selected and the user asks about applying, explain clear step-by-step actions after entering the official portal.",
        "Keep the tone friendly and concise. Prefer short paragraphs or short flat lists.",
    ]

    prompt_sections = [
        "\n".join(system_rules),
        f"Student context: {json.dumps(student_context, ensure_ascii=True)}",
        f"Needs question flow: {json.dumps(needs_question_flow)}",
        f"Current pending question: {json.dumps(current_question, ensure_ascii=True)}",
        f"Selected scholarship: {json.dumps(selected_scholarship, ensure_ascii=True)}",
        f"Top recommendations: {json.dumps(recommendations[:5], ensure_ascii=True)}",
        f"Available scholarships: {json.dumps(available_scholarships[:12], ensure_ascii=True)}",
        f"Recent chat messages: {json.dumps(recent_messages[-8:], ensure_ascii=True)}",
        f"Latest user message: {user_message}",
    ]

    return "\n\n".join(prompt_sections)


def call_gemini(prompt):
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-1.5-flash:generateContent"
    )
    request_body = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt,
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "topP": 0.9,
            "maxOutputTokens": 500,
        },
    }

    req = urllib_request.Request(
        url=f"{endpoint}?key={api_key}",
        data=json.dumps(request_body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib_request.urlopen(req, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        print(f"Gemini request failed. Falling back to demo assistant mode. Error: {detail}")
        return None
    except urllib_error.URLError as exc:
        print("Gemini service is unreachable. Falling back to demo assistant mode.")
        return None

    candidates = payload.get("candidates") or []
    if not candidates:
        return None

    parts = (((candidates[0] or {}).get("content") or {}).get("parts") or [])
    text_response = "\n".join(part.get("text", "") for part in parts if part.get("text")).strip()
    if not text_response:
        return None

    return text_response


def find_matching_scholarship(message, scholarship_list):
    normalized_message = normalize_text(message)
    for scholarship in scholarship_list:
        if normalize_text(scholarship.get("name")) in normalized_message:
            return scholarship
    return None


def build_demo_documents(scholarship, student_context):
    documents = [
        "Aadhaar card",
        "Passport-size photograph",
        "Bank account details or passbook copy",
        "Bonafide certificate or admission proof",
    ]

    if to_float(student_context.get("percentage")) > 0:
        documents.append("Latest marksheets and academic certificates")

    if scholarship.get("eligibleCastes"):
        documents.append("Community or caste certificate")

    if scholarship.get("eligibleReligions"):
        documents.append("Minority community certificate if required by the scheme")

    if scholarship.get("maxFamilyIncome") is not None:
        documents.append("Income certificate")

    if normalize_text(student_context.get("educationLevel")) == "under_grad":
        documents.append("College ID card, fee receipt, or college admission letter")

    unique_documents = []
    for item in documents:
        if item not in unique_documents:
            unique_documents.append(item)
    return unique_documents


def build_demo_application_guidance(scholarship, student_context):
    portal_name = "AICTE portal" if "aicte" in str(scholarship.get("applyLink", "")).lower() else "National Scholarship Portal"
    steps = [
        f"Application help for {scholarship.get('name')}:",
        "",
        "Before you open the portal:",
        "1. Read the scheme details carefully and confirm your eligibility again.",
        "2. Keep your documents ready before starting the application.",
        "3. Register or log in on the official portal linked below.",
        "",
        "After entering the website, follow these steps:",
        f"1. Search for \"{scholarship.get('name')}\" inside the {portal_name} dashboard.",
        "2. Open the scholarship card and recheck the official eligibility, amount, and document list.",
        "3. Choose the correct application type such as fresh application or renewal.",
        "4. Fill in your personal details exactly as in your Aadhaar card, marksheets, and bank records.",
        "5. Enter your academic details carefully, including institution name, course, year, and marks or CGPA.",
    ]

    if scholarship.get("maxFamilyIncome") is not None:
        steps.append("6. Enter the family income details exactly as shown in your income certificate.")
    if scholarship.get("eligibleCastes"):
        steps.append("7. Select the correct community category and upload the caste certificate in the required format.")
    if scholarship.get("eligibleReligions"):
        steps.append("8. Fill in the minority community details carefully and upload the supporting certificate if required.")

    next_index = len([step for step in steps if step[:2].rstrip(".").isdigit()]) + 1
    steps.extend([
        f"{next_index}. Upload all documents clearly, preview the form, and submit only after checking every field.",
        f"{next_index + 1}. Track institute verification, district or state verification, and final approval status from the portal.",
        "",
        "Documents you should prepare:",
        *[f"- {item}" for item in build_demo_documents(scholarship, student_context)],
        "",
        f"Official portal: {scholarship.get('applyLink') or 'https://scholarships.gov.in/'}",
    ])

    return "\n".join(steps)


def build_demo_reply(payload):
    message = str(payload.get("message") or "").strip()
    lowered = normalize_text(message)
    recommendations = payload.get("recommendations") or []
    available_scholarships = payload.get("availableScholarships") or []
    selected_scholarship = payload.get("selectedScholarship") or None
    current_question = payload.get("currentQuestion") or None
    needs_question_flow = bool(payload.get("needsQuestionFlow"))
    student_context = summarize_student_context(payload.get("profile") or {}, payload.get("answers") or {})
    scholarship_from_message = find_matching_scholarship(message, recommendations) or find_matching_scholarship(message, available_scholarships)

    if needs_question_flow and current_question:
        return f"Demo mode is active. Please answer this question first so I can continue: {current_question.get('prompt')}"

    if selected_scholarship and any(keyword in lowered for keyword in ["apply", "application", "help", "steps"]):
        return build_demo_application_guidance(selected_scholarship, student_context)

    if selected_scholarship and "document" in lowered:
        documents = build_demo_documents(selected_scholarship, student_context)
        return "\n".join([
            f"Documents for {selected_scholarship.get('name')}:",
            "",
            *[f"- {item}" for item in documents],
        ])

    if scholarship_from_message and any(keyword in lowered for keyword in ["detail", "about", "tell me", "what is", "eligibility"]):
        return "\n".join([
            scholarship_from_message.get("name", "Scholarship"),
            f"Provider: {scholarship_from_message.get('provider') or 'Government of India'}",
            f"Scheme: {scholarship_from_message.get('scheme') or 'National Scholarship Portal'}",
            f"Amount: {scholarship_from_message.get('amount') or 'Not specified'}",
            f"Deadline: {scholarship_from_message.get('deadline') or 'Not specified'}",
            f"Eligibility: {scholarship_from_message.get('eligibility') or 'Refer to the official notification'}",
            f"Official portal: {scholarship_from_message.get('applyLink') or 'https://scholarships.gov.in/'}",
        ])

    if len(recommendations) > 1 and any(keyword in lowered for keyword in ["compare", "difference"]):
        top_items = recommendations[:3]
        lines = ["Here is a quick comparison of your top options:", ""]
        for index, scholarship in enumerate(top_items, start=1):
            reasons = scholarship.get("reasons") or ["General eligibility appears to match your profile"]
            lines.append(f"{index}. {scholarship.get('name')}: {'; '.join(reasons[:2])}")
        lines.extend(["", "Choose one when you are ready, and I will guide you through the application steps."])
        return "\n".join(lines)

    if recommendations and any(keyword in lowered for keyword in ["best", "most suitable", "which one"]):
        best_match = recommendations[0]
        reasons = best_match.get("reasons") or ["General eligibility appears to match your profile"]
        return "\n".join([
            f"My best suggestion for you is {best_match.get('name')}.",
            "",
            "Why this looks like the strongest fit:",
            *[f"- {reason}" for reason in reasons[:4]],
            "",
            "If you want, I can compare it with the other options or help you apply for it.",
        ])

    if recommendations and any(keyword in lowered for keyword in ["recommend", "scholarship", "suggest", "top"]):
        lines = ["Here are the top scholarships I found for you:", ""]
        for index, scholarship in enumerate(recommendations[:3], start=1):
            fit_label = scholarship.get("fitLabel") or "Possible match"
            lines.append(f"{index}. {scholarship.get('name')} ({fit_label})")
        lines.extend(["", "You can choose one from the recommendation cards, or ask me to compare them."])
        return "\n".join(lines)

    if selected_scholarship:
        return "\n".join([
            f"You currently have {selected_scholarship.get('name')} selected.",
            "Ask me about application steps, documents, eligibility, or deadline details for this scholarship.",
        ])

    if recommendations:
        return "Demo mode is active. I have your recommendation list ready below. Ask for the best match, compare options, or select a scholarship for application steps."

    return "Demo mode is active. Complete your profile, then I can recommend scholarships and guide you through the application process."


def build_student_context(profile):
    father_income = to_int(profile.get("fatherIncome"))
    mother_income = to_int(profile.get("motherIncome"))
    family_income = father_income + mother_income

    tenth_percentage = to_float(profile.get("tenthPercentage"))
    twelfth_percentage = to_float(profile.get("twelfthPercentage"))
    college_cgpa = to_float(profile.get("collegeCgpa"))

    return {
        "gender": normalize_text(profile.get("gender")),
        "caste": normalize_text(profile.get("caste")),
        "religion": normalize_text(profile.get("religion")),
        "education_level": normalize_text(profile.get("educationLevel")),
        "family_income": family_income,
        "tenth_percentage": tenth_percentage,
        "twelfth_percentage": twelfth_percentage,
        "college_cgpa": college_cgpa,
    }


def calculate_match_score(student, scholarship):
    score = 0

    target_level = normalize_text(scholarship.get("targetLevel"))
    eligible_levels = [normalize_text(level) for level in scholarship.get("eligibleEducationLevels", [])]
    if student["education_level"] and (student["education_level"] == target_level or student["education_level"] in eligible_levels):
        score += 4

    eligible_castes = [normalize_text(caste) for caste in scholarship.get("eligibleCastes", [])]
    if not eligible_castes or student["caste"] in eligible_castes:
        score += 3
    elif student["caste"]:
        return 0

    eligible_genders = [normalize_text(gender) for gender in scholarship.get("eligibleGenders", [])]
    if not eligible_genders or student["gender"] in eligible_genders:
        score += 2
    elif student["gender"]:
        return 0

    eligible_religions = [normalize_text(religion) for religion in scholarship.get("eligibleReligions", [])]
    if not eligible_religions or student["religion"] in eligible_religions:
        score += 2
    elif student["religion"]:
        return 0

    max_family_income = scholarship.get("maxFamilyIncome")
    if max_family_income is not None:
        if student["family_income"] <= to_int(max_family_income):
            score += 4
        else:
            return 0
    else:
        score += 1

    minimum_percentage = to_float(scholarship.get("minimumPercentage"), default=-1)
    if minimum_percentage >= 0:
        best_percentage = max(student["tenth_percentage"], student["twelfth_percentage"], student["college_cgpa"] * 10)
        if best_percentage >= minimum_percentage:
            score += 3
        elif best_percentage > 0:
            return 0

    return score

# -------------------------------
# Fetch all scholarships
# -------------------------------
@app.get("/scholarships")
def get_scholarships():
    scholarships = []
    if db is not None:
        docs = db.collection("scholarships").stream()
        scholarships = [doc.to_dict() for doc in docs]
    official_source = list(FALLBACK_SCHOLARSHIPS)
    provider_source = [s for s in scholarships if (s.get("source") == "provider" or s.get("createdBy"))]

    active_official = [serialize_scholarship(s) for s in official_source if is_active_scholarship(s)]
    active_provider = [serialize_scholarship(s) for s in provider_source if is_active_scholarship(s)]
    return {
        "scholarships": active_official + active_provider,
        "officialScholarships": active_official,
        "providerScholarships": active_provider,
    }

# -------------------------------
# Recommend scholarships for a student
# -------------------------------
@app.get("/recommendations/{uid}")
def recommend(uid: str):
    if db is None:
        raise HTTPException(status_code=503, detail="Recommendations from backend profile data are unavailable in demo mode")

    user_ref = db.collection("users").document(uid).get()
    if not user_ref.exists:
        raise HTTPException(status_code=404, detail="User profile not found")

    profile = user_ref.to_dict()
    student = build_student_context(profile)

    docs = db.collection("scholarships").stream()
    scholarships = [doc.to_dict() for doc in docs]
    source_scholarships = scholarships if scholarships else FALLBACK_SCHOLARSHIPS

    recommended = []
    for s in source_scholarships:
        if s.get("source") == "provider" or s.get("createdBy"):
            continue

        if not is_active_scholarship(s):
            continue

        score_weight = calculate_match_score(student, s)

        if score_weight > 0:
            serialized = serialize_scholarship(s)
            serialized["match_score"] = score_weight
            recommended.append(serialized)

    recommended.sort(key=lambda x: x["match_score"], reverse=True)

    for item in recommended:
        del item["match_score"]

    return {"recommendations": recommended}


@app.post("/chatbot/respond")
def chatbot_respond(payload: dict = Body(...)):
    prompt = build_gemini_prompt(payload)
    response_text = call_gemini(prompt)
    if response_text:
        return {"reply": response_text, "mode": "gemini"}

    return {"reply": build_demo_reply(payload), "mode": "demo"}
