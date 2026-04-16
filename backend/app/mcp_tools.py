import os
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

def get_sheets_service():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    return build('sheets', 'v4', credentials=creds)

def get_sheet_headers(spreadsheet_id: str, range_name: str = "Sheet1!1:1"):
    service = get_sheets_service()
    sheet = service.spreadsheets()
    result = sheet.values().get(spreadsheetId=spreadsheet_id, range=range_name).execute()
    values = result.get('values', [])
    return values[0] if values else []

def append_to_sheet(spreadsheet_id: str, row_data: list, range_name: str = "Sheet1!A1"):
    service = get_sheets_service()
    body = {'values': [row_data]}
    service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id, 
        range=range_name,
        valueInputOption="RAW", 
        body=body
    ).execute()