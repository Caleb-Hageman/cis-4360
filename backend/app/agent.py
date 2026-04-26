import json
import os
import atexit
from datetime import datetime
from pathlib import Path
from typing import Any, TypedDict

from google import genai
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, StateGraph
from prompt_template import DataExtractionTemplate

from google.genai import types

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
CHECKPOINT_DB_PATH = os.getenv(
    "LANGGRAPH_CHECKPOINT_DB",
    str(Path(__file__).resolve().parent.parent / "checkpoints.db"),
)


class AgentState(TypedDict, total=False):
    user_message: str
    headers: list[str]
    proposed_data: dict[str, Any]
    summary_report: dict[str, Any]
    reply: str
    user_profile: dict[str, Any]
    agent_role: str
    decomp_instructions: list[str]
    scaff_instructions: list[str]
    conversation_history: list[dict[str, str]]


def format_profile_context(user_profile: dict[str, Any]) -> str:
    if not user_profile:
        return "No user profile provided."

    profile_lines = [
        f"Name: {user_profile.get('name') or 'Unknown'}",
        f"Experience Level: {user_profile.get('experience_level') or 'Unspecified'}",
        f"Primary Language: {user_profile.get('primary_language') or 'Unspecified'}",
        f"LeetCode Goals: {user_profile.get('leetcode_goals') or 'Unspecified'}",
        f"Problems Solved: {user_profile.get('problems_solved', 0)}",
        f"Date Format: {user_profile.get('date_format') or 'MM/DD/YYYY'}",
    ]

    preferences = user_profile.get("preferences") or {}
    if preferences:
        safe_preferences = json.dumps(preferences, ensure_ascii=True).replace("{", "{{").replace("}", "}}")
        profile_lines.append(f"Preferences: {safe_preferences}")

    return "\n".join(profile_lines)


def prepare_history_contents(history: list[dict[str, str]]) -> list[types.Content]:
    """Convert history into Gemini-compatible Content objects."""
    contents = []
    # Send up to 10 recent messages for history
    for msg in history[-10:]:
        role = "model" if msg.get("role") == "assistant" else "user"
        contents.append(types.Content(role=role, parts=[types.Part(text=msg.get("content", ""))]))
    return contents


def normalize_row(
    headers: list[str],
    previous_row: dict[str, Any],
    parsed_row: dict[str, Any],
) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for header in headers:
        if header in parsed_row:
            normalized[header] = parsed_row[header]
        elif header in previous_row:
            normalized[header] = previous_row[header]
        else:
            normalized[header] = None
    return normalized


def normalize_report(parsed_report: dict[str, Any] | None) -> dict[str, Any]:
    report = parsed_report or {}
    observations = report.get("observations")
    recommendations = report.get("recommendations")

    return {
        "headline": str(report.get("headline") or "Draft Analysis"),
        "summary": str(
            report.get("summary")
            or "The assistant prepared a spreadsheet-ready draft and accompanying analysis."
        ),
        "observations": [str(item) for item in observations] if isinstance(observations, list) else [],
        "recommendations": [str(item) for item in recommendations] if isinstance(recommendations, list) else [],
    }


def escape_for_prompt_template(value: str) -> str:
    return value.replace("{", "{{").replace("}", "}}")


def extraction_node(state: AgentState):
    role = state.get("agent_role") or os.getenv("AGENT_ROLE")
    decomp = state.get("decomp_instructions") or [
        s.strip() for s in os.getenv("DECOMP_INSTRUCTIONS", "").split(",") if s.strip()
    ]
    scaff = state.get("scaff_instructions") or [
        s.strip() for s in os.getenv("SCAFF_INSTRUCTIONS", "").split(",") if s.strip()
    ]

    headers = state.get("headers", [])
    user_msg = state.get("user_message", "")
    user_profile = state.get("user_profile", {})
    previous_row = state.get("proposed_data") or {}
    prior_history = list(state.get("conversation_history", []))
    today = datetime.now().strftime("%Y-%m-%d")

    system_template = (
        DataExtractionTemplate("Task: Extract or update LeetCode spreadsheet data based on the user's latest input.")
        .with_role(role)
        .with_chain_of_thought()
        .with_context(
            "\n".join(
                [
                    f"The spreadsheet has these columns: {', '.join(headers)}",
                    f"User profile:\n{format_profile_context(user_profile)}",
                    (
                        "Existing draft row:\n"
                        f"{json.dumps(previous_row, ensure_ascii=True).replace('{', '{{').replace('}', '}}') if previous_row else 'No existing draft yet.'}"
                    ),
                    (
                        "If the user asks to revise or improve the draft, update the existing draft "
                        "instead of starting from scratch. Preserve prior fields unless the user "
                        "explicitly changes or contradicts them."
                    ),
                ]
            )
        )
        .structured_decomposition(decomp)
        .constraint_scaffolding(scaff)
        .with_output_format(
            escape_for_prompt_template(
                (
                "A raw JSON object with this exact shape:\n"
                "{\n"
                '  "row": { "Header Name": "value" },\n'
                '  "report": {\n'
                '    "headline": "short title",\n'
                '    "summary": "2-4 sentence analysis",\n'
                '    "observations": ["insight 1", "insight 2"],\n'
                '    "recommendations": ["next step 1", "next step 2"]\n'
                "  }\n"
                "}\n"
                "The row keys must match the spreadsheet headers exactly. The report must be generated fresh from the user's work, draft, profile, and history, not boilerplate."
                )
            )
        )
    )

    system_instruction = system_template.full_prompt(today=today)
    
    contents = prepare_history_contents(prior_history)
    contents.append(types.Content(role="user", parts=[types.Part(text=user_msg)]))

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
        ),
        contents=contents,
    )

    reply = (
        "I updated the current draft using your latest instructions."
        if previous_row
        else "I've prepared a preview of the data for your spreadsheet."
    )

    try:
        text = response.text.strip().removeprefix("```json").removesuffix("```").strip()
        parsed_payload = json.loads(text)
        parsed_row = parsed_payload.get("row", parsed_payload)
        parsed_report = parsed_payload.get("report", {})
        proposed_row = normalize_row(headers, previous_row, parsed_row)
        summary_report = normalize_report(parsed_report)
    except Exception as exc:
        print(f"Parsing error: {exc}")
        proposed_row = normalize_row(headers, previous_row, {})
        summary_report = normalize_report(None)

    updated_history = prior_history + [
        {"role": "user", "content": user_msg},
        {"role": "assistant", "content": reply},
    ]

    return {
        "proposed_data": proposed_row,
        "summary_report": summary_report,
        "reply": reply,
        "user_profile": user_profile,
        "conversation_history": updated_history[-12:],
    }


workflow = StateGraph(AgentState)
workflow.add_node("extract", extraction_node)
workflow.set_entry_point("extract")
workflow.add_edge("extract", END)

memory_manager = SqliteSaver.from_conn_string(CHECKPOINT_DB_PATH)
memory = memory_manager.__enter__()
atexit.register(memory_manager.__exit__, None, None, None)
graph = workflow.compile(checkpointer=memory)
