# Webhook URLs for Local Testing

## Steps to Get Your ngrok URL

1. **Start your local server** (in Terminal 1):
   ```bash
   npm run dev
   ```

2. **Start ngrok** (in Terminal 2):
   ```bash
   ngrok http 3000
   ```

3. **Copy your ngrok URL** - You'll see something like:
   ```
   Forwarding: https://abc123-def456.ngrok-free.app -> http://localhost:3000
   ```

## Update These URLs (Replace YOUR_NGROK_URL with your actual ngrok URL)

### Fathom Webhook
1. Go to: https://app.fathom.ai/settings/api
2. Navigate to: **API Access** → **Manage** → **Webhooks**
3. Edit your webhook or create a new one
4. Update **Destination URL** to:
   ```
   https://YOUR_NGROK_URL.ngrok-free.app/webhook/fathom
   ```
5. Enable: ✅ Transcript, ✅ Summary, ✅ Action Items
6. Save

### Slack App - Event Subscriptions
1. Go to: https://api.slack.com/apps
2. Select your app
3. Go to: **Event Subscriptions** (left sidebar)
4. Enable Events: ✅ ON
5. Update **Request URL** to:
   ```
   https://YOUR_NGROK_URL.ngrok-free.app/slack/events
   ```
6. Click "Save Changes"

### Slack App - Interactivity
1. Still in your Slack app settings
2. Go to: **Interactivity & Shortcuts** (left sidebar)
3. Enable Interactivity: ✅ ON
4. Update **Request URL** to:
   ```
   https://YOUR_NGROK_URL.ngrok-free.app/slack/events
   ```
5. Click "Save Changes"

## Testing

After updating the URLs:
1. Test health endpoint: `https://YOUR_NGROK_URL.ngrok-free.app/health`
2. Record a test meeting in Fathom
3. Check your terminal logs
4. Check Slack channel for review requests

## Remember to Switch Back!

When done testing locally, update the webhooks back to your Railway URL:
- Fathom: `https://fathom-linear-integration-production.up.railway.app/webhook/fathom`
- Slack: `https://fathom-linear-integration-production.up.railway.app/slack/events`

