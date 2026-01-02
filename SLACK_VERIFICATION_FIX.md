# Fixing Slack URL Verification Error

## The Error
"Your URL didn't respond with the value of the challenge parameter"

## Root Cause
This error occurs when:
1. The server endpoint is not responding correctly to Slack's verification challenge
2. The server is crashing/failing in Vercel
3. The ExpressReceiver router is not mounted correctly

## Solution

The Slack Bolt `ExpressReceiver` should automatically handle URL verification challenges. However, there might be issues with:
1. **Server failing to start** - Check Vercel logs
2. **Environment variables missing** - Verify all Slack env vars are set in Vercel
3. **Router mounting** - The ExpressReceiver router should be mounted correctly

### Step 1: Check Vercel Logs

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project: `fathom-linear-integration`
3. Go to **Deployments** tab
4. Click on the latest deployment
5. Click **Functions** tab
6. Check the logs for errors

Common errors:
- Missing environment variables
- Server initialization errors
- Module import errors

### Step 2: Verify Environment Variables in Vercel

Ensure these are set in Vercel dashboard:
- `SLACK_BOT_TOKEN` (starts with `xoxb-`)
- `SLACK_SIGNING_SECRET`
- `SLACK_CHANNEL_ID` (starts with `C`)
- `KV_REST_API_URL` (if using KV)
- `KV_REST_API_TOKEN` (if using KV)

**Important:** After adding env vars, you MUST redeploy:
1. Go to **Deployments**
2. Click 3 dots (⋯) on latest deployment
3. Click **Redeploy**

### Step 3: Test the Endpoint

Try accessing the health endpoint first:
```bash
curl https://fathom-linear-integration.vercel.app/health
```

If this fails, the server isn't starting properly.

### Step 4: Verify Slack Configuration

The ExpressReceiver should automatically handle URL verification. The endpoint is:
```
https://fathom-linear-integration.vercel.app/slack/events
```

When Slack sends a verification challenge, the ExpressReceiver automatically:
1. Receives the challenge
2. Responds with the challenge value
3. Returns 200 OK

If this isn't working, the server is likely failing to initialize.

## Debugging Steps

1. **Check if server starts locally:**
   ```bash
   npm run dev
   ```
   If it fails locally, fix those errors first.

2. **Check Vercel build logs:**
   - Go to deployment → **Build Logs**
   - Look for TypeScript errors, build failures

3. **Check Vercel function logs:**
   - Go to deployment → **Functions** → View logs
   - Look for runtime errors

4. **Test locally with ngrok (if server works locally):**
   - Start server: `npm run dev`
   - Start ngrok: `ngrok http 3002`
   - Test Slack verification with ngrok URL

## Common Issues

### Issue 1: Server crashes on startup
**Symptom:** Health endpoint returns 500 error
**Fix:** Check Vercel logs for initialization errors, verify all env vars are set

### Issue 2: ExpressReceiver not handling challenge
**Symptom:** Challenge endpoint returns error
**Fix:** Ensure ExpressReceiver router is mounted correctly at `/slack/events`

### Issue 3: Missing environment variables
**Symptom:** Server fails to start, logs show missing env vars
**Fix:** Add all required env vars in Vercel dashboard and redeploy

### Issue 4: KV connection issues
**Symptom:** Server crashes when SlackReviewer initializes
**Fix:** Ensure KV env vars are set, or set `useKV=false` if not using KV

