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
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {submitting ? (
                <>
                  <Spinner size={16} />
                  Creating Review...
                </>
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
