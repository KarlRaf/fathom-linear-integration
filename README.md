# Fathom to Linear Integration

Automatically convert call transcripts from Fathom into Linear issues based on extracted action items.

## Overview

This application implements **Option 2: With Slack Review**:
1. Receives call transcripts from Fathom via webhooks
2. Extracts action items using AI (OpenAI GPT-4)
3. Transforms them into Linear issues
4. **Posts issues to Slack for review** before creation
5. Creates issues in Linear after approval
6. Logs all transcripts to GitHub

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
- ✅ **AI-powered action item extraction** (OpenAI GPT-4)
- ✅ **Slack review workflow** with approve/reject buttons
- ✅ **Linear issue creation** with proper formatting, priorities, and assignees
- ✅ **GitHub transcript logging** for all received transcripts
- ✅ **Error handling** and comprehensive logging
- ✅ **Type-safe** TypeScript implementation

## Architecture

```
Fathom Webhook → Verify Signature → Extract Action Items (AI) → Transform → Slack Review → Linear API
                          ↓                                              ↓
                    GitHub Logger                              (Approve/Reject)
```

See [Architecture Plan](./ARCHITECTURE_PLAN.md) for detailed diagrams and flow.

## Project Structure

```
src/
├── server.ts              # Main Express server
├── routes/
│   └── webhook.ts         # Fathom webhook endpoint
├── services/
│   ├── fathom/            # Webhook verification
│   ├── github/            # Transcript logging
│   ├── ai/                # Action item extraction
│   ├── linear/            # Issue transformation & creation
│   └── slack/             # Review workflow
├── types/                 # TypeScript type definitions
├── config/                # Environment configuration
└── utils/                 # Logging utilities
```

## Getting Started

1. **Install dependencies**: `npm install`
2. **Set up environment variables**: See [SETUP.md](./SETUP.md)
3. **Configure integrations**: Follow the setup guide for each service
4. **Run the server**: `npm run dev`
5. **Test**: Record a meeting in Fathom and check your Slack channel!

## Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide with all integrations
- **[ARCHITECTURE_PLAN.md](./ARCHITECTURE_PLAN.md)** - System design and architecture
- **[TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md)** - Technical implementation details

