import "server-only";

/**
 * Optional instant alert on the owner's phone for every new order and payment, through a
 * Telegram bot (free). Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to turn it on; see README.
 * Never throws: an alert that fails must not break an order.
 */
export async function notifyOwner(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[notify] Telegram answered", res.status);
  } catch (e) {
    console.error("[notify] Telegram failed:", (e as Error).message);
  }
}
