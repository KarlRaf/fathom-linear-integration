# Vercel Deployment Checklist

Use this checklist to ensure a successful deployment to Vercel.

## Pre-Deployment

- [ ] Code is pushed to GitHub repository
- [ ] All tests pass locally
- [ ] `npm run build` succeeds without errors
- [ ] TypeScript compilation works (`npm run type-check`)

## Vercel Project Setup

- [ ] Vercel account created
- [ ] Project imported from GitHub (or CLI project created)
- [ ] Build settings configured correctly:
  - [ ] Framework: Other
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: (empty)
  - [ ] Install Command: `npm install`
  - [ ] Root Directory: `./`

## Environment Variables

### Required Variables
- [ ] `NODE_ENV=production`
- [ ] `FATHOM_WEBHOOK_SECRET`
- [ ] `GITHUB_TOKEN`
- [ ] `GITHUB_REPO_OWNER`
- [ ] `GITHUB_REPO_NAME`
- [ ] `OPENAI_API_KEY`
- [ ] `LINEAR_API_KEY`
- [ ] `LINEAR_TEAM_ID`
- [ ] `LINEAR_PROJECT_ID` (optional)

### Optional Variables (if using Slack)
- [ ] `SLACK_BOT_TOKEN`
- [ ] `SLACK_SIGNING_SECRET`
- [ ] `SLACK_CHANNEL_ID`

### Vercel KV Variables (if using Slack review)
- [ ] `KV_REST_API_URL` (auto-set when KV is linked)
- [ ] `KV_REST_API_TOKEN` (auto-set when KV is linked)

**Note:** Apply variables to Production (and Preview/Development if needed)

## Vercel KV Setup (if using Slack review)

- [ ] KV database created in Vercel dashboard
- [ ] KV database linked to project
- [ ] KV environment variables are visible in project settings
- [ ] See [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md) for detailed steps

## Initial Deployment

- [ ] Deploy to Vercel (via dashboard or `vercel --prod`)
- [ ] Build succeeds without errors
- [ ] Deployment URL is available
- [ ] Health check works: `curl https://your-app.vercel.app/health`

## Post-Deployment Configuration

### Fathom Webhook
- [ ] Fathom webhook URL updated: `https://your-app.vercel.app/webhook/fathom`
- [ ] Webhook secret matches `FATHOM_WEBHOOK_SECRET` env var
- [ ] Webhook is active in Fathom dashboard

### Slack Configuration (if using Slack)
- [ ] Slack Events URL updated: `https://your-app.vercel.app/slack/events`
- [ ] Interactive Components enabled in Slack app
- [ ] Bot has required scopes/permissions
- [ ] Bot is invited to the channel specified in `SLACK_CHANNEL_ID`

## Testing

- [ ] Health endpoint returns 200 OK
- [ ] Test webhook from Fathom (if possible)
- [ ] Verify GitHub transcript logging works
- [ ] Verify Linear issue creation works (if no Slack)
- [ ] Verify Slack review flow works (if using Slack)
- [ ] Check logs for any errors

## Monitoring

- [ ] Monitor deployment logs in Vercel dashboard
- [ ] Set up alerts (optional)
- [ ] Check function execution times
- [ ] Monitor KV usage (if using Slack)

## Documentation

- [ ] Deployment URL documented
- [ ] Team members have access to Vercel project
- [ ] Environment variables documented (securely)

## Rollback Plan

- [ ] Know how to rollback to previous deployment if needed
- [ ] Understand how to redeploy previous version in Vercel dashboard

## Quick Health Check Command

```bash
curl https://your-app.vercel.app/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-12-31T...Z"}
```

## Common Issues to Watch For

- [ ] Function timeout errors (need Pro tier for 60s)
- [ ] Environment variables not set correctly
- [ ] Slack KV connection issues
- [ ] GitHub token permissions
- [ ] Webhook signature verification failures

## Need Help?

- Check [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed guide
- Check [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md) for KV setup
- Check Vercel logs in dashboard
- Review deployment build logs for errors

