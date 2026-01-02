# Slack Endpoint Troubleshooting

## Issue
Slack environment variables are set in Vercel, but `/slack/events` endpoint returns "Cannot POST /slack/events"

## Most Likely Cause: Deployment Needs Redeploy

Even if you've set environment variables in Vercel, **the current deployment was built before those variables were set**. You need to redeploy for the environment variables to be available to the running code.

## Solution Steps

### Step 1: Trigger a Redeploy

You have two options:

**Option A: Manual Redeploy (Fastest)**
1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select project: `fathom-linear-integration`
3. Go to **Deployments** tab
4. Click the 3 dots (⋯) on the latest deployment
5. Click **Redeploy**
6. Wait for deployment to complete

**Option B: Push a Commit**
```bash
# Make a small change (like adding a comment) and push
git commit --allow-empty -m "Trigger redeploy for Slack env vars"
git push origin testing
```

### Step 2: Verify Environment Variables

Double-check that these are set in Vercel:
1. Go to **Settings** → **Environment Variables**
2. Verify these exist:
   - `SLACK_BOT_TOKEN` (should start with `xoxb-`, not a placeholder)
   - `SLACK_SIGNING_SECRET` (should not be a placeholder)
   - `SLACK_CHANNEL_ID` (should start with `C`, not a placeholder like `C1234567890`)

**Important:** Make sure these are **not** placeholder values! They must be real values from your Slack app.

### Step 3: Check Vercel Function Logs

After redeploy, check for initialization errors:
1. Go to **Deployments** → Latest deployment
2. Click **Functions** tab
3. Click on `api/index.ts`
4. Check **Logs** section
5. Look for:
   - "Slack reviewer initialized" (good sign)
   - "Slack credentials not provided" (env vars not set correctly)
   - Any error messages during initialization

### Step 4: Test the Endpoint Again

After redeploy, test:
```bash
curl -X POST https://fathom-linear-integration.vercel.app/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}'
```

**Expected:** Should return `test123` (the challenge value)

**If still fails:** Check the logs from Step 3

## Why This Happens

The Slack router is only mounted when:
1. All three Slack env vars are set and non-empty
2. `SlackReviewer` initializes successfully

If any env var is missing or if initialization fails, the router won't be mounted, and you'll get "Cannot POST /slack/events".

## Common Issues

### Issue 1: Placeholder Values
**Symptom:** Env vars are set but contain placeholder values
**Fix:** Update with real values from Slack app settings

### Issue 2: Missing KV Variables (if using KV)
**Symptom:** SlackReviewer tries to use KV but vars aren't set
**Fix:** Either set `KV_REST_API_URL` and `KV_REST_API_TOKEN`, or the code will use in-memory (which won't work in serverless)

### Issue 3: Initialization Error
**Symptom:** Error in Vercel logs during SlackReviewer initialization
**Fix:** Check logs, fix the underlying error (invalid token, etc.)

## Verification Checklist

Before testing Slack URL verification:
- [ ] All Slack env vars are set in Vercel (not placeholders)
- [ ] Deployment has been redeployed after setting env vars
- [ ] Vercel function logs show "Slack reviewer initialized" (not errors)
- [ ] Health endpoint works: `curl https://fathom-linear-integration.vercel.app/health`
- [ ] Slack endpoint responds to challenge: `curl -X POST ... /slack/events -d '{"type":"url_verification","challenge":"test"}'`

