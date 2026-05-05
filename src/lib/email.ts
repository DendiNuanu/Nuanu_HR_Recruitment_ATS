import { Resend } from 'resend';

export type EmailOptions = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  attachments?: { filename: string; content: Buffer }[];
};

/**
 * Professional Email Service using Resend
 * Implementation is production-ready.
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  from = process.env.RESEND_FROM || "Nuanu Recruitment <onboarding@resend.dev>",
  attachments
}: EmailOptions) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey || apiKey === "re_your_api_key_here") {
      console.warn("RESEND_API_KEY is missing or is still the placeholder.");
      return { success: false, error: "Configuration missing" };
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      text: text || "",
      html: html || text || "",
      attachments: attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    if (error) {
      console.error("Resend Email Error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email Sending Failed:", error);
    return { success: false, error };
  }
}
