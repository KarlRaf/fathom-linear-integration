# Deployment Information

## Production URL
**Domain:** `fathom-linear-integration-production.up.railway.app`

## Webhook URLs

### Fathom Webhook
**URL:** `https://fathom-linear-integration-production.up.railway.app/webhook/fathom`

### Slack Webhooks
**Event Subscriptions URL:** `https://fathom-linear-integration-production.up.railway.app/slack/events`

**Interactivity URL:** `https://fathom-linear-integration-production.up.railway.app/slack/events`

### Health Check
**URL:** `https://fathom-linear-integration-production.up.railway.app/health`

## Next Steps

1. **Update Fathom Webhook Settings:**
   - Go to Fathom Settings > API Access > Manage Webhooks
   - Update the Destination URL to: `https://fathom-linear-integration-production.up.railway.app/webhook/fathom`

2. **Update Slack App Settings:**
   - Go to https://api.slack.com/apps
   - Select your app
   - **Event Subscriptions:**
     - Update Request URL to: `https://fathom-linear-integration-production.up.railway.app/slack/events`
   - **Interactivity & Shortcuts:**
     - Update Request URL to: `https://fathom-linear-integration-production.up.railway.app/slack/events`

3. **Test the Deployment:**
   - Check health: https://fathom-linear-integration-production.up.railway.app/health
   - Should return: `{"status":"ok","timestamp":"..."}`

## Environment Variables

Make sure all environment variables are set in Railway:
- `FATHOM_WEBHOOK_SECRET`
- `GITHUB_TOKEN`
- `GITHUB_REPO_OWNER` (should be: `KarlRaf`)
- `GITHUB_REPO_NAME` (should be: `the-revenue-architects`)
- `OPENAI_API_KEY`
- `LINEAR_API_KEY`
- `LINEAR_TEAM_ID`
- `LINEAR_PROJECT_ID` (optional)
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `SLACK_CHANNEL_ID`
- `NODE_ENV` (should be: `production`)
- `PORT` (Railway sets this automatically)

