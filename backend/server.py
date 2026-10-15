from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, Request, Response, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import json
import uuid
import jwt
import bcrypt
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========= Models =========
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: str = "email"
    free_used: bool = False
    subscription_active: bool = False
    subscription_expires_at: Optional[str] = None
    subscription_credits: int = 0
    created_at: str

class AnalysisResult(BaseModel):
    analysis_id: str
    user_id: str
    title: str
    contract_type: str
    overall_risk: str  # "low" | "medium" | "high"
    summary: str
    key_points: List[dict]  # [{title, description, severity}]
    hidden_clauses: List[dict]
    recommendations: List[str]
    created_at: str

class CheckoutRequest(BaseModel):
    package_id: str  # "monthly" or "single"
    origin_url: str

# ========= Helpers =========
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_jwt(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(request: Request) -> dict:
    # Try session_token cookie first (Google auth)
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at") or datetime.now(timezone.utc).isoformat()
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
    # Try Bearer token (email auth)
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
            if user:
                return user
        except jwt.PyJWTError:
            pass
    raise HTTPException(status_code=401, detail="Not authenticated")

def user_public(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "email": u["email"],
        "name": u.get("name", ""),
        "picture": u.get("picture"),
        "auth_provider": u.get("auth_provider", "email"),
        "free_used": u.get("free_used", False),
        "subscription_active": u.get("subscription_active", False),
        "subscription_expires_at": u.get("subscription_expires_at"),
        "subscription_credits": u.get("subscription_credits", 0),
        "single_credits": u.get("single_credits", 0),
    }

async def check_and_consume_credit(user: dict) -> dict:
    """Check if user has credit and consume one. Returns updated user or raises."""
    user_id = user["user_id"]
    # Priority: subscription credits -> single credits -> free credit
    if user.get("subscription_active") and user.get("subscription_credits", 0) > 0:
        # Also verify not expired
        exp = user.get("subscription_expires_at")
        if exp:
            exp_dt = datetime.fromisoformat(exp) if isinstance(exp, str) else exp
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt > datetime.now(timezone.utc):
                await db.users.update_one({"user_id": user_id}, {"$inc": {"subscription_credits": -1}})
                return await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if user.get("single_credits", 0) > 0:
        await db.users.update_one({"user_id": user_id}, {"$inc": {"single_credits": -1}})
        return await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user.get("free_used", False):
        await db.users.update_one({"user_id": user_id}, {"$set": {"free_used": True}})
        return await db.users.find_one({"user_id": user_id}, {"_id": 0})
    raise HTTPException(status_code=402, detail="no_credits")

# ========= Auth Routes =========
@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": req.email,
        "name": req.name,
        "password_hash": hash_password(req.password),
        "auth_provider": "email",
        "free_used": False,
        "subscription_active": False,
        "subscription_credits": 0,
        "single_credits": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_jwt(user_id)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"token": token, "user": user_public(user)}

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user or not user.get("password_hash") or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(user["user_id"])
    return {"token": token, "user": user_public(user)}

@api_router.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient() as client_http:
        r = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=10.0,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = r.json()
    email = data["email"]
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture")
    session_token = data["session_token"]
    # Upsert user
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "auth_provider": "google",
            "free_used": False,
            "subscription_active": False,
            "subscription_credits": 0,
            "single_credits": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_public(user)}

@api_router.get("/auth/me")
async def me(request: Request):
    user = await get_current_user(request)
    return user_public(user)

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ========= Contract Analysis =========
def files_to_images(files: List[dict]) -> List[str]:
    import fitz
    images = []
    for f in files:
        data = f.get("base64_data", "")
        if "," in data[:100]:
            data = data.split(",", 1)[1]
        if "pdf" in f.get("mime_type", ""):
            doc = fitz.open(stream=base64.b64decode(data), filetype="pdf")
            for page in doc:
                images.append(base64.b64encode(page.get_pixmap(dpi=150).tobytes("png")).decode())
        else:
            images.append(data)
    return images

async def analyze_contract_with_ai(files_data: List[str], language: str = "ar") -> dict:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

    system_prompt_ar = """أنت محلل عقود قانوني خبير. حلل العقد المرفق بدقة واستخرج:
1. نوع العقد (إيجار، شراء سيارة، شراء عقار، عمل، ...إلخ)
2. ملخص موجز للعقد (3-4 أسطر)
3. تقييم المخاطر العام: "low" أو "medium" أو "high"
4. النقاط المهمة الرئيسية (5-10 نقاط)
5. البنود المخفية والمخاطر (مثل: الغرامات، التجديد التلقائي، سحب السيارة، فسخ العقد، ...إلخ)
6. التوصيات العملية (3-6 توصيات)

أرجع JSON فقط بالشكل التالي بدون أي نص آخر:
{
  "title": "عنوان مختصر للعقد",
  "contract_type": "نوع العقد",
  "overall_risk": "low|medium|high",
  "summary": "ملخص...",
  "key_points": [{"title":"...","description":"...","severity":"info|warning|danger"}],
  "hidden_clauses": [{"title":"...","description":"...","severity":"warning|danger"}],
  "recommendations": ["...","..."]
}"""
    system_prompt_en = """You are an expert legal contract analyst. Analyze the attached contract carefully and extract:
1. Contract type (lease, car purchase, real estate, employment, etc.)
2. Brief summary (3-4 lines)
3. Overall risk: "low", "medium", or "high"
4. Key points (5-10 items)
5. Hidden clauses and risks (penalties, auto-renewal, repossession, termination clauses, etc.)
6. Practical recommendations (3-6 items)

Return ONLY JSON with this exact shape, no other text:
{
  "title": "short title",
  "contract_type": "type",
  "overall_risk": "low|medium|high",
  "summary": "...",
  "key_points": [{"title":"...","description":"...","severity":"info|warning|danger"}],
  "hidden_clauses": [{"title":"...","description":"...","severity":"warning|danger"}],
  "recommendations": ["...","..."]
}"""

    system_prompt = system_prompt_ar if language == "ar" else system_prompt_en

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"analysis_{uuid.uuid4().hex[:8]}",
        system_message=system_prompt,
    ).with_model("openai", "gpt-6-sol")

    user_msg_text = "حلل هذا العقد وأرجع JSON فقط." if language == "ar" else "Analyze this contract and return JSON only."
    user_msg = UserMessage(text=user_msg_text, file_contents=[ImageContent(image_base64=b) for b in files_data])
    result_text = await chat.send_message(user_msg)

    # Parse JSON (strip markdown fences if any)
    txt = result_text.strip()
    if txt.startswith("```"):
        txt = txt.strip("`")
        if txt.startswith("json"):
            txt = txt[4:]
        txt = txt.strip("`").strip()
    # Find first { and last }
    start = txt.find("{")
    end = txt.rfind("}")
    if start >= 0 and end >= 0:
        txt = txt[start:end+1]
    try:
        return json.loads(txt)
    except Exception as e:
        logger.error(f"JSON parse failed: {e}, text: {result_text[:500]}")
        return {
            "title": "تحليل العقد" if language == "ar" else "Contract Analysis",
            "contract_type": "غير محدد" if language == "ar" else "Unknown",
            "overall_risk": "medium",
            "summary": result_text[:400],
            "key_points": [],
            "hidden_clauses": [],
            "recommendations": [],
        }

@api_router.post("/analyze")
async def analyze_endpoint(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    files = body.get("files", [])
    language = body.get("language", "ar")
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    try:
        import asyncio
        images = await asyncio.to_thread(files_to_images, files)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file")
    if len(images) > 3:
        raise HTTPException(status_code=400, detail="max_pages")

    # Check credit without consuming yet
    has_credit = (
        (user.get("subscription_active") and user.get("subscription_credits", 0) > 0)
        or user.get("single_credits", 0) > 0
        or not user.get("free_used", False)
    )
    if not has_credit:
        raise HTTPException(status_code=402, detail="no_credits")

    try:
        result = await analyze_contract_with_ai(images, language)
    except Exception as e:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=422, detail="ai_failed")

    # Consume credit after successful analysis
    await check_and_consume_credit(user)

    analysis_id = f"an_{uuid.uuid4().hex[:12]}"
    doc = {
        "analysis_id": analysis_id,
        "user_id": user["user_id"],
        "language": language,
        "title": result.get("title", "Contract"),
        "contract_type": result.get("contract_type", ""),
        "overall_risk": result.get("overall_risk", "medium"),
        "summary": result.get("summary", ""),
        "key_points": result.get("key_points", []),
        "hidden_clauses": result.get("hidden_clauses", []),
        "recommendations": result.get("recommendations", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.analyses.insert_one(doc)
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"analysis": {k: v for k, v in doc.items() if k != "_id"}, "user": user_public(updated_user)}

@api_router.get("/analyses")
async def list_analyses(request: Request):
    user = await get_current_user(request)
    items = await db.analyses.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items

@api_router.get("/analyses/{analysis_id}")
async def get_analysis(analysis_id: str, request: Request):
    user = await get_current_user(request)
    item = await db.analyses.find_one({"analysis_id": analysis_id, "user_id": user["user_id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return item

# ========= Payments (Stripe) =========
PACKAGES = {
    "monthly": {"amount": 20.0, "credits": 6, "name": "الاشتراك الشهري / Monthly Plan", "type": "subscription_credits"},
    "single":  {"amount": 3.0,  "credits": 1, "name": "تحليل واحد / Single Analysis", "type": "single_credit"},
}

@api_router.post("/payments/checkout")
async def create_checkout(req: CheckoutRequest, request: Request):
    user = await get_current_user(request)
    if req.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    pkg = PACKAGES[req.package_id]
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        host_url = str(request.base_url)
        webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
        checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        success_url = f"{req.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{req.origin_url}/pricing"
        session_req = CheckoutSessionRequest(
            amount=pkg["amount"],
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": user["user_id"], "package_id": req.package_id},
        )
        session = await checkout.create_checkout_session(session_req)
    except Exception as e:
        logger.exception("Checkout failed")
        raise HTTPException(status_code=500, detail=f"Checkout error: {str(e)[:200]}")

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "package_id": req.package_id,
        "amount": pkg["amount"],
        "currency": "usd",
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.session_id}

async def grant_credits_for_session(session_id: str) -> dict:
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        return {"ok": False, "reason": "not_found"}
    if tx.get("payment_status") == "paid":
        return {"ok": True, "already": True}
    pkg = PACKAGES.get(tx["package_id"])
    if not pkg:
        return {"ok": False, "reason": "bad_package"}
    user_id = tx["user_id"]
    if pkg["type"] == "subscription_credits":
        expires = datetime.now(timezone.utc) + timedelta(days=30)
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"subscription_active": True, "subscription_expires_at": expires.isoformat()},
             "$inc": {"subscription_credits": pkg["credits"]}},
        )
    else:
        await db.users.update_one(
            {"user_id": user_id},
            {"$inc": {"single_credits": pkg["credits"]}},
        )
    await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid",
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}

@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.get("payment_status") != "paid":
        # Poll Stripe
        try:
            from emergentintegrations.payments.stripe.checkout import StripeCheckout
            checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
            status = await checkout.get_checkout_status(session_id)
            if status.payment_status == "paid" or status.status == "complete":
                await grant_credits_for_session(session_id)
                tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except Exception as e:
            logger.warning(f"Stripe status poll failed: {e}")
    return {"session_id": tx["session_id"], "status": tx["status"], "payment_status": tx["payment_status"]}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        body_bytes = await request.body()
        sig = request.headers.get("Stripe-Signature", "")
        checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        wr = await checkout.handle_webhook(body_bytes, sig)
        if wr.payment_status == "paid":
            await grant_credits_for_session(wr.session_id)
        return {"status": "ok"}
    except Exception as e:
        logger.exception("Webhook failed")
        return JSONResponse({"status": "error", "detail": str(e)[:200]}, status_code=400)

@api_router.get("/packages")
async def get_packages():
    return [
        {"id": "free", "amount": 0, "credits": 1, "name_ar": "الباقة المجانية", "name_en": "Free Trial", "description_ar": "تحليل واحد مجاني", "description_en": "1 free analysis"},
        {"id": "single", "amount": 3.0, "credits": 1, "name_ar": "تحليل واحد", "name_en": "Single Analysis", "description_ar": "تحليل عقد واحد", "description_en": "One contract analysis"},
        {"id": "monthly", "amount": 20.0, "credits": 6, "name_ar": "الاشتراك الشهري", "name_en": "Monthly Plan", "description_ar": "٦ تحليلات في الشهر", "description_en": "6 analyses per month"},
    ]

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
