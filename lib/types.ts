/**
 * Shared types for the settings configuration system
 */

export interface AppSettings {
  webhookUrl: string;
  prompts: {
    recap: string;
    extraction: string;
  };
  linear?: {
    apiKey?: string;
    teamId?: string;
    projectId?: string;
    stateId?: string;
    assignee?: string;
  };
  updatedAt: string;
  updatedBy?: string;
  version: number;
}

export interface SettingsUpdateRequest {
  webhookUrl?: string;
  prompts?: {
    recap?: string;
    extraction?: string;
  };
  linear?: {
    apiKey?: string;
    teamId?: string;
    projectId?: string;
    stateId?: string;
    assignee?: string;
  };
}

export interface SettingsResponse {
  success: boolean;
  data?: AppSettings;
  error?: string;
}
