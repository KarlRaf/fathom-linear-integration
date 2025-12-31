# Vercel KV Setup Guide

This guide explains how to set up Vercel KV (Redis) for state storage in your Slack review workflow.

## Why Vercel KV?

In serverless environments like Vercel, function invocations are stateless. The original implementation used an in-memory `Map` to store pending Slack reviews, which doesn't work because:
- Each function invocation is isolated
- The Map is lost between invocations
- When someone clicks "Approve" in Slack, it might hit a different function instance

Vercel KV provides Redis-backed persistent storage that works across all function invocations.

## Setup Steps

### 1. Create Vercel KV Database

1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **Create Database**
3. Select **KV** (Redis)
4. Choose a name for your database (e.g., `fathom-linear-kv`)
5. Select a region closest to your users
6. Click **Create**

### 2. Get Connection Details

After creating the KV database:

1. Go to your KV database settings
2. Copy the connection details:
   - **KV_URL** (Redis connection URL)
   - **KV_REST_API_URL** (REST API endpoint)
   - **KV_REST_API_TOKEN** (REST API token)

### 3. Add Environment Variables

In your Vercel project:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables (for all environments):
   - `KV_URL` = Your KV URL
   - `KV_REST_API_URL` = Your KV REST API URL
   - `KV_REST_API_TOKEN` = Your KV REST API Token

**Note:** Vercel automatically makes these available to your functions when you link the KV database to your project.

### 4. Link KV Database to Project (Optional)

If you created the KV database from the project dashboard, it should be automatically linked. Otherwise:

1. Go to your project settings
2. Navigate to **Storage**
3. Link your KV database

### 5. Redeploy

After adding environment variables:

1. Push your code changes
2. Vercel will automatically redeploy
3. Or manually trigger a redeploy from the dashboard

## How It Works

### Storage Structure

- **Key Format:** `slack-review:{reviewId}`
- **Value:** JSON string containing:
  - `actionItems`: Array of action items
  - `linearIssues`: Array of Linear issue inputs
  - `timestamp`: Creation timestamp
  - `messageTs`: Slack message timestamp
  - `channelId`: Slack channel ID

### Flow

1. **Webhook Received** → Action items extracted → Review posted to Slack
2. **Review Data Stored** → Stored in KV with TTL (30 minutes default)
3. **User Clicks Approve** → Handler retrieves review data from KV
4. **Linear Issues Created** → Using stored `linearIssues` data
5. **Review Data Deleted** → Cleaned up from KV after processing

### Code Implementation

The implementation automatically detects KV availability:

```typescript
// Automatically detects if KV environment variables are set
const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const slackReviewer = new SlackReviewer(
  botToken,
  signingSecret,
  channelId,
  useKV // true if KV is configured
);
```

## Testing

### Local Testing

For local testing, KV is optional. The code will work with warnings if KV is not configured. However, **the Slack review feature will not work properly** without KV in serverless environments.

### Production Testing

1. Deploy to Vercel with KV configured
2. Send a test webhook
3. Check Slack for review message
4. Click "Approve"
5. Verify issues are created in Linear
6. Check KV dashboard to see stored data (optional)

## Troubleshooting

### Issue: "Review not found or expired"

**Causes:**
- KV not configured properly
- TTL expired (default 30 minutes)
- Review ID mismatch

**Solutions:**
- Verify environment variables are set correctly
- Check KV database is linked to project
- Review logs for KV connection errors

### Issue: "Failed to store review in KV"

**Causes:**
- Invalid KV credentials
- Network connectivity issues
- KV database not accessible

**Solutions:**
- Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are correct
- Check KV database status in Vercel dashboard
- Ensure region matches your deployment region

### Issue: "Linear creator not configured"

**Causes:**
- `setLinearCreator()` not called
- Linear creator service not initialized

**Solutions:**
- Verify `slackReviewer.setLinearCreator(linearCreator)` is called in `server.ts`
- Check Linear service initialization

## Cost Considerations

Vercel KV Pricing (as of 2024):
- **Hobby (Free):** 256 MB storage, 30,000 commands/day
- **Pro:** $20/month + usage-based pricing
- **Enterprise:** Custom pricing

For this application:
- Each review stores ~5-10 KB of data
- TTL ensures automatic cleanup
- Expected usage: 100-1000 reviews/month = ~1-10 MB storage

**Recommendation:** Hobby tier should be sufficient for most use cases.

## Environment Variables Summary

Required for KV:
- `KV_REST_API_URL` - KV REST API endpoint
- `KV_REST_API_TOKEN` - KV REST API authentication token

Optional (for Redis client):
- `KV_URL` - Full Redis connection URL (if using Redis client directly)

## Next Steps

After setting up KV:
1. Test the full workflow end-to-end
2. Monitor KV usage in Vercel dashboard
3. Adjust TTL if needed (currently 30 minutes)
4. Set up alerts for KV errors (optional)

