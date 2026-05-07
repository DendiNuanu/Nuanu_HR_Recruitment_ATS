import { google } from "googleapis";
import { prisma } from "./prisma";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

export async function getGoogleAuthUrl(userId: string) {
  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ];

  // Encode userId in the state parameter so the callback can identify the user
  // even when operating across redirects (belt-and-suspenders alongside the cookie).
  const state = Buffer.from(JSON.stringify({ userId })).toString("base64url");

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    state,
  });
}

export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

async function getClientForUser(userId: string) {
  const integration = await prisma.calendarIntegration.findUnique({
    where: { userId },
  });

  if (!integration) return null;

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
    expiry_date: integration.expiryDate.getTime(),
  });

  // Handle token refresh
  client.on("tokens", async (tokens) => {
    if (tokens.refresh_token) {
      await prisma.calendarIntegration.update({
        where: { userId },
        data: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token,
          expiryDate: new Date(tokens.expiry_date!),
        },
      });
    } else {
      await prisma.calendarIntegration.update({
        where: { userId },
        data: {
          accessToken: tokens.access_token!,
          expiryDate: new Date(tokens.expiry_date!),
        },
      });
    }
  });

  return google.calendar({ version: "v3", auth: client });
}

export async function createCalendarEvent(
  userId: string,
  data: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
  },
) {
  const calendar = await getClientForUser(userId);
  if (!calendar) return null;

  try {
    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary: data.title,
        description: data.description,
        start: { dateTime: data.startTime.toISOString() },
        end: { dateTime: data.endTime.toISOString() },
        attendees: data.attendees.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `interview-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    return {
      googleEventId: event.data.id!,
      meetingLink:
        event.data.hangoutLink! ||
        event.data.conferenceData?.entryPoints?.[0]?.uri,
    };
  } catch (error) {
    console.error("Google Calendar Create Event Error:", error);
    return null;
  }
}

export async function updateCalendarEvent(
  userId: string,
  googleEventId: string,
  data: {
    title?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
  },
) {
  const calendar = await getClientForUser(userId);
  if (!calendar) return null;

  try {
    await calendar.events.patch({
      calendarId: "primary",
      eventId: googleEventId,
      requestBody: {
        ...(data.title && { summary: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.startTime && {
          start: { dateTime: data.startTime.toISOString() },
        }),
        ...(data.endTime && { end: { dateTime: data.endTime.toISOString() } }),
      },
    });
    return true;
  } catch (error) {
    console.error("Google Calendar Update Event Error:", error);
    return false;
  }
}

export async function deleteCalendarEvent(
  userId: string,
  googleEventId: string,
) {
  const calendar = await getClientForUser(userId);
  if (!calendar) return null;

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
    });
    return true;
  } catch (error) {
    console.error("Google Calendar Delete Event Error:", error);
    return false;
  }
}
