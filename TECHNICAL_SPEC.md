# Technical Specification

## Project Structure

```
fathom-linear-app/
├── src/
│   ├── server.ts                 # Main server entry point
│   ├── routes/
│   │   ├── webhook.ts            # Fathom webhook endpoint
│   │   └── slack.ts              # Slack interactions (optional)
│   ├── services/
│   │   ├── fathom/
│   │   │   └── webhook-verifier.ts
│   │   ├── github/
│   │   │   └── logger.ts
│   │   ├── ai/
│   │   │   └── action-extractor.ts
│   │   ├── linear/
│   │   │   ├── client.ts
│   │   │   └── transformer.ts
│   │   └── slack/
│   │       └── reviewer.ts       # Optional
│   ├── types/
│   │   ├── fathom.ts
│   │   ├── linear.ts
│   │   └── action-item.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── errors.ts
│   └── config/
│       └── env.ts
├── tests/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Type Definitions

### Fathom Webhook Payload
```typescript
interface FathomWebhookPayload {
  event: {
    id: string;
    event_type: string;
    timestamp: string;
  };
  recording: {
    id: string;
    title: string;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
  };
  transcript?: {
    text: string;
    paragraphs?: Array<{
      speaker: string;
      text: string;
      start_time: number;
      end_time: number;
    }>;
  };
  summary?: string;
  action_items?: Array<{
    text: string;
    owner?: string;
  }>;
}
```

### Action Item (Internal)
```typescript
interface ActionItem {
  title: string;
  description: string;
  assignee?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string; // ISO date string
  metadata?: {
    originalText: string;
    speaker?: string;
    timestamp?: number;
  };
}
```

### Linear Issue Input
```typescript
interface LinearIssueInput {
  title: string;
  description: string;
  teamId: string;
  projectId?: string;
  assigneeId?: string;
  priority?: number; // 1-4, where 1 is urgent
  labelIds?: string[];
  dueDate?: string;
}
```

## Implementation Details

### 1. Webhook Verification

```typescript
// src/services/fathom/webhook-verifier.ts
import crypto from 'crypto';

export function verifyWebhookSignature(
  secret: string,
  signature: string,
  rawBody: string
): boolean {
  const [version, signatureBlock] = signature.split(',');
  
  if (version !== 'v1') {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  const signatures = signatureBlock.split(' ').map(s => s.trim());
  return signatures.includes(expected);
}
```

### 2. GitHub Logger

```typescript
// src/services/github/logger.ts
import { Octokit } from '@octokit/rest';

interface LoggerConfig {
  token: string;
  owner: string;
  repo: string;
}

export class GitHubLogger {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(config: LoggerConfig) {
    this.octokit = new Octokit({ auth: config.token });
    this.owner = config.owner;
    this.repo = config.repo;
  }

  async logTranscript(transcript: FathomWebhookPayload): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const filename = `transcripts/${date}/${transcript.recording.id}.json`;
    const content = JSON.stringify(transcript, null, 2);
    const contentBase64 = Buffer.from(content).toString('base64');

    try {
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filename,
        message: `Add transcript: ${transcript.recording.title}`,
        content: contentBase64,
      });
    } catch (error) {
      // Log error but don't throw - GitHub logging is non-critical
      console.error('Failed to log transcript to GitHub:', error);
    }
  }
}
```

### 3. Action Items Extractor (AI)

```typescript
// src/services/ai/action-extractor.ts
import OpenAI from 'openai';
// OR import Anthropic from '@anthropic-ai/sdk';

const EXTRACTION_PROMPT = `
You are an assistant that extracts action items from meeting transcripts.

Given the following transcript, extract all action items and format them as JSON.

For each action item, provide:
- title: A concise, actionable title (max 100 chars)
- description: Detailed description with context
- assignee: Person responsible (if mentioned, otherwise null)
- priority: "high", "medium", or "low" based on urgency
- dueDate: ISO date string if deadline mentioned, otherwise null

Return ONLY valid JSON in this format:
{
  "actionItems": [
    {
      "title": "...",
      "description": "...",
      "assignee": "..." or null,
      "priority": "high" | "medium" | "low",
      "dueDate": "YYYY-MM-DD" or null
    }
  ]
}

Transcript:
{{TRANSCRIPT}}

Summary (if available):
{{SUMMARY}}
`;

export class ActionItemExtractor {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async extract(transcript: string, summary?: string): Promise<ActionItem[]> {
    const prompt = EXTRACTION_PROMPT
      .replace('{{TRANSCRIPT}}', transcript)
      .replace('{{SUMMARY}}', summary || 'Not available');

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview', // or 'gpt-3.5-turbo' for cost savings
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts action items from meeting transcripts. Always return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.actionItems || [];
    } catch (error) {
      console.error('Failed to extract action items:', error);
      throw new Error('Action item extraction failed');
    }
  }
}
```

### 4. Linear Transformer

```typescript
// src/services/linear/transformer.ts
import { LinearClient } from '@linear/sdk';

export class LinearTransformer {
  private client: LinearClient;
  private teamId: string;
  private projectId?: string;

  constructor(apiKey: string, teamId: string, projectId?: string) {
    this.client = new LinearClient({ apiKey });
    this.teamId = teamId;
    this.projectId = projectId;
  }

  async transformActionItem(item: ActionItem): Promise<LinearIssueInput> {
    // Map priority
    const priorityMap = {
      high: 1,
      medium: 2,
      low: 3,
    };

    // Try to find assignee by name if provided
    let assigneeId: string | undefined;
    if (item.assignee) {
      const users = await this.client.users();
      const assignee = users.nodes.find(
        (u) => u.name.toLowerCase().includes(item.assignee!.toLowerCase())
      );
      assigneeId = assignee?.id;
    }

    return {
      title: item.title,
      description: this.formatDescription(item),
      teamId: this.teamId,
      projectId: this.projectId,
      assigneeId,
      priority: priorityMap[item.priority],
      dueDate: item.dueDate || undefined,
    };
  }

  private formatDescription(item: ActionItem): string {
    let desc = item.description;

    if (item.metadata?.originalText) {
      desc += `\n\n**Original context:**\n${item.metadata.originalText}`;
    }

    if (item.metadata?.speaker) {
      desc += `\n\n**Assigned by:** ${item.metadata.speaker}`;
    }

    return desc;
  }
}
```

### 5. Linear Issue Creator

```typescript
// src/services/linear/client.ts
import { LinearClient } from '@linear/sdk';

export class LinearIssueCreator {
  private client: LinearClient;

  constructor(apiKey: string) {
    this.client = new LinearClient({ apiKey });
  }

  async createIssue(input: LinearIssueInput): Promise<string> {
    try {
      const issuePayload = await this.client.issueCreate(input);

      // Linear SDK uses a promise-based approach
      const issue = await issuePayload.issue;
      return issue?.id || '';
    } catch (error) {
      console.error('Failed to create Linear issue:', error);
      throw error;
    }
  }

  async createIssues(inputs: LinearIssueInput[]): Promise<string[]> {
    const issueIds: string[] = [];

    // Create issues sequentially to avoid rate limits
    for (const input of inputs) {
      try {
        const issueId = await this.createIssue(input);
        issueIds.push(issueId);
        // Small delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to create issue: ${input.title}`, error);
      }
    }

    return issueIds;
  }
}
```

### 6. Slack Reviewer (Optional)

```typescript
// src/services/slack/reviewer.ts
import { App } from '@slack/bolt';

interface ReviewRequest {
  actionItems: ActionItem[];
  linearIssues: LinearIssueInput[];
  callback: (approved: boolean) => Promise<void>;
}

export class SlackReviewer {
  private app: App;
  private channelId: string;
  private pendingReviews: Map<string, ReviewRequest> = new Map();

  constructor(token: string, signingSecret: string, channelId: string) {
    this.app = new App({
      token,
      signingSecret,
    });
    this.channelId = channelId;

    this.setupHandlers();
  }

  private setupHandlers() {
    this.app.action('approve_issues', async ({ ack, body, respond }) => {
      await ack();
      const reviewId = (body as any).actions[0].value;
      const review = this.pendingReviews.get(reviewId);

      if (review) {
        await review.callback(true);
        await respond({ text: '✅ Issues approved and created in Linear!' });
        this.pendingReviews.delete(reviewId);
      }
    });

    this.app.action('reject_issues', async ({ ack, body, respond }) => {
      await ack();
      const reviewId = (body as any).actions[0].value;
      this.pendingReviews.delete(reviewId);
      await respond({ text: '❌ Issue creation cancelled.' });
    });
  }

  async requestReview(actionItems: ActionItem[], linearIssues: LinearIssueInput[]): Promise<string> {
    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📋 Review Action Items for Linear*\n\nFound ${actionItems.length} action item(s) from the meeting.`,
        },
      },
      {
        type: 'divider',
      },
    ];

    // Add each action item
    linearIssues.forEach((issue, index) => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${index + 1}. ${issue.title}*\n${issue.description}\n\n*Priority:* ${this.getPriorityLabel(issue.priority)}`,
        },
      });
    });

    blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Approve & Create',
            },
            style: 'primary',
            action_id: 'approve_issues',
            value: reviewId,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '❌ Reject',
            },
            style: 'danger',
            action_id: 'reject_issues',
            value: reviewId,
          },
        ],
      }
    );

    await this.app.client.chat.postMessage({
      channel: this.channelId,
      blocks,
    });

    // Store review request (with timeout)
    this.pendingReviews.set(reviewId, {
      actionItems,
      linearIssues,
      callback: async () => {}, // Will be set by caller
    });

    return reviewId;
  }

  setReviewCallback(reviewId: string, callback: (approved: boolean) => Promise<void>) {
    const review = this.pendingReviews.get(reviewId);
    if (review) {
      review.callback = callback;
    }
  }

  private getPriorityLabel(priority?: number): string {
    const labels = { 1: '🔴 High', 2: '🟡 Medium', 3: '🟢 Low', 4: '⚪ No Priority' };
    return labels[priority || 4] || '⚪ No Priority';
  }

  async start() {
    await this.app.start(process.env.PORT || 3000);
  }
}
```

### 7. Main Webhook Handler

```typescript
// src/routes/webhook.ts
import { Router, Request, Response } from 'express';
import { verifyWebhookSignature } from '../services/fathom/webhook-verifier';
import { GitHubLogger } from '../services/github/logger';
import { ActionItemExtractor } from '../services/ai/action-extractor';
import { LinearTransformer } from '../services/linear/transformer';
import { LinearIssueCreator } from '../services/linear/client';
import { SlackReviewer } from '../services/slack/reviewer';

export function createWebhookRouter(
  services: {
    githubLogger: GitHubLogger;
    actionExtractor: ActionItemExtractor;
    linearTransformer: LinearTransformer;
    linearCreator: LinearIssueCreator;
    slackReviewer?: SlackReviewer;
  }
) {
  const router = Router();

  router.post('/fathom', async (req: Request, res: Response) => {
    try {
      // Verify webhook signature
      const signature = req.headers['webhook-signature'] as string;
      const rawBody = JSON.stringify(req.body);

      if (!verifyWebhookSignature(process.env.FATHOM_WEBHOOK_SECRET!, signature, rawBody)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const payload: FathomWebhookPayload = req.body;

      // Log to GitHub (async, don't wait)
      services.githubLogger.logTranscript(payload).catch(console.error);

      // Extract action items
      const transcript = payload.transcript?.text || '';
      const summary = payload.summary;

      if (!transcript) {
        return res.status(400).json({ error: 'No transcript found in webhook' });
      }

      const actionItems = await services.actionExtractor.extract(transcript, summary);

      if (actionItems.length === 0) {
        return res.json({ message: 'No action items found', actionItems: [] });
      }

      // Transform to Linear format
      const linearIssues = await Promise.all(
        actionItems.map((item) => services.linearTransformer.transformActionItem(item))
      );

      // If Slack review is enabled
      if (services.slackReviewer) {
        const reviewId = await services.slackReviewer.requestReview(actionItems, linearIssues);
        
        services.slackReviewer.setReviewCallback(reviewId, async (approved: boolean) => {
          if (approved) {
            const issueIds = await services.linearCreator.createIssues(linearIssues);
            console.log(`Created ${issueIds.length} issues in Linear:`, issueIds);
          }
        });
      } else {
        // Create issues directly
        const issueIds = await services.linearCreator.createIssues(linearIssues);
        console.log(`Created ${issueIds.length} issues in Linear:`, issueIds);
      }

      res.json({
        message: 'Processing started',
        actionItemsCount: actionItems.length,
        reviewRequired: !!services.slackReviewer,
      });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
```

## Dependencies

```json
{
  "dependencies": {
    "@linear/sdk": "^2.0.0",
    "@octokit/rest": "^20.0.0",
    "@slack/bolt": "^3.17.0",
    "express": "^4.18.0",
    "openai": "^4.20.0",
    "dotenv": "^16.3.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0"
  }
}
```

## Environment Variables (.env.example)

```bash
# Server
PORT=3000
NODE_ENV=development

# Fathom
FATHOM_WEBHOOK_SECRET=your_webhook_secret_from_fathom

# GitHub
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_REPO_OWNER=your_username
GITHUB_REPO_NAME=transcripts-repo

# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key

# Linear
LINEAR_API_KEY=lin_api_your_linear_api_key
LINEAR_TEAM_ID=team_id_from_linear
LINEAR_PROJECT_ID=project_id_from_linear  # Optional

# Slack (Optional)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_CHANNEL_ID=C1234567890  # Channel ID where reviews appear
```

