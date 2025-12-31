# Setup Guide

## Prerequisites

- Node.js 18+ installed
- Accounts and API keys for:
  - Fathom
  - GitHub
  - OpenAI
  - Linear
  - Slack

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Fill in your `.env` file with all required credentials (see Configuration section below).

## Configuration

### Fathom

1. Go to your Fathom Settings > API Access
2. Generate an API key if you haven't already
3. Create a webhook:
   - Go to **Manage** > **Add Webhook**
   - Set the Destination URL to: `https://your-domain.com/webhook/fathom`
   - Enable: Transcript, Summary, Action Items
   - Copy the webhook secret to `FATHOM_WEBHOOK_SECRET` in `.env`

### GitHub

1. Create a GitHub repository for storing transcripts (or use an existing one)
2. Generate a Personal Access Token with `repo` scope:
   - Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
   - Generate new token with `repo` scope
   - Copy token to `GITHUB_TOKEN` in `.env`
3. Set `GITHUB_REPO_OWNER` (your username or org)
4. Set `GITHUB_REPO_NAME` (repository name)

### OpenAI

1. Get your API key from https://platform.openai.com/api-keys
2. Copy to `OPENAI_API_KEY` in `.env`

### Linear

1. Go to Linear Settings > API
2. Generate a new API key
3. Copy to `LINEAR_API_KEY` in `.env`
4. Get your Team ID:
   - Go to your Linear workspace
   - The Team ID can be found in the URL or via API
   - Copy to `LINEAR_TEAM_ID` in `.env`
5. (Optional) Set `LINEAR_PROJECT_ID` if you want issues in a specific project

### Slack

1. Create a Slack App:
   - Go to https://api.slack.com/apps
   - Click "Create New App" > "From scratch"
   - Name your app and select your workspace
   
2. Enable Bot Token Scopes:
   - Go to "OAuth & Permissions"
   - Add Bot Token Scopes:
     - `chat:write`
     - `chat:write.public`
     - `channels:read`
   
3. Install App to Workspace:
   - Click "Install to Workspace"
   - Copy the "Bot User OAuth Token" (starts with `xoxb-`) to `SLACK_BOT_TOKEN` in `.env`
   
4. Get Signing Secret:
   - Go to "Basic Information" > "App Credentials"
   - Copy "Signing Secret" to `SLACK_SIGNING_SECRET` in `.env`
   
5. Enable Event Subscriptions:
   - Go to "Event Subscriptions"
   - Enable Events
   - Set Request URL to: `https://your-domain.com/slack/events`
   - Subscribe to bot events:
     - `message.channels` (if needed)
   - Save Changes
   
6. Enable Interactivity:
   - Go to "Interactivity & Shortcuts"
   - Enable Interactivity
   - Set Request URL to: `https://your-domain.com/slack/events`
   - Save Changes

7. Get Channel ID:
   - In Slack, right-click on the channel you want to use for reviews
   - Click "View channel details" (or "Open channel details")
   - The Channel ID is at the bottom (format: C1234567890)
   - Copy to `SLACK_CHANNEL_ID` in `.env`

8. Reinstall the app if you made changes after installation

## Running the Application

### Development

```bash
npm run dev
```

The server will start on port 3000 (or the port specified in `PORT` env var).

### Production

1. Build the application:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

## Testing

1. **Health Check**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Test Webhook** (using a tool like ngrok for local testing):
   - Set up ngrok: `ngrok http 3000`
   - Update Fathom webhook URL to your ngrok URL
   - Record a test meeting in Fathom
   - Check logs and Slack channel

## Troubleshooting

### Slack Events Not Working

- Verify the Request URL in Slack App settings matches your server endpoint
- Check that Event Subscriptions and Interactivity are enabled
- Ensure the bot is invited to the channel (mention the bot in the channel)

### Linear Issues Not Creating

- Verify your API key has proper permissions
- Check that the Team ID is correct
- Review Linear API rate limits

### Webhook Verification Failing

- Ensure `FATHOM_WEBHOOK_SECRET` matches the secret from Fathom
- Check that raw body is being preserved correctly (the server handles this automatically)

### GitHub Logging Failing

- Verify GitHub token has `repo` scope
- Check repository name and owner are correct
- Ensure the repository exists and is accessible

## Deployment

### Recommended Platforms

- **Railway**: Easy deployment with environment variables
- **Render**: Similar to Railway
- **AWS Lambda**: For serverless deployment (requires additional setup)
- **Heroku**: Traditional PaaS option

### Environment Variables

Ensure all environment variables from `.env.example` are set in your deployment platform.

### Webhook URLs

Update webhook URLs in:
- Fathom: `https://your-domain.com/webhook/fathom`
- Slack: `https://your-domain.com/slack/events`

## Next Steps

1. Test with a real Fathom meeting
2. Monitor Slack channel for review requests
3. Check GitHub repository for logged transcripts
4. Verify issues are created in Linear after approval

