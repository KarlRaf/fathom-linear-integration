# Retry Strategy for Timeout Handling

## Problem

Vercel's free tier has a **10-second timeout** for serverless functions. Our webhook processing (AI extraction + recap generation + Slack posting) can take 15-30 seconds, causing timeouts.

## Options

### Option 1: Optimize Processing (Current Approach)
- ✅ Already done: Recap generation is async (fire-and-forget)
- ⚠️ Still blocking: AI extraction and Slack review posting
- **Pros**: No infrastructure changes needed
- **Cons**: Still may timeout on slower responses

### Option 2: Queue-Based Processing (Recommended for Production)
- Use Vercel Queue or Upstash Queue
- Return 202 Accepted immediately after signature verification
- Process everything in background jobs
- **Pros**: Reliable, handles retries, no timeouts
- **Cons**: Requires queue infrastructure, more complex

### Option 3: Retry Logic for Individual Operations
- Add exponential backoff retries for AI/API calls
- Handle transient failures gracefully
- **Pros**: Improves reliability, no infrastructure needed
- **Cons**: Doesn't solve timeout issue, just handles failures better

### Option 4: Upgrade Vercel Plan
- Pro plan has 60-second timeout
- **Pros**: Simple, solves the problem
- **Cons**: Costs money (~$20/month)

### Option 5: Move Heavy Processing to Separate Service
- Keep webhook handler lightweight (just verification + queuing)
- Use separate service/worker for processing
- **Pros**: Flexible, scalable
- **Cons**: More infrastructure to manage

## Recommended Approach

**Short-term**: Option 3 (Retry Logic) + Option 1 (Optimization)
- Add retry logic with exponential backoff for API calls
- Handle transient failures gracefully
- Accept that free tier has limitations

**Long-term**: Option 2 (Queue-Based) or Option 4 (Upgrade Plan)
- For production, use a queue system for reliable processing
- Or upgrade to Pro plan for 60-second timeout

## Implementation Plan

1. Add retry utility with exponential backoff
2. Wrap AI extraction and API calls with retry logic
3. Add timeout detection and graceful degradation
4. Log retries for monitoring
5. (Future) Implement queue-based processing for production

