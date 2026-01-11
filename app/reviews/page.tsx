'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import CopyButton from '../components/CopyButton';
import LogoutButton from '../components/LogoutButton';

interface ReviewSummary {
  reviewId: string;
  meetingTitle: string;
  timestamp: number;
  createdAt: string;
  actionItemsCount: number;
  status: string;
  recordingId: string;
  domain?: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    fetchReviews();
    // Poll for new reviews every 30 seconds
    const interval = setInterval(fetchReviews, 30000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const response = await fetch(`/api/reviews?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      const data = await response.json();
      // Debug: log first review to check if domain exists
      if (data.length > 0 && process.env.NODE_ENV === 'development') {
        console.log('Sample review data:', { 
          reviewId: data[0].reviewId, 
          domain: data[0].domain,
          hasDomain: !!data[0].domain 
        });
      }
      setReviews(data);
      setError(null);
      // Clear selection when reviews change
      setSelectedReviews(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const styleMap: Record<string, React.CSSProperties> = {
      pending: { background: '#fef3c7', color: '#92400e', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 },
      approved: { background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 },
      rejected: { background: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 },
      'partially-approved': { background: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 },
    };
    return (
      <span style={styleMap[status] || styleMap.pending}>
        {status.replace('-', ' ').toUpperCase()}
      </span>
    );
  };

  const isDoneStatus = (status: string) => {
    return status === 'approved' || status === 'rejected';
  };

  const getCardBackgroundColor = (status: string) => {
    if (isDoneStatus(status)) {
      return status === 'approved' ? '#f0fdf4' : '#fef2f2'; // Light green for approved, light red for rejected
    }
    return 'transparent';
  };

  const getCardBorderColor = (status: string) => {
    if (isDoneStatus(status)) {
      return status === 'approved' ? '#bbf7d0' : '#fecaca'; // Border matching background
    }
    return '#e5e7eb';
  };

  const toggleReviewSelection = (reviewId: string) => {
    setSelectedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedReviews.size === reviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(reviews.map(r => r.reviewId)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedReviews.size === 0) return;
    
    if (!confirm(`Are you sure you want to approve ${selectedReviews.size} review(s) and create Linear issues?`)) {
      return;
    }

    try {
      setBulkProcessing(true);
      setToast(null);
      
      const response = await fetch('/api/reviews/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewIds: Array.from(selectedReviews) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bulk approve reviews');
      }

      const result = await response.json();
      const { summary } = result;
      
      setToast({
        type: 'success',
        text: `Successfully approved ${summary.successful} review(s). ${summary.failed > 0 ? `${summary.failed} failed.` : ''}`,
      });
      
      setSelectedReviews(new Set());
      await fetchReviews();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to bulk approve reviews',
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedReviews.size === 0) return;
    
    if (!confirm(`Are you sure you want to reject ${selectedReviews.size} review(s)?`)) {
      return;
    }

    try {
      setBulkProcessing(true);
      setToast(null);
      
      const response = await fetch('/api/reviews/bulk-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewIds: Array.from(selectedReviews) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bulk reject reviews');
      }

      const result = await response.json();
      const { summary } = result;
      
      setToast({
        type: 'success',
        text: `Successfully rejected ${summary.successful} review(s). ${summary.failed > 0 ? `${summary.failed} failed.` : ''}`,
      });
      
      setSelectedReviews(new Set());
      await fetchReviews();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to bulk reject reviews',
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReviews.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedReviews.size} review(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setBulkProcessing(true);
      setToast(null);
      
      const response = await fetch('/api/reviews/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewIds: Array.from(selectedReviews) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bulk delete reviews');
      }

      const result = await response.json();
      const { summary } = result;
      
      setToast({
        type: 'success',
        text: `Successfully deleted ${summary.successful} review(s). ${summary.failed > 0 ? `${summary.failed} failed.` : ''}`,
      });
      
      setSelectedReviews(new Set());
      await fetchReviews();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to bulk delete reviews',
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  useEffect(() => {
    if (error) {
      setToast({ type: 'error', text: error });
      setError(null);
    }
  }, [error]);

  const allSelected = reviews.length > 0 && selectedReviews.size === reviews.length;
  const someSelected = selectedReviews.size > 0 && selectedReviews.size < reviews.length;

  return (
    <>
      <Toast message={toast} onClose={() => setToast(null)} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Reviews</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>
            Home
          </Link>
          <Link 
            href="/reviews/create"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            ➕ Create Review
          </Link>
          <Link href="/settings" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}>
            Settings
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600 }}>Filter by status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="partially-approved">Partially Approved</option>
        </select>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedReviews.size > 0 && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '0.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ fontWeight: 600, color: '#1e40af' }}>
            {selectedReviews.size} review{selectedReviews.size !== 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleBulkApprove}
              disabled={bulkProcessing}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                opacity: bulkProcessing ? 0.6 : 1,
                fontWeight: 600,
              }}
            >
              {bulkProcessing ? 'Processing...' : '✅ Approve Selected'}
            </button>
            <button
              onClick={handleBulkReject}
              disabled={bulkProcessing}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                opacity: bulkProcessing ? 0.6 : 1,
                fontWeight: 600,
              }}
            >
              {bulkProcessing ? 'Processing...' : '❌ Reject Selected'}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkProcessing}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                opacity: bulkProcessing ? 0.6 : 1,
                fontWeight: 600,
              }}
            >
              {bulkProcessing ? 'Processing...' : '🗑️ Delete Selected'}
            </button>
            <button
              onClick={() => setSelectedReviews(new Set())}
              disabled={bulkProcessing}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
          <Spinner size={32} />
          <span style={{ color: '#6b7280', fontSize: '1rem' }}>Loading reviews...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ 
          padding: '4rem 2rem', 
          textAlign: 'center', 
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
            No reviews yet
          </h2>
          <p style={{ color: '#6b7280', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
            Reviews will appear here when Fathom webhooks are received. Make sure your webhook URL is configured correctly in Settings.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Select All Checkbox */}
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected;
              }}
              onChange={toggleSelectAll}
              style={{
                width: '1rem',
                height: '1rem',
                cursor: 'pointer',
              }}
            />
            <label style={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={toggleSelectAll}>
              Select All ({reviews.length} reviews)
            </label>
          </div>

          {reviews.map((review) => {
            const isSelected = selectedReviews.has(review.reviewId);
            return (
              <div
                key={review.reviewId}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'stretch',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1.5rem 0.5rem',
                }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleReviewSelection(review.reviewId)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <Link
                  href={`/reviews/${review.reviewId}`}
                  style={{
                    flex: 1,
                    display: 'block',
                    padding: '1.5rem',
                    border: `1px solid ${isSelected ? '#3b82f6' : getCardBorderColor(review.status)}`,
                    borderRadius: '0.5rem',
                    backgroundColor: isSelected ? '#eff6ff' : getCardBackgroundColor(review.status),
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      const baseBg = getCardBackgroundColor(review.status);
                      e.currentTarget.style.backgroundColor = baseBg === 'transparent' ? '#f9fafb' : baseBg === '#f0fdf4' ? '#ecfdf5' : '#fef2f2';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = getCardBackgroundColor(review.status);
                      e.currentTarget.style.borderColor = getCardBorderColor(review.status);
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, marginBottom: '0.25rem' }}>
                        {review.meetingTitle}
                      </h2>
                      {review.domain && (
                        <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                          🏢 {review.domain}
                        </div>
                      )}
                    </div>
                    {getStatusBadge(review.status)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    {review.actionItemsCount} action item{review.actionItemsCount !== 1 ? 's' : ''} • {formatDate(review.timestamp)}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                    <span>Recording ID: {review.recordingId}</span>
                    <CopyButton text={review.reviewId} label="ID" size="small" />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </>
  );
}
