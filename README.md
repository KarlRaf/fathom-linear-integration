# Fathom-Linear Integration

A serverless application that automatically extracts action items from Fathom meeting transcripts and creates Linear issues. Features a web-based interface for reviewing, managing, and configuring the integration.

## Features

- **Automated Action Item Extraction**: Uses OpenAI to extract action items from Fathom meeting transcripts
- **Linear Integration**: Automatically creates Linear issues from extracted action items
- **Web-based Review Interface**: Review and manage action items before creating Linear issues
- **Configurable Prompts**: Edit AI prompts via the web interface without redeploying
- **Settings Management**: Configure webhook URL, Linear credentials, and AI prompts through the UI
- **Manual Review Creation**: Create reviews by pasting meeting transcripts
- **Bulk Operations**: Approve, reject, or delete multiple reviews at once
- **GitHub Logging**: Optional logging of transcripts to GitHub repository
- **Secure Authentication**: Password-protected web interface

## Architecture

- **Backend**: Express.js server for webhook handling
- **Frontend**: Next.js 14 with App Router for the web interface
- **Storage**: Vercel KV for persistent storage of settings and reviews
- **Deployment**: Vercel (serverless functions)

## Getting Started

### Prerequisites

- Node.js 18+
- Vercel account
- OpenAI API key
- Linear API key
- (Optional) GitHub token for transcript logging

### Environment Variables

Create a `.env` file or set these in Vercel:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Linear
LINEAR_API_KEY=lin_api_...
LINEAR_TEAM_ID=...
LINEAR_PROJECT_ID=... # Optional
LINEAR_STATE_ID=... # Optional

# Authentication
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-key

# Vercel KV (automatically configured if using Vercel KV)
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...

# GitHub (Optional)
GITHUB_TOKEN=... # Optional, for transcript logging
GITHUB_REPO_OWNER=... # Optional
GITHUB_REPO_NAME=... # Optional

# Fathom Webhook
FATHOM_WEBHOOK_SECRET=... # Your Fathom webhook signing secret
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/fathom-linear-integration.git
cd fathom-linear-integration
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see above)

4. Deploy to Vercel:
```bash
vercel
```

Or push to GitHub and connect your repository to Vercel for automatic deployments.

### Configuration

After deployment, access the web interface and configure:

1. **Settings Page** (`/settings`):
   - Fathom webhook URL
   - AI prompts (extraction and recap)
   - Linear credentials (API key, team ID, project ID, state ID, assignee)
   - Test prompts with preview functionality

2. **Reviews Page** (`/reviews`):
   - View all reviews (pending, approved, rejected)
   - Filter by status
   - Bulk operations (approve, reject, delete)

3. **Manual Review Creation** (`/reviews/create`):
   - Paste meeting transcripts
   - Add domain for GitHub categorization
   - Generate action items and Linear issues

## Usage

### Webhook Setup

1. In Fathom, configure your webhook URL to point to:
   ```
   https://your-domain.vercel.app/webhook/fathom
   ```

2. Set the webhook secret in your environment variables (`FATHOM_WEBHOOK_SECRET`)

3. When a meeting is recorded, Fathom will send a webhook, and the system will:
   - Extract action items from the transcript
   - Create a review request
   - Optionally log the transcript to GitHub

### Review Process

1. **View Reviews**: Navigate to `/reviews` to see all review requests
2. **Review Details**: Click on a review to see action items and Linear issue previews
3. **Approve/Reject**: 
   - Approve all items at once
   - Approve/reject individual items
   - Edit items before approval
4. **Create Linear Issues**: Approved items are automatically created as Linear issues

### Settings Management

Access `/settings` to:
- Update the Fathom webhook URL
- Edit AI prompts (with preview functionality)
- Configure Linear credentials
- Refresh prompt cache

## Project Structure

```
.
├── app/                      # Next.js app directory
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication routes
│   │   ├── reviews/        # Review management routes
│   │   └── settings/       # Settings management routes
│   ├── components/         # React components
│   ├── login/              # Login page
│   ├── reviews/            # Review pages
│   └── settings/           # Settings page
├── src/                     # Backend source code
│   ├── routes/             # Express routes
│   ├── services/           # Business logic services
│   │   ├── ai/            # AI services (action extraction, recap)
│   │   ├── config/        # Settings service
│   │   ├── github/        # GitHub logging
│   │   ├── linear/        # Linear integration
│   │   ├── review/        # Review storage
│   │   └── slack/         # Slack integration (optional)
│   ├── config/            # Configuration
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── middleware.ts           # Next.js middleware for auth
└── vercel.json            # Vercel configuration
```

## API Endpoints

### Webhooks

- `POST /webhook/fathom` - Receives Fathom webhooks

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check authentication status

### Reviews

- `GET /api/reviews` - List all reviews (with optional filtering)
- `GET /api/reviews/[reviewId]` - Get a specific review
- `POST /api/reviews/create` - Manually create a review from transcript
- `POST /api/reviews/[reviewId]/approve` - Approve all items in a review
- `POST /api/reviews/[reviewId]/reject` - Reject a review
- `POST /api/reviews/[reviewId]/finalize` - Finalize partially approved review
- `POST /api/reviews/[reviewId]/issues/[issueIndex]/approve` - Approve a single issue
- `POST /api/reviews/[reviewId]/issues/[issueIndex]/reject` - Reject a single issue
- `PUT /api/reviews/[reviewId]/action-items/[index]` - Edit an action item
- `POST /api/reviews/bulk-approve` - Bulk approve reviews
- `POST /api/reviews/bulk-reject` - Bulk reject reviews
- `POST /api/reviews/bulk-delete` - Bulk delete reviews

### Settings

- `GET /api/settings` - Get current settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/refresh-cache` - Refresh settings cache
- `POST /api/settings/preview` - Preview AI prompt output
- `GET /api/settings/linear-credentials` - Get Linear credentials

## Development

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`

3. Run the development server:
```bash
npm run dev
```

4. Access the application at `http://localhost:3000`

### Building

```bash
npm run build
```

### Type Checking

```bash
npx tsc --noEmit
```

## Deployment

The application is designed to be deployed on Vercel:

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

Or deploy manually:
```bash
vercel
```

## Security

- Password-based authentication for the web interface
- JWT tokens stored in HTTP-only cookies
- Environment variables for sensitive configuration
- Webhook signature verification for Fathom webhooks

## Troubleshooting

### Login Issues

- Ensure `ADMIN_PASSWORD` and `JWT_SECRET` are set in environment variables
- Check that cookies are enabled in your browser
- Verify the password doesn't have leading/trailing whitespace

### Webhook Issues

- Verify `FATHOM_WEBHOOK_SECRET` matches your Fathom configuration
- Check webhook URL is correct in Fathom settings
- Review Vercel logs for error messages

### Linear Issues Not Created

- Verify Linear API key and team ID are correct
- Check Linear credentials in settings page
- Review Vercel logs for API errors

### Prompt Issues

- Use the preview functionality in settings to test prompts
- Check prompt cache and refresh if needed
- Verify OpenAI API key is valid

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
