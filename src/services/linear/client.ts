import { LinearClient } from '@linear/sdk';
import { logger } from '../../utils/logger';
import { retry } from '../../utils/retry';
import { LinearIssueInput } from '../../types/linear';

export class LinearIssueCreator {
  private client: LinearClient;

  constructor(apiKey: string) {
    this.client = new LinearClient({ apiKey });
  }

  async createIssue(input: LinearIssueInput): Promise<string> {
    try {
      logger.info(`Creating Linear issue: ${input.title}`);
      console.log(`[LINEAR] Creating issue: ${input.title}`);
      
      const issueInput = {
        teamId: input.teamId,
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        projectId: input.projectId,
        priority: input.priority,
        dueDate: input.dueDate,
        stateId: input.stateId,
      };
      
      logger.debug(`Linear issue input:`, issueInput);
      console.log(`[LINEAR] Issue input:`, JSON.stringify(issueInput, null, 2));
      
      // Use retry logic for Linear API calls (handles transient network failures)
      logger.debug(`Calling Linear API createIssue...`);
      console.log(`[LINEAR] Calling client.createIssue...`);
      
      const issuePayload = await retry(
        () => {
          console.log(`[LINEAR] Inside retry function, calling createIssue...`);
          return this.client.createIssue(issueInput);
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
          retryableErrors: (error) => {
            // Retry on network errors, timeouts, and 5xx errors
            if (error.message?.includes('Fetch failed')) return true;
            if (error.message?.includes('ECONNRESET') || error.message?.includes('ETIMEDOUT')) return true;
            if (error.message?.includes('socket disconnected')) return true;
            if (error.message?.includes('timeout')) return true;
            // Don't retry on 4xx errors (client errors like validation)
            return false;
          },
        }
      );
      
      logger.debug(`Issue payload received, waiting for issue to resolve...`);
      console.log(`[LINEAR] Issue payload received:`, issuePayload);
      console.log(`[LINEAR] Waiting for issue payload.issue...`);
      
      const issue = await issuePayload.issue;
      console.log(`[LINEAR] Issue resolved:`, issue);
      
      logger.debug(`Issue payload resolved, checking result...`, {
        issue: issue ? 'exists' : 'null',
        issueType: typeof issue,
        issueKeys: issue ? Object.keys(issue) : [],
      });
      
      if (!issue) {
        logger.error('Issue payload resolved but issue is null/undefined', {
          issuePayload: JSON.stringify(issuePayload, null, 2),
        });
        throw new Error('Failed to create issue: no issue returned');
      }
      
      if (!issue.id) {
        logger.error('Issue object exists but has no id', {
          issue: JSON.stringify(issue, null, 2),
        });
        throw new Error('Failed to create issue: issue has no id');
      }
      
      logger.info(`Created Linear issue: ${issue.id} - ${issue.title}`, {
        issueId: issue.id,
        issueTitle: issue.title,
        issueUrl: issue.url || 'N/A',
        teamId: input.teamId,
      });
      return issue.id;
    } catch (error: any) {
      // Log detailed error information
      const errorMessage = error?.message || String(error);
      const errorDetails = {
        title: input.title,
        error: errorMessage,
        statusCode: error?.statusCode || error?.response?.status,
        errors: error?.errors || error?.response?.data?.errors,
        teamId: input.teamId,
      };
      
      logger.error(`Failed to create Linear issue: ${input.title} after retries`, {
        error: errorMessage,
        statusCode: errorDetails.statusCode,
        errors: errorDetails.errors,
        teamId: input.teamId,
        fullError: error,
      });
      
      throw error;
    }
  }

  async createIssues(inputs: LinearIssueInput[]): Promise<string[]> {
    const issueIds: string[] = [];
    const errors: Array<{ title: string; error: any }> = [];

    // TODO: For debugging, only create the first issue. Remove this limit once it works.
    const issuesToCreate = inputs.slice(0, 1);
    logger.info(`Creating ${issuesToCreate.length} of ${inputs.length} issues (limited for debugging)`);

    // Create issues sequentially to avoid rate limits
    for (const input of issuesToCreate) {
      try {
        const issueId = await this.createIssue(input);
        issueIds.push(issueId);
        // Small delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error: any) {
        // Collect error details for better reporting
        const errorMessage = error?.message || String(error);
        const errorDetails = {
          title: input.title,
          error: errorMessage,
          // Include Linear API error details if available
          statusCode: error?.statusCode || error?.response?.status,
          errors: error?.errors || error?.response?.data?.errors,
        };
        errors.push({ title: input.title, error: errorDetails });
        
        logger.error(`Failed to create issue: ${input.title}`, {
          error: errorMessage,
          statusCode: errorDetails.statusCode,
          errors: errorDetails.errors,
          fullError: error,
        });
        // Continue with other issues even if one fails
      }
    }

    const successCount = issueIds.length;
    const failureCount = errors.length;
    
    if (failureCount > 0) {
      logger.warn(`Created ${successCount}/${inputs.length} issues in Linear. ${failureCount} failed:`, {
        errors: errors.map(e => ({
          title: e.title,
          error: typeof e.error === 'object' ? JSON.stringify(e.error) : e.error,
        })),
      });
    } else {
      logger.info(`Created ${successCount}/${inputs.length} issues in Linear successfully`);
    }
    
    return issueIds;
  }
}
