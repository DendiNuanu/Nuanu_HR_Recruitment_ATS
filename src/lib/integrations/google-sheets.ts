import { google } from "googleapis";

/**
 * Google Sheets Integration Utility
 * Requires a Google Cloud Service Account JSON key to authenticate.
 * The Service Account email must be granted 'Editor' access to the target Google Sheet.
 */

// We expect the JSON credentials to be stored as a stringified JSON in the environment
const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

export async function getGoogleSheetsClient() {
  if (!GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured in the environment.");
  }

  const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

/**
 * Appends a new candidate to the tracking Google Sheet
 */
export async function appendCandidateToSheet(spreadsheetId: string, candidateData: any[]) {
  try {
    const sheets = await getGoogleSheetsClient();
    
    // Assumes the sheet has a tab named 'Candidates'
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Candidates!A:Z",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [candidateData],
      },
    });
    
    return response.data;
  } catch (error) {
    console.error("Error appending to Google Sheet:", error);
    throw error;
  }
}

/**
 * Reads the latest recruitment requirements from the Master Request template
 */
export async function readJobRequirementsFromSheet(spreadsheetId: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    
    // Assumes the sheet has a tab named 'Master Request'
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Master Request!A:Z",
    });
    
    return response.data.values;
  } catch (error) {
    console.error("Error reading from Google Sheet:", error);
    throw error;
  }
}
