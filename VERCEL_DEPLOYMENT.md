# Vercel Deployment Guide

## ⚠️ Important Considerations

**State Persistence Issue:** The current implementation uses an in-memory `Map` to store pending Slack reviews. This **will not work** in Vercel's serverless environment because:
- Each function invocation is stateless
- The Map is lost between invocations
- When a user clicks "Approve" in Slack, it might hit a different function instance

**Solutions:**
1. **Use Vercel KV (Redis)** - Recommended for state storage
2. **Use a Database** - PostgreSQL, MongoDB, etc.
3. **Use Vercel Postgres** - Free tier available
4. **Bypass Slack Review in Production** - Create Linear issues directly

## Required Code Changes for State Storage

If you want to use Slack review on Vercel, you'll need to replace the in-memory Map with external storage. Here's what needs to change:

### Option 1: Use Vercel KV (Recommended)

1. Install Vercel KV:
```bash
npm install @vercel/kv
```

2. Update `src/services/slack/reviewer.ts` to use KV instead of Map

3. Add `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` to Vercel environment variables

### Option 2: Use Vercel Postgres

1. Enable Vercel Postgres in your project
2. Create a table for pending reviews
3. Update the reviewer service to use the database

## Deployment Steps

### 1. Install Vercel CLI (if not already installed)

```bash
npm i -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy

```bash
vercel
```

Or connect your GitHub repository in Vercel dashboard for automatic deployments.

### 4. Set Environment Variables

In Vercel dashboard → Your Project → Settings → Environment Variables, add:

- `FATHOM_WEBHOOK_SECRET`
- `GITHUB_TOKEN`
- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `OPENAI_API_KEY`
- `LINEAR_API_KEY`
- `LINEAR_TEAM_ID`
- `LINEAR_PROJECT_ID` (optional)
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `SLACK_CHANNEL_ID`
- `NODE_ENV=production`

### 5. Update Webhook URLs

After deployment, update:
- **Fathom:** `https://your-app.vercel.app/webhook/fathom`
- **Slack:** `https://your-app.vercel.app/slack/events`

## File Structure for Vercel

```
.
├── api/
│   └── index.ts          # Vercel serverless function entry point
├── src/
│   └── server.ts         # Express app (exports default)
├── vercel.json           # Vercel configuration
└── package.json
```

## Build Configuration

Vercel will:
1. Run `npm install`
2. Run `npm run build` (TypeScript compilation)
3. Deploy the `api/` folder as serverless functions

## Important Notes

1. **Function Timeout:** Set to 60 seconds in `vercel.json` (free tier allows 10s, Pro allows 60s)
2. **Cold Starts:** First request may be slower due to serverless cold starts
3. **State Management:** You MUST implement external state storage for Slack reviews to work
4. **Test Endpoints:** `/test/*` endpoints are disabled in production (only work when `NODE_ENV=development`)

## Recommended: Use Railway Instead

For this application, **Railway is recommended** because:
- ✅ Persistent server (no state issues)
- ✅ No code changes needed
- ✅ Simpler deployment
- ✅ Better for webhook servers
- ✅ Similar pricing

If you still want to use Vercel, implement state storage (KV or database) first.

