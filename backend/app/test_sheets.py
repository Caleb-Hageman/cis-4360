import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from dotenv import load_dotenv

# Load .env variables
load_dotenv()

def test_connection():
    print("Starting Google Sheets Connection Test...")
    
    # 1. Check if the key file exists
    key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    print(f"Checking for key at: {key_path}")
    
    if not os.path.exists(key_path):
        print("Error: google-key.json not found at the specified path!")
        return

    # 2. Authenticate
    try:
        scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly']
        creds = service_account.Credentials.from_service_account_file(
            key_path, scopes=scopes)
        service = build('sheets', 'v4', credentials=creds)
        print("Authentication successful!")
    except Exception as e:
        print(f"Authentication failed: {e}")
        return

    # 3. Try to read the Spreadsheet
    spreadsheet_id = os.getenv("SPREADSHEET_ID")
    print(f"Attempting to read Spreadsheet ID: {spreadsheet_id}")
    
    try:
        sheet = service.spreadsheets()
        # Just getting the spreadsheet metadata to prove access
        result = sheet.get(spreadsheetId=spreadsheet_id).execute()
        title = result.get('properties', {}).get('title', 'Unknown')
        print(f"Success! Connected to spreadsheet: '{title}'")
        
        # 4. Read the first row (headers)
        values_result = sheet.values().get(
            spreadsheetId=spreadsheet_id, 
            range="Sheet1!1:1"
        ).execute()
        headers = values_result.get('values', [])
        print(f"Headers found: {headers}")
        
    except Exception as e:
        print(f"Failed to read spreadsheet: {e}")
        print("\nTIP: Did you remember to share the sheet with the Service Account email?")

if __name__ == "__main__":
    test_connection()