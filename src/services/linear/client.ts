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
      
      // Use retry logic for Linear API calls (handles transient network failures)
      const issuePayload = await retry(
        () => this.client.createIssue({
          teamId: input.teamId,
          title: input.title,
          description: input.description,
          assigneeId: input.assigneeId,
          projectId: input.projectId,
          priority: input.priority,
          dueDate: input.dueDate,
          stateId: input.stateId,
        }),
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
      
      const issue = await issuePayload.issue;
      
      if (!issue) {
        throw new Error('Failed to create issue: no issue returned');
      }
      
      logger.info(`Created Linear issue: ${issue.id} - ${issue.title}`);
      return issue.id;
    } catch (error) {
      logger.error(`Failed to create Linear issue: ${input.title} after retries`, error);
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
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        logger.error(`Failed to create issue: ${input.title}`, error);
        // Continue with other issues even if one fails
      }
    }

    logger.info(`Created ${issueIds.length}/${inputs.length} issues in Linear`);
    return issueIds;
  }
}
