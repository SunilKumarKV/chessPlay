require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID");
    process.exit(1);
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "♟️ ChessPlay direct Telegram test alert is working.",
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Telegram test failed:", data);
    process.exit(1);
  }
  console.log("Telegram test sent successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
