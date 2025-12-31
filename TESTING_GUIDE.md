# Step-by-Step Testing Guide

This guide helps you test each component of the application individually before testing the full flow.

## Prerequisites

1. Make sure your `.env` file is configured with all required API keys
2. Start your development server:
   ```bash
   npm run dev
   ```

## Test Endpoints

All test endpoints are available at `http://localhost:3000/test/` and only work in development mode.

### Step 1: Test GitHub Logging

**Endpoint:** `POST /test/test-github`

Tests if transcripts are successfully logged to your GitHub repository.

**Test with:**
```bash
curl -X POST http://localhost:3000/test/test-github \
  -H "Content-Type: application/json" \
  -d @mock-webhook-payload.json
```

**What to check:**
- ✅ Response shows success
- ✅ Go to your GitHub repo: `the-revenue-architects`
- ✅ Check the `call_transcript/` folder
- ✅ Verify the transcript file was created

**Expected Response:**
```json
{
  "success": true,
  "message": "Transcript logged to GitHub successfully",
  "recordingId": "91811043",
  "filename": "call_transcript/2024-12-31/91811043.json"
}
```

---

### Step 2: Test Action Items Extraction

**Endpoint:** `POST /test/test-extract`

Tests if action items are correctly extracted from the transcript using OpenAI.

**Test with:**
```bash
curl -X POST http://localhost:3000/test/test-extract \
  -H "Content-Type: application/json" \
  -d @mock-webhook-payload.json
```

**What to check:**
- ✅ Response shows extracted action items
- ✅ Review the action items for accuracy
- ✅ Check titles, descriptions, priorities, assignees

**Expected Response:**
```json
{
  "success": true,
  "message": "Action items extracted successfully",
  "actionItemsCount": 4,
  "actionItems": [
    {
      "title": "...",
      "description": "...",
      "priority": "high",
      "assignee": "...",
      ...
    }
  ]
}
```

---

### Step 3: Test Slack Review

**Endpoint:** `POST /test/test-slack`

Tests if the review message is posted to your Slack channel (without creating Linear issues).

**Test with:**
```bash
curl -X POST http://localhost:3000/test/test-slack \
  -H "Content-Type: application/json" \
  -d @mock-webhook-payload.json
```

**What to check:**
- ✅ Response shows review was posted
- ✅ Go to your Slack channel
- ✅ Verify the review message appears with action items
- ✅ Check that Approve/Reject buttons are present
- ⚠️ Note: Clicking buttons won't create Linear issues in this test mode

**Expected Response:**
```json
{
  "success": true,
  "message": "Review posted to Slack successfully",
  "reviewId": "review_1234567890_abc123",
  "actionItemsCount": 4,
  "linearIssuesPreview": [...]
}
```

---

### Step 4: Test Linear Issue Creation

**Endpoint:** `POST /test/test-linear`

Tests if issues are created directly in Linear (bypasses Slack review).

**⚠️ Warning:** This will create real issues in Linear!

**Test with:**
```bash
curl -X POST http://localhost:3000/test/test-linear \
  -H "Content-Type: application/json" \
  -d @mock-webhook-payload.json
```

**What to check:**
- ✅ Response shows issues were created
- ✅ Go to your Linear workspace
- ✅ Verify the issues appear
- ✅ Check titles, descriptions, priorities, assignees

**Expected Response:**
```json
{
  "success": true,
  "message": "Issues created in Linear successfully",
  "issuesCount": 4,
  "issueIds": ["abc-123", "def-456", ...],
  "issuesPreview": [...]
}
```

---

### Full Flow Test

**Endpoint:** `POST /test/mock-webhook`

Tests the complete flow: GitHub → Extract → Slack → Linear (after approval).

**Test with:**
```bash
curl -X POST http://localhost:3000/test/mock-webhook \
  -H "Content-Type: application/json" \
  -d @mock-webhook-payload.json
```

Or use the script:
```bash
./test-webhook.sh
```

---

## Quick Test Script

Use the provided script to test steps individually or all at once:

```bash
# Test a specific step
./test-steps.sh github    # Test GitHub logging
./test-steps.sh extract   # Test action items extraction
./test-steps.sh slack     # Test Slack review
./test-steps.sh linear    # Test Linear creation

# Test all steps in sequence (with pauses)
./test-steps.sh all
```

---

## Testing Checklist

Use this checklist to verify each component:

- [ ] **GitHub Logging**
  - [ ] Transcript file created in repository
  - [ ] File is in correct folder structure (`call_transcript/YYYY-MM-DD/`)
  - [ ] File contains complete transcript data

- [ ] **Action Items Extraction**
  - [ ] Action items are extracted from transcript
  - [ ] Titles are clear and actionable
  - [ ] Descriptions include context
  - [ ] Priorities are set correctly
  - [ ] Assignees are identified (if mentioned)

- [ ] **Slack Review**
  - [ ] Message appears in Slack channel
  - [ ] All action items are displayed
  - [ ] Approve/Reject buttons work
  - [ ] Message formatting looks good

- [ ] **Linear Issue Creation**
  - [ ] Issues are created in Linear
  - [ ] Titles and descriptions are correct
  - [ ] Priorities are mapped correctly
  - [ ] Assignees are set (if found)
  - [ ] Issues are in correct team/project

---

## Troubleshooting

### GitHub Logging Fails
- Check `GITHUB_TOKEN` is valid
- Verify `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` are correct
- Ensure the repository exists and token has write access

### Action Items Extraction Fails
- Check `OPENAI_API_KEY` is valid
- Verify you have API credits
- Check transcript is not empty

### Slack Review Fails
- Check `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` are correct
- Verify `SLACK_CHANNEL_ID` is correct
- Ensure bot is invited to the channel
- Check Slack app has required permissions

### Linear Creation Fails
- Check `LINEAR_API_KEY` is valid
- Verify `LINEAR_TEAM_ID` is correct
- Ensure API key has permissions to create issues
- Check team ID exists in your workspace

