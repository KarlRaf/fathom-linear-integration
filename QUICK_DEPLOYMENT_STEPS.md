# Quick Deployment Steps for Vercel

Your project is deployed as: **fathom-linear-integration**

## ✅ Step 1: Deployment Complete
- Project is deployed to Vercel
- URL: `https://fathom-linear-integration.vercel.app` (or your custom domain)

## 📋 Step 2: Set Environment Variables

Go to: **Vercel Dashboard → fathom-linear-integration → Settings → Environment Variables**

Add these variables (select "Production", "Preview", and "Development"):

### Required Variables

```bash
NODE_ENV=production

FATHOM_WEBHOOK_SECRET=your_webhook_secret_from_fathom

GITHUB_TOKEN=github_pat_your_token_here
GITHUB_REPO_OWNER=KarlRaf
GITHUB_REPO_NAME=the-revenue-architects

OPENAI_API_KEY=sk-your_openai_api_key

LINEAR_API_KEY=lin_api_your_linear_api_key
LINEAR_TEAM_ID=your_linear_team_id
LINEAR_PROJECT_ID=your_linear_project_id  # Optional
```

### Optional (if using Slack Review)

```bash
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_CHANNEL_ID=C1234567890

# Vercel KV (if using Slack - auto-set when KV is linked)
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
```

**After adding variables:**
- Redeploy the project (or wait for automatic redeploy)
- Variables are available after next deployment

## 🗄️ Step 3: Set up Vercel KV (if using Slack review)

1. Go to: **Vercel Dashboard → fathom-linear-integration → Storage**
2. Click **Create Database** → Select **KV**
3. Name it: `fathom-linear-kv` (or any name)
4. Select region closest to you
5. Click **Create**
6. The KV database is automatically linked and env vars are set

See [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md) for detailed instructions.

## ✅ Step 4: Test Health Endpoint

After environment variables are set and redeployed:

```bash
curl https://fathom-linear-integration.vercel.app/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-12-31T...Z"}
```

## 🔗 Step 5: Update Webhook URLs

### Fathom Webhook

1. Go to your Fathom dashboard
2. Settings → Integrations → Webhooks
3. Add/Update webhook URL:
   ```
   https://fathom-linear-integration.vercel.app/webhook/fathom
   ```
4. Set webhook secret (must match `FATHOM_WEBHOOK_SECRET` env var)

### Slack Events URL (if using Slack)

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your Slack app
3. Features → Event Subscriptions
4. Request URL:
   ```
   https://fathom-linear-integration.vercel.app/slack/events
   ```
5. Slack will verify the URL (make sure deployment is live)
6. Enable Interactive Components

## 🚀 Step 6: Redeploy (if needed)

After setting environment variables:
- Vercel will auto-redeploy, OR
- Manually trigger: **Deployments tab → Redeploy**

## ✅ Step 7: Test End-to-End

1. Send a test webhook from Fathom
2. Check Vercel function logs for any errors
3. Verify GitHub transcript was created
4. Verify Linear issues were created (or Slack review posted)

## 📊 Monitor

- **Logs:** Vercel Dashboard → Deployments → Select deployment → Functions → View logs
- **Health:** `curl https://fathom-linear-integration.vercel.app/health`

## 🆘 Troubleshooting

- Check function logs in Vercel dashboard
- Verify all environment variables are set
- Check KV is linked (if using Slack)
- Verify webhook URLs are correct

## 📚 Full Documentation

- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Complete deployment guide
- [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md) - KV setup guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Full checklist

