import os
from typing import Optional

from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")


def get_sheets_service(user_tokens: Optional[dict] = None):
    if user_tokens and user_tokens.get("access_token"):
        creds = Credentials(
            token=user_tokens["access_token"],
            refresh_token=user_tokens.get("refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            scopes=SCOPES,
        )
    else:
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE,
            scopes=SCOPES,
        )

    return build('sheets', 'v4', credentials=creds)


def get_sheet_headers(
    spreadsheet_id: str,
    range_name: str = "Sheet1!1:1",
    user_tokens: Optional[dict] = None,
):
    service = get_sheets_service(user_tokens)
    sheet = service.spreadsheets()
    result = sheet.values().get(spreadsheetId=spreadsheet_id, range=range_name).execute()
    values = result.get('values', [])
    return values[0] if values else []


def append_to_sheet(
    spreadsheet_id: str,
    row_data: list,
    range_name: str = "Sheet1!A1",
    user_tokens: Optional[dict] = None,
):
    service = get_sheets_service(user_tokens)
    body = {'values': [row_data]}
    service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id, 
        range=range_name,
        valueInputOption="RAW", 
        body=body
    ).execute()
