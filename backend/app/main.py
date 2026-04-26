import os
import secrets
from urllib.parse import urlencode

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from starlette.middleware.sessions import SessionMiddleware

from .schemas import ChatRequest, CommitRequest, DeleteDraftRequest
from .agent import graph
from .mcp_tools import get_sheet_headers, append_to_sheet

SPREADSHEET_ID = os.getenv("SPREADSHEET_ID")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_OAUTH_REDIRECT_URI = os.getenv(
    "GOOGLE_OAUTH_REDIRECT_URI",
    "http://localhost:8000/api/auth/google/callback",
)
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/spreadsheets",
]

app = FastAPI()

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "dev-session-secret-change-me"),
    same_site="lax",
    https_only=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_session_user(request: Request):
    return request.session.get("user")


def get_session_tokens(request: Request):
    return request.session.get("google_tokens")


def get_thread_id(request: Request, fallback: str | None = None):
    session_user = get_session_user(request) or {}
    return session_user.get("email") or fallback or "default_thread"


@app.get("/api/auth/google/start")
async def google_auth_start(request: Request):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured")

    state = secrets.token_urlsafe(24)
    request.session["oauth_state"] = state

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    return {"auth_url": f"{GOOGLE_AUTH_URL}?{urlencode(params)}"}


@app.get("/api/auth/google/callback")
async def google_auth_callback(request: Request, code: str, state: str):
    expected_state = request.session.get("oauth_state")
    if not expected_state or state != expected_state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    async with httpx.AsyncClient(timeout=20) as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_OAUTH_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if token_response.is_error:
        raise HTTPException(status_code=400, detail="Failed to exchange Google auth code")

    token_data = token_response.json()
    token_info = id_token.verify_oauth2_token(
        token_data["id_token"],
        GoogleRequest(),
        GOOGLE_CLIENT_ID,
    )

    request.session["google_tokens"] = {
        "access_token": token_data["access_token"],
        "refresh_token": token_data.get("refresh_token"),
    }
    request.session["user"] = {
        "email": token_info.get("email"),
        "name": token_info.get("name"),
        "picture": token_info.get("picture"),
    }
    request.session.pop("oauth_state", None)

    return RedirectResponse(url=f"{FRONTEND_URL}?auth=success", status_code=302)


@app.get("/api/auth/me")
async def auth_me(request: Request):
    return {"user": get_session_user(request)}


@app.get("/api/chat/history")
async def chat_history(request: Request, thread_id: str | None = None):
    resolved_thread_id = get_thread_id(request, thread_id)
    state = graph.get_state({"configurable": {"thread_id": resolved_thread_id}})
    values = state.values or {}

    return {
        "thread_id": resolved_thread_id,
        "messages": values.get("conversation_history", []),
        "preview": values.get("proposed_data"),
        "report": values.get("summary_report"),
    }


@app.post("/api/auth/logout")
async def auth_logout(request: Request):
    request.session.clear()
    return {"status": "signed_out"}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest, request: Request):
    sheet_id = req.spreadsheet_id or SPREADSHEET_ID
    if not sheet_id:
        raise HTTPException(status_code=400, detail="Spreadsheet ID missing")

    headers = get_sheet_headers(sheet_id, user_tokens=get_session_tokens(request))
    thread_id = get_thread_id(request, req.thread_id)

    inputs = {
        "user_message": req.message,
        "headers": headers,
        "user_profile": req.user_profile.model_dump(),
        "agent_role": req.agent_role,
        "decomp_instructions": req.decomp_instructions,
        "scaff_instructions": req.scaff_instructions,
    }
    config = {"configurable": {"thread_id": thread_id}}
    result = graph.invoke(inputs, config=config)
    
    return {
        "reply": result.get("reply", "I've prepared a preview of the data for your spreadsheet."),
        "preview": result["proposed_data"],
        "report": result.get("summary_report"),
        "thread_id": thread_id,
    }

@app.post("/api/draft/delete")
async def delete_draft_endpoint(req: DeleteDraftRequest, request: Request):
    thread_id = get_thread_id(request, req.thread_id)
    config = {"configurable": {"thread_id": thread_id}}
    
    graph.update_state(
        config,
        {
            "proposed_data": None,
            "summary_report": None,
        },
        as_node="extract",
    )
    return {"status": "success"}

@app.post("/api/commit")
async def commit_endpoint(req: CommitRequest, request: Request):
    sheet_id = req.spreadsheet_id or os.getenv("SPREADSHEET_ID")

    if not sheet_id:
        raise HTTPException(status_code=400, detail="Spreadsheet ID missing")
    
    row_dict = req.data
    live_headers = get_sheet_headers(sheet_id, user_tokens=get_session_tokens(request))
    if not live_headers:
        raise HTTPException(status_code=400, detail="No spreadsheet headers found")

    row_to_append = [row_dict.get(header, "") for header in live_headers]
    
    append_to_sheet(sheet_id, row_to_append, user_tokens=get_session_tokens(request))
    thread_id = get_thread_id(request, req.thread_id)
    config = {"configurable": {"thread_id": thread_id}}
    state = graph.get_state(config)
    values = state.values or {}
    conversation_history = list(values.get("conversation_history", []))
    conversation_history.append(
        {
            "role": "assistant",
            "content": "Posted to Google Sheets. The current draft is closed, but you can keep chatting to start a new one.",
        }
    )
    graph.update_state(
        config,
        {
            "proposed_data": None,
            "summary_report": None,
            "conversation_history": conversation_history[-12:],
        },
        as_node="extract",
    )
    return {"status": "success"}
