# Local Testing Guide

## Prerequisites

1. All environment variables set in your `.env` file
2. ngrok installed (for exposing local server to the internet)

## Step 1: Install ngrok

```bash
# On macOS with Homebrew:
brew install ngrok

# Or download from: https://ngrok.com/download
```

After installation, you can optionally sign up for a free account at https://ngrok.com to get a fixed domain.

## Step 2: Start Your Local Server

In your project directory:

```bash
npm run dev
```

Your server will start on `http://localhost:3000` (or whatever PORT you set in `.env`).

You should see:
```
Express server started on port 3000
Fathom webhook endpoint: http://localhost:3000/webhook/fathom
Slack events endpoint: http://localhost:3000/slack/events
Health check: http://localhost:3000/health
```

## Step 3: Expose Local Server with ngrok

Open a **new terminal window** and run:

```bash
ngrok http 3000
```

ngrok will give you a public URL like:
```
Forwarding: https://abc123-def456.ngrok-free.app -> http://localhost:3000
```

**Copy this URL** - you'll need it for webhook configuration.

⚠️ **Note:** The free ngrok URL changes each time you restart ngrok. If you need a fixed URL, sign up for a free ngrok account.

## Step 4: Test Health Endpoint

Visit your ngrok URL in a browser:
```
https://your-ngrok-url.ngrok-free.app/health
```

Should return:
```json
{"status":"ok","timestamp":"2024-12-31T..."}
```

## Step 5: Configure Webhooks with ngrok URL

### Fathom Webhook

1. Go to Fathom Settings > API Access > Manage Webhooks
2. Create or edit your webhook
3. Set Destination URL to:
   ```
   https://your-ngrok-url.ngrok-free.app/webhook/fathom
   ```
4. Enable: Transcript, Summary, Action Items
5. Save

### Slack App Settings

1. Go to https://api.slack.com/apps
2. Select your app
3. **Event Subscriptions:**
   - Enable Events
   - Set Request URL to: `https://your-ngrok-url.ngrok-free.app/slack/events`
   - Subscribe to bot events (if needed)
   - Save Changes
4. **Interactivity & Shortcuts:**
   - Enable Interactivity
   - Set Request URL to: `https://your-ngrok-url.ngrok-free.app/slack/events`
   - Save Changes

## Step 6: Test the Flow

1. **Test Fathom Webhook:**
   - Record a test meeting in Fathom (2+ minutes)
   - Wait for the meeting to process
   - Check your terminal logs for processing messages
   - Check your Slack channel for review requests
   - Check GitHub repository for logged transcript

2. **Test Slack Review:**
   - When a review appears in Slack, click "Approve & Create"
   - Check Linear for created issues
   - Verify the Slack message updates

3. **Check Logs:**
   - Watch your terminal for processing logs
   - Check for any errors

## Troubleshooting

### ngrok URL not working
- Make sure your local server is running on port 3000
- Verify ngrok is forwarding to the correct port
- Try restarting ngrok

### Webhook not received
- Verify the ngrok URL is correct in Fathom/Slack settings
- Check that your local server is running
- Look at terminal logs for incoming requests
- Make sure webhook signature verification is working (check your FATHOM_WEBHOOK_SECRET)

### Slack events not working
- Verify the Slack Request URL matches your ngrok URL exactly
- Make sure Interactivity and Event Subscriptions are both enabled
- Check that your bot is invited to the channel
- Verify SLACK_SIGNING_SECRET is correct

### Environment Variables
- Make sure all required variables are in your `.env` file
- Double-check API keys are correct
- Verify GITHUB_REPO_OWNER and GITHUB_REPO_NAME match your repository

## Quick Test Checklist

- [ ] Local server running (`npm run dev`)
- [ ] ngrok tunnel active
- [ ] Health endpoint returns OK
- [ ] Fathom webhook URL updated
- [ ] Slack app URLs updated
- [ ] Test meeting recorded in Fathom
- [ ] Transcript appears in GitHub
- [ ] Review appears in Slack
- [ ] Issues created in Linear after approval

## Alternative to ngrok

If you prefer not to use ngrok, you can also use:

**localtunnel (no signup required):**
```bash
npx localtunnel --port 3000
```

**cloudflared (Cloudflare Tunnel):**
```bash
brew install cloudflare/cloudflare/cloudflared
cloudflared tunnel --url http://localhost:3000
```

