# Telegram Sticker Bot (Cloudflare Worker)

## 🚀 Features
- Convert photo → sticker (.webp)
- Auto reply
- Works entirely on Cloudflare Worker

## 📌 Deployment
### 1. Install Wrangler
npm install -g wrangler

### 2. Login
wrangler login

### 3. Deploy
wrangler deploy

### 4. Set Env Variable
Cloudflare Dashboard → Workers → Settings → Variables:
BOT_TOKEN = your_telegram_bot_token

### 5. Set Telegram Webhook
Replace YOUR_BOT_TOKEN:

curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"YOUR_WORKER_URL\"}"

Done!
