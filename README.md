# Fathom to Linear Integration

Automatically convert call transcripts from Fathom into Linear issues based on extracted action items.

## Overview

This application automatically converts Fathom call transcripts into Linear issues with AI-powered action item extraction and Slack review:

1. Receives call transcripts from Fathom via webhooks
2. Extracts action items using AI (OpenAI GPT-5-mini)
3. **Posts a meeting recap to Slack** (informational)
4. Transforms action items into Linear issues
5. **Posts issues to Slack for individual review** (each issue has its own approve/reject buttons)
6. Creates issues in Linear one-by-one as they're approved
7. Logs all transcripts to GitHub with domain-based organization

## Documentation

- **[Architecture Plan](./ARCHITECTURE_PLAN.md)** - High-level system design, components, and data flow
- **[Technical Specification](./TECHNICAL_SPEC.md)** - Detailed implementation guide with code examples

## Quick Start

### Prerequisites

- Node.js 18+
- API keys for:
  - Fathom (webhook secret)
  - GitHub (personal access token)
  - OpenAI or Anthropic
  - Linear (API key)
  - Slack (optional, for review workflow)

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your credentials
4. Run the server: `npm run dev`

### Configuration

See [Setup Guide](./SETUP.md) for detailed setup instructions, or [Technical Specification](./TECHNICAL_SPEC.md) for implementation details.

## Features

- ✅ **Webhook signature verification** (HMAC SHA-256)
- ✅ **AI-powered action item extraction** (OpenAI GPT-5-mini)
- ✅ **Slack recap messages** - Automatic meeting summaries posted to Slack
- ✅ **Individual issue approval** - Each issue has its own approve/reject buttons for granular control
- ✅ **Linear issue creation** - Proper formatting, priorities, assignees, and state management (Triage)
- ✅ **GitHub transcript logging** - Domain-based organization (`call_transcript/{domain}/{date}/`)
- ✅ **Vercel KV integration** - Persistent state storage for serverless deployment
- ✅ **Retry strategy** - Exponential backoff for API calls (Linear, OpenAI)
- ✅ **Comprehensive error handling** - Detailed logging and error recovery
- ✅ **Type-safe** TypeScript implementation
- ✅ **Vercel deployment ready** - Optimized for serverless functions

## Architecture

```
Fathom Webhook → Verify Signature → Extract Action Items (AI) → Transform → Slack (Recap + Review) → Linear API
                          ↓                                              ↓
                    GitHub Logger                    (Individual Approve/Reject per Issue)
                          ↓
                   Domain-based Storage
```

**Key Improvements:**
- **Individual Approval**: Each issue can be approved/rejected independently
- **Slack Recap**: Meeting summaries posted automatically (non-blocking)
- **State Persistence**: Uses Vercel KV for serverless-friendly state management
- **Retry Logic**: Automatic retries with exponential backoff for API calls
- **Better Error Handling**: Detailed logging and graceful error recovery

See [Architecture Plan](./ARCHITECTURE_PLAN.md) for detailed diagrams and flow.

## Project Structure

```
src/
├── server.ts              # Main Express server
├── routes/
│   ├── webhook.ts         # Fathom webhook endpoint
│   └── test.ts            # Test endpoints for debugging
├── services/
│   ├── fathom/            # Webhook verification
│   ├── github/            # Transcript logging (domain-based)
│   ├── ai/
│   │   ├── action-extractor.ts    # Action item extraction
│   │   └── recap-generator.ts     # Meeting recap generation
│   ├── linear/
│   │   ├── transformer.ts         # Issue transformation
│   │   └── client.ts              # Issue creation (with retry)
│   └── slack/
│       └── reviewer.ts            # Review workflow (individual approval)
├── types/                 # TypeScript type definitions
├── config/                # Environment configuration
└── utils/
    ├── logger.ts          # Winston-based logging
    └── retry.ts           # Retry utility with exponential backoff
api/
└── index.ts               # Vercel serverless entry point
scripts/
├── list-linear-teams.js   # Helper: List Linear teams
├── test-linear-api.js     # Helper: Test Linear API
└── send-webhook-to-vercel.js  # Helper: Send test webhooks
```

## Getting Started

1. **Install dependencies**: `npm install`
2. **Set up environment variables**: See [SETUP.md](./SETUP.md)
   - Required: `FATHOM_WEBHOOK_SECRET`, `GITHUB_TOKEN`, `OPENAI_API_KEY`, `LINEAR_API_KEY`, `LINEAR_TEAM_ID`
   - Optional: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_CHANNEL_ID` (for review workflow)
   - For Vercel: `KV_REST_API_URL`, `KV_REST_API_TOKEN` (for state persistence)
3. **Configure integrations**: Follow the setup guide for each service
4. **Run locally**: `npm run dev` (see [LOCAL_TESTING.md](./LOCAL_TESTING.md) for ngrok setup)
5. **Deploy to Vercel**: See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
6. **Test**: Record a meeting in Fathom and check your Slack channel!

## How It Works

### Workflow

1. **Fathom sends webhook** → Your endpoint receives the transcript
2. **GitHub logging** → Transcript saved to `call_transcript/{domain}/{date}/{recording_id}.json`
3. **AI extraction** → GPT-5-mini extracts action items from transcript
4. **Slack recap** → Meeting summary posted to Slack (informational, non-blocking)
5. **Slack review** → Each action item shown with individual approve/reject buttons
6. **Individual approval** → Clicking approve creates that specific issue in Linear immediately
7. **Linear creation** → Issues created with proper formatting, priority, assignee, and state (Triage)

### Key Features

- **Individual Approval**: Each issue can be approved/rejected independently - no need to approve all at once
- **Immediate Feedback**: Buttons update instantly when clicked to prevent duplicate submissions
- **State Persistence**: Uses Vercel KV to store review state (works in serverless environment)
- **Error Recovery**: Automatic retries with exponential backoff for transient failures
- **Smart Logging**: GitHub transcripts organized by domain name for easier navigation

## Documentation

### Setup & Configuration
- **[SETUP.md](./SETUP.md)** - Complete setup guide with all integrations
- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - Vercel deployment guide
- **[VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md)** - Setting up Vercel KV for state persistence
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Deployment checklist

### Architecture & Technical
- **[ARCHITECTURE_PLAN.md](./ARCHITECTURE_PLAN.md)** - System design and architecture
- **[TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md)** - Technical implementation details
- **[RETRY_STRATEGY.md](./RETRY_STRATEGY.md)** - Retry logic implementation

### Slack Integration
- **[SLACK_SETUP_VERCEL.md](./SLACK_SETUP_VERCEL.md)** - Slack setup for Vercel deployment
- **[SLACK_DEBUG_STEPS.md](./SLACK_DEBUG_STEPS.md)** - Debugging Slack integration issues

### Testing
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Guide for testing individual components
- **[LOCAL_TESTING.md](./LOCAL_TESTING.md)** - Local testing with ngrok

