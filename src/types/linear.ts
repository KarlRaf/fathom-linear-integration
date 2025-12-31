export interface LinearIssueInput {
  title: string;
  description: string;
  teamId: string;
  projectId?: string;
  assigneeId?: string;
  priority?: number; // 1-4, where 1 is urgent, 4 is no priority
  labelIds?: string[];
  dueDate?: string; // ISO date string
}

