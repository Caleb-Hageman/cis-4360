import os
import json
from typing import TypedDict
from langgraph.graph import StateGraph, END
from prompt_template import DataExtractionTemplate
from datetime import datetime
from google import genai

# Initialize the Gemini Client
# Ensure GEMINI_API_KEY is in your .env
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class AgentState(TypedDict):
    user_message: str
    headers: list
    proposed_data: dict
    agent_role: str
    decomp_instructions: list[str]
    scaff_instructions: list[str]


def extraction_node(state: AgentState):
    """
    Calls Gemini to map user text to the spreadsheet headers.
    """
    role = state.get("agent_role") or os.getenv("AGENT_ROLE")
    decomp = state.get("decomp_instructions") or [s.strip() for s in os.getenv("DECOMP_INSTRUCTIONS", "").split(",")]
    scaff = state.get("scaff_instructions") or [s.strip() for s in os.getenv("SCAFF_INSTRUCTIONS", "").split(",")]

    headers = state.get("headers", [])
    user_msg = state.get("user_message", "")

    today = datetime.now().strftime("%Y-%m-%d")

    template = (
        DataExtractionTemplate("Extract LeetCode data from: {user_msg}")
        .with_role(role)
        .with_context(f"The spreadsheet has these columns: {', '.join(headers)}")
        .structured_decomposition(decomp)
        .constraint_scaffolding(scaff)
        .with_output_format("A raw JSON object matching the headers exactly.")
    )

    formatted_instruction = template.full_prompt(user_msg=user_msg, today=today)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=formatted_instruction # Use the combined prompt here
    )

    try:
        text = response.text.strip().removeprefix("```json").removesuffix("```").strip()
        proposed_row = json.loads(text)
    except Exception as e:
        print(f"Parsing error: {e}")
        proposed_row = {h: None for h in headers} 

    return {"proposed_data": proposed_row}

# Define the Graph
workflow = StateGraph(AgentState)
workflow.add_node("extract", extraction_node)
workflow.set_entry_point("extract")
workflow.add_edge("extract", END)
graph = workflow.compile()