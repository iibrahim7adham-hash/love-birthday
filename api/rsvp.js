// Vercel serverless function — forwards RSVP submissions to Telegram.
// Only the ali-muneer engagement template's own Vercel project has
// TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID set (Settings > Environment
// Variables there, never committed to the repo), so this silently 500s
// on any other template's deployment even though the route ships in
// every bundle.
const MAX_FIELD_LENGTH = 300;

function sanitize(value) {
  return typeof value === "string" ? value.trim().slice(0, MAX_FIELD_LENGTH) : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const name = sanitize(req.body?.name);
  const attendees = sanitize(req.body?.attendees) || "-";
  const status = sanitize(req.body?.status) || "-";

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("RSVP: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env var");
    return res.status(500).json({ error: "Server not configured" });
  }

  const text =
    `👰🤵 تأكيد حضور - عقد قران علي وسمية\n` +
    `- الاسم: ${name}\n` +
    `- عدد الضيوف: ${attendees}\n` +
    `- حالة الحضور: ${status}`;

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!telegramResponse.ok) {
      console.error("RSVP: Telegram API error", await telegramResponse.text());
      return res.status(502).json({ error: "Telegram delivery failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("RSVP: Telegram request threw", err);
    return res.status(502).json({ error: "Telegram delivery failed" });
  }
}
