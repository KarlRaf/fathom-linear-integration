export interface ActionItem {
  title: string;
  description: string;
  assignee?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string; // ISO date string
  metadata?: {
    originalText: string;
    speaker?: string;
    timestamp?: number;
  };
}

export interface ActionItemExtractionResult {
  actionItems: ActionItem[];
}

