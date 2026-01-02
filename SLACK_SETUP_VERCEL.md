# Slack Setup for Vercel Deployment

Your app is deployed at: **https://fathom-linear-integration.vercel.app**

## Step 1: Verify Environment Variables in Vercel

Make sure these environment variables are set in your Vercel project:

1. Go to: https://vercel.com/dashboard
2. Select your project: `fathom-linear-integration`
3. Go to **Settings** → **Environment Variables**
4. Verify these are set:
   - `SLACK_BOT_TOKEN` (starts with `xoxb-`)
   - `SLACK_SIGNING_SECRET`
   - `SLACK_CHANNEL_ID` (starts with `C`)
   - `KV_REST_API_URL` (if using Vercel KV)
   - `KV_REST_API_TOKEN` (if using Vercel KV)
   - All other required variables (Fathom, GitHub, OpenAI, Linear)

5. **After adding/updating variables:**
   - Go to **Deployments** tab
   - Click the 3 dots (⋯) on the latest deployment
   - Click **Redeploy** to apply new environment variables

## Step 2: Configure Slack App

### A. Event Subscriptions

1. Go to: https://api.slack.com/apps
2. Select your Slack app
3. Go to **Event Subscriptions** (left sidebar)
4. Toggle **Enable Events** to ON
5. Set **Request URL** to:
   ```
   https://fathom-linear-integration.vercel.app/slack/events
   ```
6. Slack will verify the URL automatically (should show ✅ "Verified")
7. **Important:** You do NOT need to subscribe to any Bot Events
   - We only send messages, we don't listen to events
   - Leave "Subscribe to bot events" section empty
8. Click **Save Changes**

### B. Interactivity & Shortcuts

1. Go to **Interactivity & Shortcuts** (left sidebar)
2. Toggle **Interactivity** to ON
3. Set **Request URL** to:
   ```
   https://fathom-linear-integration.vercel.app/slack/events
   ```
4. Click **Save Changes**

### C. Reinstall App (if needed)

1. Go to **Install App** (left sidebar)
2. Click **Reinstall to Workspace** (or **Install to Workspace** if first time)
3. Authorize the requested permissions
4. Copy the new **Bot User OAuth Token** if it changed
   - Update `SLACK_BOT_TOKEN` in Vercel if token changed

## Step 3: Verify Bot Permissions

Go to **OAuth & Permissions** and verify these scopes are enabled:
- ✅ `chat:write` - Required to post messages
- ✅ `chat:write.public` - Optional (allows posting to public channels without being a member)
- ✅ `channels:read` - Optional (for reading channel info)

## Step 4: Invite Bot to Channel

1. In Slack, go to your review channel (the one matching `SLACK_CHANNEL_ID`)
2. Type `/invite @YourBotName` (or use the channel's "Integrations" menu)
3. The bot needs to be in the channel to post messages

## Step 5: Test the Integration

### Test 1: Health Check
```bash
curl https://fathom-linear-integration.vercel.app/health
```
Should return: `{"status":"ok","timestamp":"..."}`

### Test 2: Test Recap Generation (Local only)
```bash
curl -X POST http://localhost:3002/test/test-recap \
  -H "Content-Type: application/json" \
  -d @mock-webhook-payload.json
```

### Test 3: Full Flow Test (Local only - /test endpoints not available in production)
For production, you'll need to use the actual Fathom webhook endpoint:
```
POST https://fathom-linear-integration.vercel.app/webhook/fathom
```

**Note:** `/test` endpoints are only available in development mode. For production testing, you'll need to:
- Configure Fathom webhook to point to your Vercel URL
- Send a real webhook from Fathom
- Or test locally first, then deploy

## Expected Behavior

When a webhook is received (from Fathom or test endpoint):

1. **Recap Message** appears in Slack channel (informational, no buttons)
2. **Review Message** appears with:
   - List of issues to be created
   - ✅ "Approve & Create" button
   - ❌ "Reject" button
3. **Click "Approve & Create":**
   - Message updates to "✅ Approved"
   - Issues are created in Linear (in Triage state)
4. **Click "Reject":**
   - Message updates to "❌ Rejected"
   - No issues created

## Troubleshooting

### URL Verification Fails
- ✅ Check Vercel deployment is live: `curl https://fathom-linear-integration.vercel.app/health`
- ✅ Check the URL is exactly: `https://fathom-linear-integration.vercel.app/slack/events`
- ✅ Check Slack signing secret matches in Vercel env vars
- ✅ Check Vercel logs for errors

### Buttons Don't Work
- ✅ Verify Interactivity URL is set correctly
- ✅ Check Slack signing secret is correct in Vercel
- ✅ Check Vercel function logs for button click errors
- ✅ Verify bot has `chat:write` scope

### Messages Don't Appear
- ✅ Verify bot token is correct in Vercel
- ✅ Verify channel ID is correct in Vercel
- ✅ Check bot is invited to the channel
- ✅ Check Vercel function logs for Slack API errors
- ✅ Verify environment variables were applied (redeploy if needed)

### Issues Not Created After Approval
- ✅ Check Linear API credentials in Vercel
- ✅ Check Vercel KV is configured (if using)
- ✅ Check Vercel function logs for Linear API errors

## Quick Checklist

- [ ] All environment variables set in Vercel
- [ ] Vercel deployment is live and healthy
- [ ] Event Subscriptions URL configured: `https://fathom-linear-integration.vercel.app/slack/events`
- [ ] Interactivity URL configured: `https://fathom-linear-integration.vercel.app/slack/events`
- [ ] App reinstalled to workspace (if URLs changed)
- [ ] Bot invited to the review channel
- [ ] Test webhook sent (or real Fathom webhook configured)
- [ ] Recap message appears in Slack
- [ ] Review message appears with buttons
- [ ] Approve button creates issues in Linear
- [ ] Reject button cancels issue creation

