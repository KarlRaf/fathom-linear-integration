# Slack Integration Testing Plan

## Overview

You have two options for testing the Slack integration:
1. **Local testing with ngrok** (quick iteration, debugging)
2. **Deploy to Vercel first** (stable URL, production-like)

## Recommendation: Deploy to Vercel First ✅

**Why Vercel first:**
- ✅ Stable URL (no URL changes like ngrok free tier)
- ✅ Production-like environment (matches real deployment)
- ✅ No need to reconfigure Slack URLs later
- ✅ Easier to test end-to-end
- ✅ Better for testing Vercel KV integration

**When to use ngrok:**
- Quick debugging of specific issues
- Testing changes before deploying
- Development iteration

## Slack Configuration Required

The Slack integration needs two URL endpoints configured:

1. **Event Subscriptions URL:** `/slack/events`
   - Receives events from Slack (button clicks, etc.)
   - Full URL: `https://your-domain.vercel.app/slack/events`

2. **Interactivity URL:** `/slack/events` (same endpoint)
   - Handles button interactions (Approve/Reject)
   - Full URL: `https://your-domain.vercel.app/slack/events`

### Required Slack Events

The app uses these Slack features:
- **Interactive Components:** Button clicks for Approve/Reject
- **Bot Events:** None required (we only send messages, don't listen to events)

### Required Slack Scopes (OAuth)

Your Slack app needs these scopes:
- `chat:write` - Post messages to channels
- `chat:write.public` - Post to channels without being a member (optional)
- `channels:read` - Read channel info (if needed)

## Testing Steps

### Option 1: Deploy to Vercel (Recommended)

#### Step 1: Deploy to Vercel

1. **Set Environment Variables in Vercel:**
   - Go to your Vercel project dashboard
   - Settings → Environment Variables
   - Add all required variables (see SETUP.md)
   - Make sure to include:
     - `SLACK_BOT_TOKEN`
     - `SLACK_SIGNING_SECRET`
     - `SLACK_CHANNEL_ID`
     - `KV_REST_API_URL` (if using KV)
     - `KV_REST_API_TOKEN` (if using KV)
     - All other required env vars

2. **Deploy:**
   ```bash
   vercel --prod
   ```
   Or push to your main branch if connected to GitHub

3. **Get your deployment URL:**
   - Will be something like: `https://fathom-linear-integration.vercel.app`
   - Or your custom domain if configured

#### Step 2: Configure Slack App

1. **Go to Slack App Settings:**
   - https://api.slack.com/apps
   - Select your app

2. **Configure Event Subscriptions:**
   - Go to "Event Subscriptions" in left sidebar
   - Enable Events
   - Set Request URL: `https://your-domain.vercel.app/slack/events`
   - Slack will verify the URL (should show ✅ Verified)
   - **No Bot Events needed** (we only send messages)

3. **Configure Interactivity:**
   - Go to "Interactivity & Shortcuts" in left sidebar
   - Enable Interactivity
   - Set Request URL: `https://your-domain.vercel.app/slack/events`
   - Save Changes

4. **Install/Reinstall App to Workspace:**
   - Go to "Install App" in left sidebar
   - Click "Reinstall to Workspace" (if already installed)
   - Or "Install to Workspace" (if first time)
   - Authorize the requested scopes

#### Step 3: Test the Integration

1. **Test the recap message:**
   ```bash
   curl -X POST http://localhost:3002/test/test-recap \
     -H "Content-Type: application/json" \
     -d @mock-webhook-payload.json
   ```
   Or use the Vercel URL in production

2. **Test full flow (recap + Linear review):**
   ```bash
   curl -X POST https://your-domain.vercel.app/test/mock-webhook \
     -H "Content-Type: application/json" \
     -d @mock-webhook-payload.json
   ```
   (Note: `/test` endpoints are only available in development)

3. **Check Slack channel:**
   - Should see recap message posted immediately
   - Should see review message with Approve/Reject buttons
   - Click buttons to test approval/rejection

---

### Option 2: Local Testing with ngrok

#### Step 1: Start Local Server

```bash
npm run dev
```

Server runs on `http://localhost:3002` (or your PORT)

#### Step 2: Start ngrok

In a new terminal:
```bash
ngrok http 3002
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

⚠️ **Note:** Free ngrok URLs change each restart. For stable testing, consider:
- ngrok paid plan (fixed domain)
- Or just deploy to Vercel (easier)

#### Step 3: Configure Slack

1. **Event Subscriptions:**
   - URL: `https://your-ngrok-url.ngrok-free.app/slack/events`

2. **Interactivity:**
   - URL: `https://your-ngrok-url.ngrok-free.app/slack/events`

#### Step 4: Test

Same as Step 3 in Vercel option, but use ngrok URL.

---

## Expected Behavior

### Successful Test Flow:

1. **Send test webhook** (recap + review)
2. **Slack Channel receives:**
   - ✅ Recap message (informational, no buttons)
   - ✅ Review message with:
     - List of issues to be created
     - ✅ "Approve & Create" button (primary/green)
     - ❌ "Reject" button (danger/red)

3. **Click "Approve & Create":**
   - Message updates to show "✅ Approved"
   - Issues are created in Linear
   - Issues appear in Linear Triage view

4. **Click "Reject":**
   - Message updates to show "❌ Rejected"
   - No issues created in Linear

### Troubleshooting

**URL Verification Fails:**
- Check server is running
- Check URL is correct (HTTPS required)
- Check Slack signing secret matches
- Check server logs for errors

**Buttons Don't Work:**
- Verify Interactivity URL is set correctly
- Check Slack signing secret
- Check server logs for button click errors
- Verify bot has `chat:write` scope

**Messages Don't Appear:**
- Verify bot token is correct
- Verify channel ID is correct
- Check bot is invited to the channel
- Check server logs for Slack API errors

**Issues Not Created After Approval:**
- Check Linear API credentials
- Check Vercel KV is configured (if using)
- Check server logs for Linear API errors

