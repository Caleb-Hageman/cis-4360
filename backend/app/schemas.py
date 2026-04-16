from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class UserProfile(BaseModel):
    name: str
    preferences: Dict[str, str] = {}
    date_format: str = "MM/DD/YYYY"

class ChatRequest(BaseModel):
    message: str
    user_profile: UserProfile
    system_override: Optional[str] = None
    thread_id: Optional[str] = "default_thread"

class ExtractionPreview(BaseModel):
    proposed_row: Dict[str, str]
    sheet_name: str
    confidence_score: float

class CommitRequest(BaseModel):
    data: Dict[str, Any]
    spreadsheet_id: Optional[str] = None