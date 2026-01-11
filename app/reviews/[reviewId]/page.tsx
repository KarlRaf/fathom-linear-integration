'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Spinner from '../../components/Spinner';
import Toast from '../../components/Toast';
import CopyButton from '../../components/CopyButton';
import LogoutButton from '../../components/LogoutButton';

interface ActionItem {
  title: string;
  description: string;
  assignee?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

interface LinearIssueInput {
  title: string;
  description: string;
  teamId: string;
  projectId?: string;
  assigneeId?: string;
  priority?: number;
  dueDate?: string;
}

interface Review {
  reviewId: string;
  actionItems: ActionItem[];
  linearIssues: LinearIssueInput[];
  recordingId: string;
  meetingTitle: string;
  summary?: string;
  timestamp: number;
  createdAt: string;
  status: string;
  approvedIssueIndices?: number[];
  rejectedIssueIndices?: number[];
  editedActionItems?: ActionItem[];
  hasEdits?: boolean;
}

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = params.reviewId as string;
  
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ActionItem>>({});

  useEffect(() => {
    fetchReview();
  }, [reviewId]);

  const fetchReview = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reviews/${reviewId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch review');
      }
      const data = await response.json();
      setReview(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve ALL issues in this review and create them in Linear?')) {
      return;
    }

    try {
      setProcessing(true);
      setMessage(null);
      const response = await fetch(`/api/reviews/${reviewId}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve review');
      }

      const result = await response.json();
      const createdIssues = result.createdIssues || [];
      const createdCount = createdIssues.length || result.createdIssueIds?.length || 0;
      const errorCount = result.errors?.length || 0;
      
      // Store created issue IDs in review state for display
      if (createdIssues.length > 0 || result.createdIssueIds?.length > 0) {
        await fetchReview(); // Refresh to get updated review with issue IDs
      }
      
      if (errorCount > 0) {
        setMessage({ 
          type: 'error', 
          text: `Created ${createdCount} issue(s), but ${errorCount} failed. Check console for details.` 
        });
      } else {
        let messageText = `Successfully created ${createdCount} issue(s) in Linear!`;
        if (createdIssues.length > 0) {
          const linksText = createdIssues.map((issue: { url: string; title: string }) => 
            issue.url ? `\n• ${issue.title}: ${issue.url}` : ''
          ).join('');
          messageText += linksText;
        }
        setMessage({ type: 'success', text: messageText });
        setTimeout(() => {
          router.push('/reviews');
        }, 5000); // Increased timeout to allow reading URLs
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to approve review' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this review?')) {
      return;
    }

    try {
      setProcessing(true);
      setMessage(null);
      const response = await fetch(`/api/reviews/${reviewId}/reject`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject review');
      }

      setMessage({ type: 'success', text: 'Review rejected.' });
      setTimeout(() => {
        router.push('/reviews');
      }, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reject review' });
    } finally {
      setProcessing(false);
    }
  };

  const handleIssueApprove = async (index: number) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/issues/${index}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve issue');
      }

      await fetchReview(); // Refresh review data
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to approve issue' });
    }
  };

  const handleIssueReject = async (index: number) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/issues/${index}/reject`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject issue');
      }

      await fetchReview(); // Refresh review data
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reject issue' });
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Create Linear issues for all approved items?')) {
      return;
    }

    try {
      setProcessing(true);
      setMessage(null);
      const response = await fetch(`/api/reviews/${reviewId}/finalize`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to finalize review');
      }

      const result = await response.json();
      const createdIssues = result.createdIssues || [];
      const successCount = createdIssues.length || result.createdIssueIds?.length || 0;
      const errorCount = result.errors?.length || 0;
      
      if (errorCount > 0) {
        setMessage({ 
          type: 'error', 
          text: `Created ${successCount} issue(s), but ${errorCount} failed. Check console for details.` 
        });
      } else {
        let messageText = `Successfully created ${successCount} issue(s) in Linear!`;
        if (createdIssues.length > 0) {
          const linksText = createdIssues.map((issue: { url: string; title: string }) => 
            issue.url ? `\n• ${issue.title}: ${issue.url}` : ''
          ).join('');
          messageText += linksText;
        }
        setMessage({ type: 'success', text: messageText });
      }
      
      await fetchReview(); // Refresh review data
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to finalize review' });
    } finally {
      setProcessing(false);
    }
  };

  const handleEditStart = (index: number, item: ActionItem) => {
    setEditingIndex(index);
    setEditForm(item);
  };

  const handleEditSave = async (index: number) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/action-items/${index}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update action item');
      }

      setEditingIndex(null);
      setEditForm({});
      await fetchReview(); // Refresh review data
      setMessage({ type: 'success', text: 'Action item updated. Remember to regenerate Linear issues if needed.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update action item' });
    }
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: '#dc2626',
      medium: '#f59e0b',
      low: '#6b7280',
    };
    return colors[priority] || '#6b7280';
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
          <Spinner size={32} />
          <span style={{ color: '#6b7280', fontSize: '1rem' }}>Loading review...</span>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ color: '#dc2626' }}>{error || 'Review not found'}</div>
        <Link href="/reviews" style={{ color: '#2563eb', textDecoration: 'none', marginTop: '1rem', display: 'inline-block' }}>
          ← Back to Reviews
        </Link>
      </div>
    );
  }

  const isProcessed = review.status === 'approved' || review.status === 'rejected';
  const actionItems = review.editedActionItems || review.actionItems;
  const approvedCount = review.approvedIssueIndices?.length || 0;
  const rejectedCount = review.rejectedIssueIndices?.length || 0;
  const totalCount = review.actionItems.length;
  const hasPartialApprovals = approvedCount > 0 || rejectedCount > 0;

  return (
    <>
      <Toast message={message} onClose={() => setMessage(null)} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>
            Home
          </Link>
          <Link href="/reviews" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Back to Reviews
          </Link>
          <div style={{ marginLeft: 'auto' }}>
            <LogoutButton />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0', flex: 1 }}>
            {review.meetingTitle}
          </h1>
          <CopyButton text={reviewId} label="Review ID" size="small" />
        </div>
        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Created: {formatDate(review.timestamp)} • Status: <span style={{ textTransform: 'uppercase' }}>{review.status}</span>
          {hasPartialApprovals && (
            <span> • {approvedCount} approved, {rejectedCount} rejected of {totalCount} total</span>
          )}
        </div>
      </div>


      {review.summary && (
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Summary</h2>
          <p style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{review.summary}</p>
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            Action Items ({actionItems.length})
          </h2>
          {review.hasEdits && (
            <span style={{ fontSize: '0.875rem', color: '#f59e0b', fontWeight: 600 }}>
              ✏️ Has edits
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {actionItems.map((item, index) => {
            const isApproved = review.approvedIssueIndices?.includes(index);
            const isRejected = review.rejectedIssueIndices?.includes(index);
            const isEditing = editingIndex === index;

            return (
              <div
                key={index}
                style={{
                  padding: '1.5rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  backgroundColor: isApproved ? '#f0fdf4' : isRejected ? '#fef2f2' : '#ffffff',
                }}
              >
                {!isEditing ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                        {item.title}
                        {isApproved && <span style={{ marginLeft: '0.5rem', color: '#10b981' }}>✅ Approved</span>}
                        {isRejected && <span style={{ marginLeft: '0.5rem', color: '#ef4444' }}>❌ Rejected</span>}
                      </h3>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          backgroundColor: getPriorityColor(item.priority),
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          {item.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p style={{ color: '#374151', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
                      {item.description}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                      {item.assignee && <span>Assignee: {item.assignee}</span>}
                      {item.dueDate && <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>}
                    </div>
                    {review.linearIssues[index] && (
                      <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.25rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Linear Issue Preview:</div>
                        <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                          <div><strong>Title:</strong> {review.linearIssues[index].title}</div>
                          {review.linearIssues[index].description && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <strong>Description:</strong>
                              <div style={{ whiteSpace: 'pre-wrap', marginTop: '0.25rem' }}>
                                {review.linearIssues[index].description}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {!isProcessed && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button
                          onClick={() => handleEditStart(index, item)}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                          }}
                        >
                          ✏️ Edit
                        </button>
                        {!isApproved && !isRejected && (
                          <>
                            <button
                              onClick={() => handleIssueApprove(index)}
                              style={{
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                              }}
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => handleIssueReject(index)}
                              style={{
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                              }}
                            >
                              ❌ Reject
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Title</label>
                      <input
                        type="text"
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Description</label>
                      <textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={5}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Assignee</label>
                        <input
                          type="text"
                          value={editForm.assignee || ''}
                          onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Priority</label>
                        <select
                          value={editForm.priority || 'medium'}
                          onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as 'high' | 'medium' | 'low' })}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Due Date</label>
                        <input
                          type="date"
                          value={editForm.dueDate ? editForm.dueDate.split('T')[0] : ''}
                          onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEditSave(index)}
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleEditCancel}
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!isProcessed && (
        <div style={{ display: 'flex', gap: '1rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
          {hasPartialApprovals && (
            <button
              onClick={handleFinalize}
              disabled={processing || approvedCount === 0}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: approvedCount > 0 ? '#2563eb' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: (processing || approvedCount === 0) ? 'not-allowed' : 'pointer',
                opacity: (processing || approvedCount === 0) ? 0.6 : 1,
                fontWeight: 600,
              }}
            >
              {processing ? 'Processing...' : `Finalize & Create ${approvedCount} Issue(s)`}
            </button>
          )}
          {!hasPartialApprovals && (
            <button
              onClick={handleApprove}
              disabled={processing}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: processing ? 'not-allowed' : 'pointer',
                opacity: processing ? 0.6 : 1,
                fontWeight: 600,
              }}
            >
              {processing ? 'Processing...' : 'Approve All & Create Issues'}
            </button>
          )}
          <button
            onClick={handleReject}
            disabled={processing}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: processing ? 'not-allowed' : 'pointer',
              opacity: processing ? 0.6 : 1,
              fontWeight: 600,
            }}
          >
            {processing ? 'Processing...' : 'Reject All'}
          </button>
        </div>
      )}

      {isProcessed && (
        <div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem', marginTop: '2rem' }}>
          This review has been {review.status}. No further actions are available.
        </div>
      )}
      </div>
    </>
  );
}
