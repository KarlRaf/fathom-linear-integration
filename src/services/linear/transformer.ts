import { LinearClient } from '@linear/sdk';
import { logger } from '../../utils/logger';
import { ActionItem } from '../../types/action-item';
import { LinearIssueInput } from '../../types/linear';

export class LinearTransformer {
  private client: LinearClient;
  private teamId: string;
  private projectId?: string;
  private stateId?: string;

  constructor(apiKey: string, teamId: string, projectId?: string, stateId?: string) {
    this.client = new LinearClient({ apiKey });
    this.teamId = teamId;
    this.projectId = projectId;
    this.stateId = stateId;
  }

  async transformActionItem(item: ActionItem): Promise<LinearIssueInput> {
    // Map priority to Linear's priority scale (1-4, where 1 is urgent)
    const priorityMap: Record<string, number> = {
      high: 1,
      medium: 2,
      low: 3,
    };

    // Try to find assignee by name if provided
    let assigneeId: string | undefined;
    if (item.assignee) {
      try {
        const users = await this.client.users();
        const assignee = users.nodes.find(
          (u) => u.name.toLowerCase().includes(item.assignee!.toLowerCase())
        );
        assigneeId = assignee?.id;
        if (assigneeId) {
          logger.debug(`Found assignee for "${item.assignee}": ${assigneeId}`);
        } else {
          logger.warn(`Could not find assignee: ${item.assignee}`);
        }
      } catch (error) {
        logger.warn('Failed to fetch users for assignee lookup:', error);
      }
    }

    return {
      title: item.title,
      description: this.formatDescription(item),
      teamId: this.teamId,
      projectId: this.projectId,
      assigneeId,
      priority: priorityMap[item.priority] || 3,
      dueDate: item.dueDate || undefined,
      stateId: this.stateId,
    };
  }

  private formatDescription(item: ActionItem): string {
    let desc = item.description;

    if (item.metadata?.originalText) {
      desc += `\n\n**Original context:**\n${item.metadata.originalText}`;
    }

    if (item.metadata?.speaker) {
      desc += `\n\n**Assigned by:** ${item.metadata.speaker}`;
    }

    return desc;
  }
}

