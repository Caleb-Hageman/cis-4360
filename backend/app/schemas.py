from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class UserProfile(BaseModel):
    name: str
    experience_level: str = ""
    primary_language: str = ""
    leetcode_goals: str = ""
    problems_solved: int = 0
    preferences: Dict[str, str] = Field(default_factory=dict)
    date_format: str = "MM/DD/YYYY"

class ChatRequest(BaseModel):
    message: str
    user_profile: UserProfile
    spreadsheet_id: Optional[str] = None
    thread_id: Optional[str] = None
    agent_role: Optional[str] = None
    decomp_instructions: Optional[List[str]] = None
    scaff_instructions: Optional[List[str]] = None

class ExtractionPreview(BaseModel):
    proposed_row: Dict[str, str]
    sheet_name: str
    confidence_score: float

class CommitRequest(BaseModel):
    data: Dict[str, Any]
    spreadsheet_id: Optional[str] = None
    thread_id: Optional[str] = None

class DeleteDraftRequest(BaseModel):
    thread_id: Optional[str] = None


class SummaryReport(BaseModel):
    headline: str
    summary: str
    observations: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
