# Slack URL Verification Debugging Steps

## Current Error
"Your URL didn't respond with the value of the challenge parameter"

## Why This Happens
Your Vercel deployment is failing (health check returns error), so Slack can't verify the URL. The Slack Bolt ExpressReceiver handles URL verification automatically, but the server must be running first.

## Immediate Actions

### 1. Check Vercel Deployment Status

Go to: https://vercel.com/dashboard
1. Select project: `fathom-linear-integration`
2. Go to **Deployments** tab
3. Click on the latest deployment
4. Check the status:
   - ✅ **Ready** = Deployment successful
   - ❌ **Error** = Deployment failed (check build logs)
   - ⚠️ **Building** = Still deploying

### 2. Check Vercel Function Logs

1. In the deployment, click **Functions** tab
2. Click on `api/index.ts`
3. Check the **Logs** section
4. Look for errors like:
   - Missing environment variables
   - Import errors
   - Runtime errors
   - Initialization failures

### 3. Verify Environment Variables in Vercel

**Critical:** All these must be set in Vercel dashboard:

**Required (app won't start without these):**
- `FATHOM_WEBHOOK_SECRET`
- `GITHUB_TOKEN`
- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `OPENAI_API_KEY`
- `LINEAR_API_KEY`
- `LINEAR_TEAM_ID`

**Slack (required for Slack features):**
- `SLACK_BOT_TOKEN` (starts with `xoxb-`)
- `SLACK_SIGNING_SECRET`
- `SLACK_CHANNEL_ID` (starts with `C`)

**KV (required if using Slack review):**
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

**Optional:**
- `LINEAR_STATE_ID` (for Triage state)
- `PROJECT_NAME`
- `LINEAR_ASSIGNEE`

**After adding/updating env vars:**
1. Go to **Deployments**
2. Click 3 dots (⋯) on latest deployment
3. Click **Redeploy** (or push new commit)

### 4. Test Health Endpoint

```bash
curl https://fathom-linear-integration.vercel.app/health
```

**Expected:** `{"status":"ok","timestamp":"..."}`

**If error:** Server isn't starting - check logs above

### 5. Test Slack Endpoint Directly

Once health endpoint works, test Slack endpoint:

```bash
curl -X POST https://fathom-linear-integration.vercel.app/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}'
```

**Expected:** `test123` (the challenge value echoed back)

**If error:** Check Vercel function logs for Slack-specific errors

## Common Issues & Fixes

### Issue: Server crashes on startup
**Symptoms:**
- Health endpoint returns 500
- Function logs show initialization errors

**Fixes:**
1. Check all required env vars are set
2. Check build logs for TypeScript errors
3. Check function logs for runtime errors
4. Verify all dependencies are in `package.json`

### Issue: Missing environment variables
**Symptoms:**
- Function logs show "Missing required environment variables"
- Server fails to start

**Fixes:**
1. Add missing env vars in Vercel dashboard
2. Redeploy after adding env vars
3. Verify env var names match exactly (case-sensitive)

### Issue: KV connection errors
**Symptoms:**
- Function logs show KV connection errors
- Server crashes when SlackReviewer initializes

**Fixes:**
1. Ensure `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set
2. Verify KV database is linked to project in Vercel
3. Check KV credentials are correct

### Issue: ExpressReceiver not handling challenge
**Symptoms:**
- Health endpoint works
- Slack endpoint returns error
- Challenge verification fails

**Fixes:**
1. Verify Slack signing secret is correct
2. Check ExpressReceiver is mounted at `/slack/events`
3. Verify router is properly exported

## Verification Checklist

Before configuring Slack URLs, ensure:

- [ ] Health endpoint returns OK: `curl https://fathom-linear-integration.vercel.app/health`
- [ ] All required env vars are set in Vercel
- [ ] Latest deployment status is "Ready"
- [ ] No errors in function logs
- [ ] Build completed successfully
- [ ] Slack env vars are set (if using Slack)
- [ ] KV env vars are set (if using KV)

## Once Server is Working

1. **Configure Slack Event Subscriptions:**
   - URL: `https://fathom-linear-integration.vercel.app/slack/events`
   - Should show ✅ "Verified"

2. **Configure Slack Interactivity:**
   - URL: `https://fathom-linear-integration.vercel.app/slack/events`
   - Save changes

3. **Test:**
   - Send a test webhook
   - Check Slack channel for messages

