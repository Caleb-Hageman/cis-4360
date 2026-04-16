import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import ChatRequest, CommitRequest
from .agent import graph
from .mcp_tools import get_sheet_headers, append_to_sheet

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In prod, change this to your specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPREADSHEET_ID = os.getenv("SPREADSHEET_ID")

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    # 1. Fetch live headers from Google
    headers = get_sheet_headers(SPREADSHEET_ID)
    
    # 2. Run the LangGraph Agent
    inputs = {
        "user_message": req.message,
        "system_prompt": req.system_override or "Default prompt",
        "headers": headers
    }
    result = graph.invoke(inputs)
    
    return {
        "reply": "I've prepared a preview of the data for your spreadsheet.",
        "preview": result["proposed_data"]
    }

@app.post("/api/commit")
async def commit_endpoint(req: CommitRequest):
    sheet_id = req.spreadsheet_id or os.getenv("SPREADSHEET_ID")

    if not sheet_id:
        raise HTTPException(status_code=400, detail="Spreadsheet ID missing")
    
    row_dict = req.data
    ordered_headers = ["Problem Name", "Difficulty", "Date", "Pattern", "Solution Process", "Link"]
    row_to_append = [row_dict.get(header, "") for header in ordered_headers]
    
    append_to_sheet(sheet_id, row_to_append)
    return {"status": "success"}