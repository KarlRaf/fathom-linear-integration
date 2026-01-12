import { kv } from '@vercel/kv';
import { logger } from '../../utils/logger';
import { ActionItem } from '../../types/action-item';
import { LinearIssueInput } from '../../types/linear';

export interface ReviewRequest {
  reviewId: string;
  actionItems: ActionItem[];
  linearIssues: LinearIssueInput[];
  recordingId: string;
  meetingTitle: string;
  summary?: string;
  timestamp: number;
  createdAt: string; // ISO timestamp
  status: 'pending' | 'partially-approved' | 'approved' | 'rejected' | 'expired';
  approvedAt?: string;
  rejectedAt?: string;
  completedAt?: string;
  domain?: string; // Primary domain from calendar invitees (excluding gmail.com)
  
  // Individual issue approval (optional enhancement)
  approvedIssueIndices?: number[];
  rejectedIssueIndices?: number[];
  
  // Review editing (optional enhancement)
  editedActionItems?: ActionItem[];
  hasEdits?: boolean;
  editedLinearIssues?: LinearIssueInput[];
}

export interface ReviewFilters {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  minItems?: number;
  maxItems?: number;
}

export interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  byDate: { date: string; count: number }[];
}

const REVIEW_PREFIX = 'pending_review:';
const REVIEW_LIST_KEY = 'pending_reviews:list';
const REVIEW_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export class ReviewStorage {
  private getReviewKey(reviewId: string): string {
    return `${REVIEW_PREFIX}${reviewId}`;
  }

  async storeReview(review: ReviewRequest): Promise<void> {
    try {
      const key = this.getReviewKey(review.reviewId);
      await kv.set(key, JSON.stringify(review), { ex: REVIEW_TTL });
      
      // Add to list (using a set to avoid duplicates)
      await kv.sadd(REVIEW_LIST_KEY, review.reviewId);
      await kv.expire(REVIEW_LIST_KEY, REVIEW_TTL);
      
      logger.info(`Stored review ${review.reviewId} in KV`);
    } catch (error) {
      logger.error(`Failed to store review ${review.reviewId}:`, error);
      throw error;
    }
  }

  async getReview(reviewId: string): Promise<ReviewRequest | null> {
    try {
      const key = this.getReviewKey(reviewId);
      logger.info(`Fetching review from KV with key: ${key}`);
      const data = await kv.get<string | ReviewRequest>(key);
      
      if (!data) {
        logger.warn(`Review not found in KV for key: ${key}`);
        return null;
      }
      
      logger.info(`Review found in KV for key: ${key}`);
      if (typeof data === 'string') {
        return JSON.parse(data) as ReviewRequest;
      }
      return data as ReviewRequest;
    } catch (error) {
      logger.error(`Failed to get review ${reviewId} from KV:`, error);
      return null;
    }
  }

  async listPendingReviews(): Promise<ReviewRequest[]> {
    try {
      const reviewIds = await kv.smembers(REVIEW_LIST_KEY) as string[];
      if (!reviewIds || reviewIds.length === 0) return [];
      
      const reviews: ReviewRequest[] = [];
      for (const reviewId of reviewIds) {
        const review = await this.getReview(reviewId);
        if (review && review.status === 'pending') {
          reviews.push(review);
        }
      }
      
      // Sort by timestamp (newest first)
      reviews.sort((a, b) => b.timestamp - a.timestamp);
      return reviews;
    } catch (error) {
      logger.error('Failed to list pending reviews:', error);
      return [];
    }
  }

  async listReviews(filters?: ReviewFilters): Promise<ReviewRequest[]> {
    try {
      const reviewIds = await kv.smembers(REVIEW_LIST_KEY) as string[];
      if (!reviewIds || reviewIds.length === 0) return [];
      
      const reviews: ReviewRequest[] = [];
      for (const reviewId of reviewIds) {
        const review = await this.getReview(reviewId);
        if (!review) continue;
        
        // Apply filters
        if (filters?.status && review.status !== filters.status) continue;
        if (filters?.from && review.createdAt < filters.from) continue;
        if (filters?.to && review.createdAt > filters.to) continue;
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          if (!review.meetingTitle.toLowerCase().includes(searchLower) &&
              !review.recordingId.toLowerCase().includes(searchLower)) {
            continue;
          }
        }
        if (filters?.minItems && review.actionItems.length < filters.minItems) continue;
        if (filters?.maxItems && review.actionItems.length > filters.maxItems) continue;
        
        reviews.push(review);
      }
      
      // Sort by timestamp (newest first)
      reviews.sort((a, b) => b.timestamp - a.timestamp);
      return reviews;
    } catch (error) {
      logger.error('Failed to list reviews:', error);
      return [];
    }
  }

  async updateReviewStatus(
    reviewId: string,
    status: 'approved' | 'rejected' | 'partially-approved'
  ): Promise<void> {
    try {
      const review = await this.getReview(reviewId);
      if (!review) {
        throw new Error(`Review ${reviewId} not found`);
      }
      
      review.status = status;
      if (status === 'approved') {
        review.approvedAt = new Date().toISOString();
        review.completedAt = new Date().toISOString();
      } else if (status === 'rejected') {
        review.rejectedAt = new Date().toISOString();
        review.completedAt = new Date().toISOString();
      }
      
      const key = this.getReviewKey(reviewId);
      await kv.set(key, JSON.stringify(review), { ex: REVIEW_TTL });
      
      logger.info(`Updated review ${reviewId} status to ${status}`);
    } catch (error) {
      logger.error(`Failed to update review ${reviewId} status:`, error);
      throw error;
    }
  }

  async updateReview(review: ReviewRequest): Promise<void> {
    try {
      const key = this.getReviewKey(review.reviewId);
      await kv.set(key, JSON.stringify(review), { ex: REVIEW_TTL });
      logger.info(`Updated review ${review.reviewId}`);
    } catch (error) {
      logger.error(`Failed to update review ${review.reviewId}:`, error);
      throw error;
    }
  }

  async approveIssue(reviewId: string, issueIndex: number): Promise<void> {
    try {
      const review = await this.getReview(reviewId);
      if (!review) {
        throw new Error(`Review ${reviewId} not found`);
      }
      
      if (!review.approvedIssueIndices) review.approvedIssueIndices = [];
      if (!review.rejectedIssueIndices) review.rejectedIssueIndices = [];
      
      if (!review.approvedIssueIndices.includes(issueIndex)) {
        review.approvedIssueIndices.push(issueIndex);
      }
      review.rejectedIssueIndices = review.rejectedIssueIndices.filter(i => i !== issueIndex);
      
      // Update status
      const totalIssues = review.linearIssues.length;
      const approvedCount = review.approvedIssueIndices.length;
      
      if (approvedCount === totalIssues) {
        review.status = 'approved';
        review.approvedAt = new Date().toISOString();
        review.completedAt = new Date().toISOString();
      } else if (approvedCount > 0) {
        review.status = 'partially-approved';
      }
      
      await this.updateReview(review);
      logger.info(`Approved issue ${issueIndex} in review ${reviewId}`);
    } catch (error) {
      logger.error(`Failed to approve issue ${issueIndex} in review ${reviewId}:`, error);
      throw error;
    }
  }

  async rejectIssue(reviewId: string, issueIndex: number): Promise<void> {
    try {
      const review = await this.getReview(reviewId);
      if (!review) {
        throw new Error(`Review ${reviewId} not found`);
      }
      
      if (!review.approvedIssueIndices) review.approvedIssueIndices = [];
      if (!review.rejectedIssueIndices) review.rejectedIssueIndices = [];
      
      if (!review.rejectedIssueIndices.includes(issueIndex)) {
        review.rejectedIssueIndices.push(issueIndex);
      }
      review.approvedIssueIndices = review.approvedIssueIndices.filter(i => i !== issueIndex);
      
      await this.updateReview(review);
      logger.info(`Rejected issue ${issueIndex} in review ${reviewId}`);
    } catch (error) {
      logger.error(`Failed to reject issue ${issueIndex} in review ${reviewId}:`, error);
      throw error;
    }
  }

  async updateActionItem(reviewId: string, index: number, updates: Partial<ActionItem>): Promise<void> {
    try {
      const review = await this.getReview(reviewId);
      if (!review) {
        throw new Error(`Review ${reviewId} not found`);
      }
      
      if (!review.editedActionItems) {
        review.editedActionItems = JSON.parse(JSON.stringify(review.actionItems));
      }
      
      if (review.editedActionItems && review.editedActionItems[index]) {
        review.editedActionItems[index] = {
          ...review.editedActionItems[index],
          ...updates,
        };
      }
      review.hasEdits = true;
      
      await this.updateReview(review);
      logger.info(`Updated action item ${index} in review ${reviewId}`);
    } catch (error) {
      logger.error(`Failed to update action item ${index} in review ${reviewId}:`, error);
      throw error;
    }
  }

  async getReviewStats(): Promise<ReviewStats> {
    try {
      const reviews = await this.listReviews();
      const stats: ReviewStats = {
        total: reviews.length,
        pending: 0,
        approved: 0,
        rejected: 0,
        expired: 0,
        byDate: [],
      };
      
      const dateMap = new Map<string, number>();
      
      for (const review of reviews) {
        switch (review.status) {
          case 'pending':
          case 'partially-approved':
            stats.pending++;
            break;
          case 'approved':
            stats.approved++;
            break;
          case 'rejected':
            stats.rejected++;
            break;
          case 'expired':
            stats.expired++;
            break;
        }
        
        const date = review.createdAt.split('T')[0];
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      }
      
      stats.byDate = Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      return stats;
    } catch (error) {
      logger.error('Failed to get review stats:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        expired: 0,
        byDate: [],
      };
    }
  }

  async bulkUpdateStatus(reviewIds: string[], status: 'approved' | 'rejected'): Promise<void> {
    try {
      for (const reviewId of reviewIds) {
        await this.updateReviewStatus(reviewId, status);
      }
      logger.info(`Bulk updated ${reviewIds.length} reviews to ${status}`);
    } catch (error) {
      logger.error(`Failed to bulk update reviews:`, error);
      throw error;
    }
  }

  async deleteReview(reviewId: string): Promise<void> {
    try {
      const key = this.getReviewKey(reviewId);
      await kv.del(key);
      await kv.srem(REVIEW_LIST_KEY, reviewId);
      logger.info(`Deleted review ${reviewId}`);
    } catch (error) {
      logger.error(`Failed to delete review ${reviewId}:`, error);
      throw error;
    }
  }
}

export const reviewStorage = new ReviewStorage();
