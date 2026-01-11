import { config } from '../config/env';
import { settingsService } from '../services/config/settings-service';

export interface LinearConfig {
  apiKey: string;
  teamId: string;
  projectId?: string;
  stateId?: string;
  assignee?: string;
}

/**
 * Get Linear configuration from settings (KV) or fall back to environment variables
 * This allows runtime configuration via the webapp
 */
export async function getLinearConfig(): Promise<LinearConfig> {
  try {
    const settings = await settingsService.getSettings();
    
    // Use settings if available, otherwise fall back to env vars
    const apiKey = settings.linear?.apiKey || config.linear.apiKey;
    const teamId = settings.linear?.teamId || config.linear.teamId;
    const projectId = settings.linear?.projectId || config.linear.projectId;
    const stateId = settings.linear?.stateId || config.linear.stateId;
    const assignee = settings.linear?.assignee || config.linear.assignee;
    
    if (!apiKey || !teamId) {
      throw new Error('Linear API Key and Team ID are required');
    }
    
    return {
      apiKey,
      teamId,
      projectId,
      stateId,
      assignee,
    };
  } catch (error) {
    // Fallback to env vars if settings service fails
    if (!config.linear.apiKey || !config.linear.teamId) {
      throw new Error('Linear API Key and Team ID are required (check settings or environment variables)');
    }
    
    return {
      apiKey: config.linear.apiKey,
      teamId: config.linear.teamId,
      projectId: config.linear.projectId,
      stateId: config.linear.stateId,
      assignee: config.linear.assignee,
    };
  }
}
