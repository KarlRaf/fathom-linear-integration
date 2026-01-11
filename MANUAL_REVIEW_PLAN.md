# Manual Review Creation Feature Plan

## Overview

Enable users to manually create reviews by pasting a meeting transcript, optionally adding a summary and domain name. This allows processing transcripts that didn't come through Fathom webhooks, useful for testing, historical data, or external transcripts.

## Goals

1. **Manual Transcript Input**: Allow users to paste a transcript via the webapp
2. **Domain Categorization**: Explicitly set domain name for better GitHub repository organization
3. **Same Processing Pipeline**: Use existing action extraction, Linear transformation, and review storage
4. **GitHub Logging**: Log to GitHub with proper domain categorization

## User Flow

1. User navigates to a "Create Review" page
2. User pastes transcript text
3. User optionally adds:
   - Meeting summary
   - Meeting title (defaults to "Manual Review - [timestamp]")
   - Domain name (for GitHub categorization)
4. User clicks "Create Review"
5. System processes transcript (extracts action items, creates Linear previews)
6. Review appears in the reviews list with "pending" status
7. User can approve/reject/edit as normal

## Technical Architecture

### Frontend Components

#### New Page: `/app/reviews/create/page.tsx`
- Form with:
  - **Transcript textarea** (required, large)
  - **Summary textarea** (optional)
  - **Meeting Title input** (optional, defaults to "Manual Review - [date]")
  - **Domain Name input** (optional, for GitHub categorization)
  - **Character count** for transcript
  - **Submit button** with loading state
  - **Cancel/Link to reviews** button

#### UI Integration
- Add "Create Review" button/link to:
  - Home page
  - Reviews page header
  - Settings page (optional)

### Backend API

#### New Endpoint: `POST /api/reviews/create`

**Request Body**:
```typescript
{
  transcript: string;      // Required
  summary?: string;        // Optional
  meetingTitle?: string;   // Optional, defaults to "Manual Review - [timestamp]"
  domain?: string;         // Optional, for GitHub categorization
}
```

**Response**:
```typescript
{
  success: boolean;
  reviewId: string;
  review: ReviewRequest;
  error?: string;
}
```

**Implementation Logic**:
1. Validate input (transcript required, non-empty)
2. Extract action items using `ActionItemExtractor`
3. Transform to Linear format using `LinearTransformer`
4. Generate review ID
5. Create review in `ReviewStorage` with:
   - `status: 'pending'`
   - `domain`: Provided domain or null
   - `meetingTitle`: Provided title or "Manual Review - [timestamp]"
   - All action items and Linear issue previews
6. Log to GitHub with domain (if provided)
7. Return review data

### GitHub Logger Integration

**Current Behavior**:
- `GitHubLogger.logTranscript()` extracts domain from `calendar_invitees`
- Uses domain for file path: `transcripts/{domain}/{date}/{id}.json`

**New Behavior**:
- If domain is explicitly provided, use it directly
- If not provided, extract from calendar_invitees (if available)
- Fallback: Use "manual" or "unknown" domain

**Options**:
1. **Option A**: Modify `GitHubLogger.logTranscript()` to accept optional domain parameter
2. **Option B**: Create a new method `logManualTranscript()` that accepts domain
3. **Option C**: Create a wrapper payload that includes the domain

**Recommendation**: Option A - Add optional `domain` parameter to existing method

### Review Storage

**No changes needed** - The existing `ReviewStorage.storeReview()` already supports:
- `domain?: string` field
- Manual `reviewId` generation
- All required fields

### Data Flow

```
User Input (Transcript, Summary, Domain, Title)
    ↓
POST /api/reviews/create
    ↓
ActionItemExtractor.extract(transcript, summary)
    ↓
LinearTransformer.transformActionItem() for each
    ↓
ReviewStorage.storeReview({
  reviewId: generated,
  actionItems: [...],
  linearIssues: [...],
  domain: provided || null,
  meetingTitle: provided || "Manual Review - [timestamp]",
  status: 'pending',
  ...
})
    ↓
GitHubLogger.logTranscript(payload, domain)
    ↓
Return review data to frontend
    ↓
Frontend redirects to /reviews/{reviewId}
```

## Implementation Phases

### Phase 1: Backend API Endpoint
- [ ] Create `app/api/reviews/create/route.ts`
- [ ] Implement validation
- [ ] Integrate with ActionItemExtractor
- [ ] Integrate with LinearTransformer
- [ ] Store review using ReviewStorage
- [ ] Handle errors gracefully

### Phase 2: GitHub Logger Enhancement
- [ ] Modify `GitHubLogger.logTranscript()` to accept optional `domain` parameter
- [ ] Update method signature and implementation
- [ ] Ensure backward compatibility (existing webhook flow)
- [ ] Test with and without domain

### Phase 3: Frontend UI
- [ ] Create `app/reviews/create/page.tsx`
- [ ] Design form layout
- [ ] Add form validation
- [ ] Implement submit handler
- [ ] Add loading states
- [ ] Add success/error handling
- [ ] Add navigation (Home, Reviews links)

### Phase 4: Integration & Navigation
- [ ] Add "Create Review" button to home page
- [ ] Add "Create Review" button to reviews page header
- [ ] Test end-to-end flow
- [ ] Test with various inputs (empty, long transcripts, special characters)

## Code Examples

### API Route: `app/api/reviews/create/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ActionItemExtractor } from '../../../../src/services/ai/action-extractor';
import { LinearTransformer } from '../../../../src/services/linear/transformer';
import { reviewStorage } from '../../../../src/services/review/review-storage';
import { GitHubLogger } from '../../../../src/services/github/logger';
import { config } from '../../../../src/config/env';
import { logger } from '../../../../src/utils/logger';

const actionExtractor = new ActionItemExtractor(config.openai.apiKey);
const linearTransformer = new LinearTransformer(config.linear);
const githubLogger = new GitHubLogger(config.github);

export async function POST(request: NextRequest) {
  try {
    const { transcript, summary, meetingTitle, domain } = await request.json();
    
    // Validation
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required and cannot be empty' },
        { status: 400 }
      );
    }
    
    if (transcript.length > 500000) { // ~500KB limit
      return NextResponse.json(
        { error: 'Transcript is too long (max 500,000 characters)' },
        { status: 400 }
      );
    }
    
    // Generate review ID
    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract action items
    logger.info(`Extracting action items from manual transcript (${transcript.length} chars)`);
    const actionItems = await actionExtractor.extract(transcript, summary || '');
    
    if (actionItems.length === 0) {
      return NextResponse.json(
        { error: 'No action items found in transcript' },
        { status: 400 }
      );
    }
    
    // Transform to Linear format
    const linearIssues = await Promise.all(
      actionItems.map(item => linearTransformer.transformActionItem(item))
    );
    
    // Generate meeting title if not provided
    const finalMeetingTitle = meetingTitle?.trim() || `Manual Review - ${new Date().toLocaleString()}`;
    
    // Store review
    const review = await reviewStorage.storeReview({
      reviewId,
      actionItems,
      linearIssues,
      recordingId: `manual_${Date.now()}`,
      meetingTitle: finalMeetingTitle,
      summary: summary || '',
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      domain: domain?.trim() || undefined,
      approvedIssueIndices: [],
      rejectedIssueIndices: [],
    });
    
    // Log to GitHub (async, don't wait)
    if (config.github.enabled) {
      // Create a mock payload for GitHub logging
      const mockPayload = {
        recording: {
          id: `manual_${Date.now()}`,
          title: finalMeetingTitle,
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: 0,
        },
        transcript: { text: transcript },
        summary: summary || '',
        calendar_invitees: domain ? [{ email_domain: domain }] : [],
      };
      
      githubLogger.logTranscript(mockPayload, domain || undefined).catch(err => {
        logger.error('Failed to log manual transcript to GitHub:', err);
      });
    }
    
    logger.info(`Created manual review ${reviewId} with ${actionItems.length} action items`);
    
    return NextResponse.json({
      success: true,
      reviewId,
      review,
    });
  } catch (error) {
    logger.error('Failed to create manual review:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create review',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
```

### Frontend Page: `app/reviews/create/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Spinner from '../../components/Spinner';
import Toast from '../../components/Toast';

export default function CreateReviewPage() {
  const router = useRouter();
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [domain, setDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transcript.trim()) {
      setToast({ type: 'error', text: 'Transcript is required' });
      return;
    }
    
    try {
      setSubmitting(true);
      setToast(null);
      
      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
          summary: summary.trim() || undefined,
          meetingTitle: meetingTitle.trim() || undefined,
          domain: domain.trim() || undefined,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create review');
      }
      
      const result = await response.json();
      
      setToast({ 
        type: 'success', 
        text: `Review created successfully! Redirecting...` 
      });
      
      // Redirect to review detail page
      setTimeout(() => {
        router.push(`/reviews/${result.reviewId}`);
      }, 1500);
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create review',
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <>
      <Toast message={toast} onClose={() => setToast(null)} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Create Review</h1>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>
                Home
              </Link>
              <Link href="/reviews" style={{ color: '#2563eb', textDecoration: 'none' }}>
                Reviews →
              </Link>
            </div>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Paste a meeting transcript to create a review. Action items will be extracted automatically.
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Domain Name */}
          <div style={{ marginBottom: '1.5rem', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', backgroundColor: '#f9fafb' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Domain Name (Optional)
            </label>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
              Used for GitHub repository categorization (e.g., "acme.com")
            </p>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="acme.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
              }}
            />
          </div>
          
          {/* Meeting Title */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Meeting Title (Optional)
            </label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="Auto-generated if not provided"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
              }}
            />
          </div>
          
          {/* Summary */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Summary (Optional)
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Meeting summary..."
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                resize: 'vertical',
              }}
            />
          </div>
          
          {/* Transcript */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Transcript *
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste meeting transcript here..."
              rows={20}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
            <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.75rem' }}>
              {transcript.length.toLocaleString()} characters
            </div>
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <Link
              href="/reviews"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                color: '#6b7280',
                textDecoration: 'none',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                backgroundColor: 'white',
                fontWeight: 500,
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !transcript.trim()}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: submitting || !transcript.trim() ? '#d1d5db' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: submitting || !transcript.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
                fontWeight: 600,
              }}
            >
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Spinner size={16} />
                  Creating Review...
                </span>
              ) : (
                'Create Review'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
```

### GitHub Logger Enhancement

**Modify `src/services/github/logger.ts`**:

```typescript
async logTranscript(payload: FathomWebhookPayload, explicitDomain?: string): Promise<void> {
  // Use explicit domain if provided, otherwise extract from payload
  const domain = explicitDomain || extractPrimaryDomain(payload.calendar_invitees) || 'unknown';
  
  // ... rest of the method remains the same, using `domain` variable
}
```

## Navigation Updates

### Home Page (`app/page.tsx`)
Add a new card:
```typescript
<Link href="/reviews/create" style={{ textDecoration: 'none' }}>
  <div style={{...}}>
    <h2>➕ Create Review</h2>
    <p>Manually create a review from a pasted transcript</p>
  </div>
</Link>
```

### Reviews Page (`app/reviews/page.tsx`)
Add button in header:
```typescript
<Link 
  href="/reviews/create"
  style={{
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 600,
  }}
>
  ➕ Create Review
</Link>
```

## Error Handling

1. **Validation Errors**:
   - Empty transcript
   - Transcript too long (>500KB)
   - Invalid domain format (optional validation)

2. **Processing Errors**:
   - AI extraction failure
   - Linear transformation failure
   - Review storage failure
   - GitHub logging failure (non-blocking)

3. **User Feedback**:
   - Toast notifications for errors
   - Loading states during processing
   - Success redirect to review page

## Testing Considerations

1. **Unit Tests**:
   - API endpoint validation
   - Error handling
   - Domain parameter handling

2. **Integration Tests**:
   - End-to-end flow (create → view → approve)
   - GitHub logging with domain
   - GitHub logging without domain

3. **Manual Testing**:
   - Various transcript formats
   - Long transcripts
   - Special characters
   - Empty/invalid inputs
   - Domain categorization in GitHub

## Future Enhancements

1. **File Upload**: Allow uploading transcript files (PDF, TXT, DOCX)
2. **Template Selection**: Pre-fill domain/title from templates
3. **Bulk Import**: Upload multiple transcripts at once
4. **Transcript Preview**: Show extracted action items before creating review
5. **Domain Autocomplete**: Suggest domains from previous reviews
6. **Import from Fathom**: Link to Fathom account to import past recordings

## Open Questions

1. **Domain Validation**: Should we validate domain format (e.g., valid TLD)?
2. **Rate Limiting**: Should manual review creation be rate-limited?
3. **Permissions**: Should this feature require authentication (future)?
4. **Transcript Format**: Should we support structured formats (JSON, CSV)?

## Success Criteria

- ✅ Users can paste transcripts and create reviews
- ✅ Domain is properly categorized in GitHub
- ✅ Reviews appear in the reviews list
- ✅ All existing review features work (approve, reject, edit)
- ✅ GitHub logging works with explicit domain
- ✅ Error handling is robust
- ✅ UI is intuitive and matches existing design
