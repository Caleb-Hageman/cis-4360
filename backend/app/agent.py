import os
import json
from typing import TypedDict
from langgraph.graph import StateGraph, END
from prompt_template import DataExtractionTemplate
from google import genai

# Initialize the Gemini Client
# Ensure GEMINI_API_KEY is in your .env
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class AgentState(TypedDict):
    user_message: str
    system_prompt: str
    headers: list
    proposed_data: dict

def extraction_node(state: AgentState):
    """
    Calls Gemini to map user text to the spreadsheet headers.
    """
    headers = state.get("headers", [])
    user_msg = state.get("user_message", "")
    system_override = state.get("system_prompt", "")

    # 1. Build the prompt using your chainable class
    # We use the system_override if provided, otherwise a default base
    base_text = system_override if system_override else "Extract data for these columns: {headers}"
    
    template = DataExtractionTemplate(base_text)
    
    # 2. Chain instructions for high-accuracy extraction
    full_prompt = (
        template.with_role("a precise Data Analyst for a LeetCode tracking system")
        .with_context(f"The spreadsheet has these columns: {', '.join(headers)}")
        .with_constraints([
            "Return ONLY a raw JSON object.",
            "Keys must match the headers exactly.",
            "Use null for missing information."
        ])
        .with_output_format("JSON")
    )

    # 3. Generate the actual content
    # We pass the headers to the template formatter
    formatted_instruction = full_prompt.full_prompt(headers=headers)
    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"{formatted_instruction}\n\nUser Input: {user_msg}"
    )

    # 4. Parse JSON from the response
    try:
        # Clean markdown if the AI includes it (e.g., ```json)
        text = response.text.strip().removeprefix("```json").removesuffix("```").strip()
        proposed_row = json.loads(text)
    except Exception as e:
        print(f"Parsing error: {e}")
        proposed_row = {h: None for h in headers} # Return empty template on failure

    return {"proposed_data": proposed_row}

# Define the Graph
workflow = StateGraph(AgentState)
workflow.add_node("extract", extraction_node)
workflow.set_entry_point("extract")
workflow.add_edge("extract", END)
graph = workflow.compile()