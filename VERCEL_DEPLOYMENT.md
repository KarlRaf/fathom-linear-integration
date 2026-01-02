# Vercel Deployment Guide

Complete guide for deploying the Fathom to Linear integration app on Vercel.

## ✅ Current Implementation Status

**Vercel KV Integration:** ✅ **COMPLETE**
- SlackReviewer now uses Vercel KV for state persistence
- Works in serverless environment
- No code changes needed for deployment

**Domain-based Folder Structure:** ✅ **COMPLETE**
- GitHub logging organizes transcripts by domain
- Structure: `call_transcript/{domain}/{date}/{id}.json`

## Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional, for CLI deployment):
   ```bash
   npm i -g vercel
   ```
3. **Vercel KV Database** (required if using Slack review) - See [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md)

## Deployment Methods

### Option 1: GitHub Integration (Recommended)

1. **Push your code to GitHub** (if not already done)
   ```bash
   git push origin main  # or your deployment branch
   ```

2. **Import Project in Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your repository
   - Vercel will auto-detect the settings

3. **Configure Build Settings:**
   - Framework Preset: Other
   - Build Command: `npm run build` (default)
   - Output Directory: Leave empty (not used for serverless)
   - Install Command: `npm install`
   - Root Directory: `./` (default)

4. **Set Environment Variables** (see below)

5. **Deploy:** Click "Deploy"

### Option 2: Vercel CLI

1. **Login:**
   ```bash
   vercel login
   ```

2. **Deploy:**
   ```bash
   vercel
   ```
   Follow the prompts to link your project.

3. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

## Environment Variables

Set these in **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Required Variables

```bash
# Server
NODE_ENV=production

# Fathom
FATHOM_WEBHOOK_SECRET=your_webhook_secret_from_fathom

# GitHub
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_REPO_OWNER=your_username
GITHUB_REPO_NAME=your_repo_name

# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key

# Linear
LINEAR_API_KEY=lin_api_your_linear_api_key
LINEAR_TEAM_ID=your_linear_team_id
LINEAR_PROJECT_ID=your_linear_project_id  # Optional
```

### Optional Variables (for Slack Review)

```bash
# Slack
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_CHANNEL_ID=C1234567890
```

### Vercel KV Variables (required if using Slack review)

These are automatically set when you link a KV database to your project. See [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md) for setup instructions.

```bash
KV_REST_API_URL=https://your-kv-instance.vercel-storage.com
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_URL=redis://your-kv-instance.vercel-storage.com:6379  # Optional
```

**Note:** Apply environment variables to:
- ✅ Production
- ✅ Preview (optional, for testing)
- ✅ Development (optional, for local development)

## Project Structure

```
.
├── api/
│   └── index.ts          # Vercel serverless function entry point
├── src/
│   ├── server.ts         # Express app (exports default)
│   └── ...
├── vercel.json           # Vercel configuration
└── package.json
```

## Configuration Details

### vercel.json

- **Rewrites:** All routes (`/*`) are routed to `/api` (the Express serverless function)
- **Functions:** 
  - `api/index.ts` is the serverless function
  - `maxDuration: 60` seconds (Pro plan required, free tier is 10s)
  - `memory: 1024` MB
- **Build:** Runs `npm run build` to compile TypeScript

### Serverless Function

The `api/index.ts` file exports the Express app:

```typescript
import app from '../src/server';
export default app;
```

Vercel automatically handles:
- TypeScript compilation (on-the-fly)
- Request routing to Express routes
- Response handling

## API Endpoints

After deployment, your endpoints will be:

```
POST https://your-app.vercel.app/webhook/fathom
  - Receives Fathom webhooks
  - Verifies signature
  - Processes transcript

POST https://your-app.vercel.app/slack/events  (if Slack configured)
  - Receives Slack interactions
  - Handles review approvals/rejections

GET https://your-app.vercel.app/health
  - Health check endpoint
```

## Update Webhook URLs

After deployment, update these URLs in their respective services:

### 1. Fathom Webhook URL

In your Fathom dashboard:
- Go to Settings → Integrations → Webhooks
- Add/Update webhook URL: `https://your-app.vercel.app/webhook/fathom`
- Set webhook secret (must match `FATHOM_WEBHOOK_SECRET` env var)

### 2. Slack Events URL (if using Slack)

In your Slack App settings:
- Go to Features → Event Subscriptions
- Request URL: `https://your-app.vercel.app/slack/events`
- Enable interactive components
- Subscribe to bot events:
  - `message.channels` (if needed)
  - Event subscriptions for button clicks are handled automatically

## Build & Deployment Process

Vercel will:

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Build:**
   ```bash
   npm run build
   ```
   This compiles TypeScript to JavaScript in the `dist/` folder.

3. **Deploy:**
   - Packages the `api/` folder as serverless functions
   - Makes the function available at your domain
   - Sets up automatic deployments on git push (if GitHub integration enabled)

## Important Notes

### Function Timeout

- **Free Tier:** 10 seconds maximum
- **Pro Tier:** 60 seconds (configured in `vercel.json`)
- **Enterprise:** Up to 900 seconds

For this app, Pro tier is recommended due to:
- AI processing (OpenAI API calls)
- Multiple API calls (GitHub, Linear)
- Complex processing logic

### Cold Starts

- First request may take 1-3 seconds (cold start)
- Subsequent requests are faster (warm functions)
- Consider Pro tier for better cold start performance

### State Persistence

✅ **Implemented:** Vercel KV for Slack review state
- Reviews stored in Redis-backed KV
- Works across all serverless function invocations
- Automatic cleanup with TTL (30 minutes)

### Test Endpoints

⚠️ **Disabled in Production:**
- `/test/*` endpoints only work when `NODE_ENV=development`
- These are automatically disabled in production

### Environment Variables Security

- ✅ Never commit `.env` files (already in `.gitignore`)
- ✅ Use Vercel's environment variables for secrets
- ✅ Different values for Production/Preview/Development
- ✅ Automatically encrypted by Vercel

## Monitoring & Logs

### View Logs

1. **Vercel Dashboard:**
   - Go to your project
   - Click "Deployments" → Select a deployment
   - Click "Functions" tab → View logs

2. **CLI:**
   ```bash
   vercel logs
   ```

### Health Check

Monitor your deployment:
```bash
curl https://your-app.vercel.app/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-12-31T...Z"}
```

## Troubleshooting

### Deployment Fails

1. **Check Build Logs:**
   - Go to deployment → "Build Logs"
   - Look for TypeScript errors or missing dependencies

2. **Verify Build Command:**
   - Ensure `npm run build` succeeds locally
   - Check `tsconfig.json` is correct

3. **Check Environment Variables:**
   - Ensure all required variables are set
   - Verify no typos in variable names

### Function Timeout

If requests timeout:
- Check function logs for slow operations
- Consider upgrading to Pro tier (60s timeout)
- Optimize code (reduce API calls, add caching)

### Slack Not Working

1. **Check KV is Configured:**
   - Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set
   - See [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md)

2. **Check Slack Credentials:**
   - Verify `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_CHANNEL_ID`
   - Check Slack app permissions

3. **Check Webhook URL:**
   - Verify Slack events URL is correct
   - Check Slack app settings

### GitHub Logging Not Working

1. **Check GitHub Token:**
   - Verify `GITHUB_TOKEN` is valid
   - Check token permissions (repo scope)
   - For fine-grained tokens, ensure repository access is granted

2. **Check Repository Settings:**
   - Verify `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` are correct
   - Check repository exists and is accessible

## Cost Considerations

### Free Tier Limits

- **Function Executions:** 100 GB-hours/month
- **Function Duration:** 10 seconds max
- **Bandwidth:** 100 GB/month
- **KV:** 256 MB storage, 30,000 commands/day

### Pro Tier ($20/month)

- **Function Duration:** 60 seconds
- **Better cold start performance**
- **Unlimited bandwidth**
- **KV:** Usage-based pricing

For this application, **Pro tier is recommended** due to processing requirements.

## Next Steps After Deployment

1. ✅ Test the health endpoint
2. ✅ Update Fathom webhook URL
3. ✅ Update Slack events URL (if using Slack)
4. ✅ Test with a real Fathom webhook
5. ✅ Monitor logs for any issues
6. ✅ Set up alerts (optional)

## Additional Resources

- [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md) - KV setup guide
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
