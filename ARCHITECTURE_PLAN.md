# Fathom to Linear Integration App - Architecture Plan

## Overview

This application will automatically convert call transcripts from Fathom into Linear issues based on extracted action items, with optional Slack review and GitHub logging.

## System Architecture

```
┌─────────────┐
│   Fathom    │
│  Webhooks   │
└──────┬──────┘
       │
       │ POST /webhook/fathom
       ▼
┌─────────────────────────────────────┐
│   Webhook Receiver (Express/Fastify)│
│   - Verify webhook signature        │
│   - Extract transcript data         │
│   - Store raw webhook               │
└──────┬──────────────────────────────┘
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
┌──────────────────────┐      ┌──────────────────┐
│  GitHub Logger       │      │  Action Items    │
│  - Commit transcript │      │  Extractor (AI)  │
│  - Store as file     │      │  - Use OpenAI/   │
└──────────────────────┘      │    Anthropic     │
                              │  - Parse action  │
                              │    items         │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │  Linear Issue    │
                              │  Transformer     │
                              │  - Format issues │
                              │  - Create payload│
                              └────────┬─────────┘
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                          ▼                         ▼
                 ┌─────────────────┐      ┌─────────────────┐
                 │  Slack Reviewer │      │  Linear API     │
                 │  - Post preview │      │  - Create issues│
                 │  - Wait approval│      │  - GraphQL      │
                 └────────┬────────┘      └─────────────────┘
                          │
                          │ (after approval)
                          ▼
                 ┌─────────────────┐
                 │  Linear API     │
                 │  - Create issues│
                 └─────────────────┘
```

## Components

### 1. Webhook Receiver Service
**Purpose**: Receive and validate Fathom webhooks

**Responsibilities**:
- Expose POST endpoint at `/webhook/fathom`
- Verify webhook signature using HMAC SHA-256
- Extract transcript, summary, and action items from payload
- Queue or trigger processing pipeline
- Return 200 OK to Fathom

**Tech**: Express.js or Fastify (Node.js)

### 2. GitHub Logger Service
**Purpose**: Log all received transcripts to GitHub repository

**Responsibilities**:
- Create/update files in GitHub repo
- Structure: `transcripts/{date}/{meeting-id}.json`
- Include full webhook payload
- Use GitHub API or git operations

**Tech**: Octokit (GitHub SDK) or git commands

### 3. Action Items Extractor
**Purpose**: Extract action items from transcript using AI

**Responsibilities**:
- Parse transcript text
- Use LLM (OpenAI/Anthropic) to extract action items
- Structured output format:
  ```json
  {
    "actionItems": [
      {
        "title": "string",
        "description": "string",
        "assignee": "string (optional)",
        "priority": "high|medium|low",
        "dueDate": "ISO date (optional)"
      }
    ]
  }
  ```
- Handle errors and retries

**Tech**: OpenAI API or Anthropic API

### 4. Linear Issue Transformer
**Purpose**: Convert action items to Linear issue format

**Responsibilities**:
- Map action items to Linear IssueCreateInput
- Handle team/project assignment
- Set labels, priorities, assignees
- Create issue payload for Linear GraphQL API

**Tech**: Linear TypeScript SDK or GraphQL client

### 5. Slack Reviewer (Optional)
**Purpose**: Review issues before creating in Linear

**Responsibilities**:
- Post preview of issues to Slack channel
- Include buttons/actions for approval/rejection
- Store approval state
- Trigger Linear creation after approval
- Timeout handling (auto-approve after X minutes?)

**Tech**: Slack Bolt SDK (Node.js)

### 6. Linear API Client
**Purpose**: Create issues in Linear

**Responsibilities**:
- Authenticate with Linear API key or OAuth
- Execute GraphQL mutations for issue creation
- Handle errors and retries
- Link issues if needed (parent/child relationships)

**Tech**: Linear TypeScript SDK or GraphQL client (like graphql-request)

## Data Flow

### Flow 1: Direct to Linear (No Slack Review)
1. Fathom webhook → Webhook Receiver
2. Verify signature → Extract transcript
3. Log to GitHub (async/parallel)
4. Extract action items with AI
5. Transform to Linear format
6. Create issues in Linear
7. Log results

### Flow 2: With Slack Review
1. Fathom webhook → Webhook Receiver
2. Verify signature → Extract transcript
3. Log to GitHub (async/parallel)
4. Extract action items with AI
5. Transform to Linear format
6. **Post to Slack for review**
7. Wait for approval (with timeout)
8. Create issues in Linear (after approval)
9. Update Slack with confirmation

## Technology Stack Recommendations

### Core Stack
- **Runtime**: Node.js 18+ (TypeScript recommended)
- **Framework**: Express.js or Fastify
- **Database**: (Optional) PostgreSQL/SQLite for tracking state
- **Queue**: (Optional) BullMQ or Bull for async processing

### Integrations
- **Fathom**: Webhook verification (HMAC SHA-256)
- **GitHub**: @octokit/rest
- **AI/LLM**: OpenAI SDK or Anthropic SDK
- **Linear**: @linear/sdk
- **Slack**: @slack/bolt

### Infrastructure
- **Hosting**: Railway, Render, or AWS Lambda
- **Environment**: Use environment variables for secrets
- **Monitoring**: Add logging (Winston/Pino)

## Implementation Steps

### Phase 1: Core Infrastructure
1. Set up Node.js project with TypeScript
2. Create Express/Fastify server
3. Implement webhook receiver endpoint
4. Add webhook signature verification
5. Set up environment variable management

### Phase 2: GitHub Logging
1. Set up GitHub API client
2. Implement transcript logging function
3. Test with sample data
4. Integrate with webhook receiver

### Phase 3: AI Integration
1. Set up OpenAI/Anthropic client
2. Create prompt for action item extraction
3. Implement extraction service
4. Add error handling and retries
5. Test with sample transcripts

### Phase 4: Linear Integration
1. Set up Linear API client (API key or OAuth)
2. Implement issue transformer
3. Create GraphQL mutations
4. Test issue creation
5. Integrate with action items extractor

### Phase 5: Slack Integration (Optional)
1. Set up Slack Bolt app
2. Create interactive message for review
3. Implement approval flow
4. Add timeout handling
5. Integrate with Linear creation

### Phase 6: End-to-End Testing
1. Test complete flow with Fathom webhooks
2. Verify all integrations
3. Add error handling
4. Add logging and monitoring

## Configuration Requirements

### Environment Variables

```bash
# Fathom
FATHOM_WEBHOOK_SECRET=<webhook_secret_from_fathom>

# GitHub
GITHUB_TOKEN=<personal_access_token>
GITHUB_REPO_OWNER=<username_or_org>
GITHUB_REPO_NAME=<repo_name>

# AI/LLM
OPENAI_API_KEY=<api_key>
# OR
ANTHROPIC_API_KEY=<api_key>

# Linear
LINEAR_API_KEY=<api_key>
LINEAR_TEAM_ID=<team_id>
LINEAR_PROJECT_ID=<project_id> (optional)

# Slack (Optional)
SLACK_BOT_TOKEN=<xoxb-token>
SLACK_SIGNING_SECRET=<signing_secret>
SLACK_CHANNEL_ID=<channel_id>

# Server
PORT=3000
NODE_ENV=production
```

## API Endpoints

```
POST /webhook/fathom
  - Receive Fathom webhooks
  - Verify signature
  - Trigger processing

GET /health
  - Health check endpoint

POST /webhook/slack (if using Slack)
  - Receive Slack interactions
  - Handle approvals/rejections
```

## Error Handling Strategy

1. **Webhook Verification Failure**: Return 401, log error
2. **AI Extraction Failure**: Retry with exponential backoff, log error
3. **Linear API Failure**: Retry with exponential backoff, log error, notify
4. **GitHub Logging Failure**: Log error, but don't block main flow
5. **Slack Failure**: Log error, proceed with direct Linear creation

## Future Enhancements

- Database for tracking processed transcripts
- Web UI for reviewing/managing issues
- Bulk operations on issues
- Issue templates based on transcript patterns
- Integration with calendar for due date suggestions
- Support for multiple Linear teams/projects
- Analytics dashboard

## Security Considerations

- ✅ Webhook signature verification (HMAC SHA-256)
- ✅ Secure storage of API keys (environment variables)
- ✅ Rate limiting on endpoints
- ✅ Input validation and sanitization
- ✅ HTTPS only in production
- ✅ Error messages should not leak sensitive data

