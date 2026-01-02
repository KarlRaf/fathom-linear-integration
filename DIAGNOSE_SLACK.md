# Diagnosing Slack Endpoint Issue

## Current Status: ❌ Not Working

- ✅ Health endpoint works: Server is running
- ❌ Slack endpoint not mounted: Route doesn't exist

## What This Means

The `/slack/events` route is only mounted when `SlackReviewer` successfully initializes. Since the route doesn't exist, `SlackReviewer` is **not** being initialized.

## Diagnosis Steps

### Step 1: Check Vercel Function Logs

1. Go to: https://vercel.com/dashboard
2. Select: `fathom-linear-integration`
3. **Deployments** → Latest deployment
4. **Functions** → `api/index.ts`
5. **Logs** tab

**Look for:**
- ✅ `"Slack reviewer initialized"` = Good (but route still not working = different issue)
- ❌ `"Slack credentials not provided"` = Env vars not set or empty
- ❌ Any error messages = Initialization failed

### Step 2: Verify Environment Variables

In Vercel Dashboard → Settings → Environment Variables, verify:

**SLACK_BOT_TOKEN:**
- ✅ Should start with `xoxb-`
- ❌ NOT `xoxb-your-slack-bot-token` (placeholder)
- ❌ NOT empty

**SLACK_SIGNING_SECRET:**
- ✅ Should be a long random string
- ❌ NOT `your_slack_signing_secret` (placeholder)
- ❌ NOT empty

**SLACK_CHANNEL_ID:**
- ✅ Should start with `C` (e.g., `C01234ABCDE`)
- ❌ NOT `C1234567890` (placeholder)
- ❌ NOT empty

### Step 3: Redeploy After Setting Env Vars

**Critical:** Even if env vars are set, you MUST redeploy:
1. **Deployments** → 3 dots (⋯) → **Redeploy**
2. Wait for deployment to complete
3. Test endpoint again

### Step 4: Test Endpoint Again

After redeploy and verifying logs:
```bash
curl -X POST https://fathom-linear-integration.vercel.app/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}'
```

**Expected:** `test123` (the challenge value)
**If still fails:** Check logs from Step 1

## Code Logic

The Slack router is only mounted if:

```typescript
if (config.slack.botToken && config.slack.signingSecret && config.slack.channelId) {
  slackReviewer = new SlackReviewer(...);
  app.use('/slack/events', slackReviewer.getRouter());
}
```

If any of these are empty/undefined, the router won't be mounted.

## Most Common Issues

1. **Placeholder values** - Env vars set but contain placeholder text
2. **No redeploy** - Env vars set but deployment not redeployed
3. **Initialization error** - SlackReviewer constructor throws error (check logs)
4. **KV vars missing** - If using KV, need `KV_REST_API_URL` and `KV_REST_API_TOKEN`

## Next Steps

1. Check Vercel function logs (Step 1)
2. Verify env vars are real values (Step 2)
3. Redeploy if needed (Step 3)
4. Test again (Step 4)
5. Share what you find in the logs!

