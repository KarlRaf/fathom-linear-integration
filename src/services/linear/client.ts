import { LinearClient } from '@linear/sdk';
import { logger } from '../../utils/logger';
import { LinearIssueInput } from '../../types/linear';

export class LinearIssueCreator {
  private client: LinearClient;

  constructor(apiKey: string) {
    this.client = new LinearClient({ apiKey });
  }

  async createIssue(input: LinearIssueInput): Promise<string> {
    try {
      logger.info(`Creating Linear issue: ${input.title}`);
      
      // Linear SDK uses createIssue method
      const issuePayload = await this.client.createIssue({
        teamId: input.teamId,
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        projectId: input.projectId,
        priority: input.priority,
        dueDate: input.dueDate,
        stateId: input.stateId,
      });
      
      const issue = await issuePayload.issue;
      
      if (!issue) {
        throw new Error('Failed to create issue: no issue returned');
      }
      
      logger.info(`Created Linear issue: ${issue.id} - ${issue.title}`);
      return issue.id;
    } catch (error) {
      logger.error(`Failed to create Linear issue: ${input.title}`, error);
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
