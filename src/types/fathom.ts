export interface FathomWebhookPayload {
  event: {
    id: string;
    event_type: string;
    timestamp: string;
  };
  recording: {
    id: string;
    title: string;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
  };
  transcript?: {
    text: string;
    paragraphs?: Array<{
      speaker: string;
      text: string;
      start_time: number;
      end_time: number;
    }>;
  };
  summary?: string;
  action_items?: Array<{
    text: string;
    owner?: string;
  }>;
}

