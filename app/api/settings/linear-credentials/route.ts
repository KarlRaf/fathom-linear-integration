import { NextResponse } from 'next/server';
import { settingsService } from '../../../../src/services/config/settings-service';
import { config } from '../../../../src/config/env';

/**
 * GET /api/settings/linear-credentials
 * Get current Linear credentials (from settings or env vars)
 * This endpoint shows what credentials are actually being used
 */
export async function GET() {
  try {
    const settings = await settingsService.getSettings();
    const envCredentials = {
      apiKey: config.linear.apiKey ? '***' + config.linear.apiKey.slice(-4) : 'Not set',
      teamId: config.linear.teamId || 'Not set',
      projectId: config.linear.projectId || 'Not set',
      stateId: config.linear.stateId || 'Not set',
      assignee: config.linear.assignee || 'Not set',
    };
    
    const settingsCredentials = settings.linear ? {
      apiKey: settings.linear.apiKey ? '***' + settings.linear.apiKey.slice(-4) : 'Not set',
      teamId: settings.linear.teamId || 'Not set',
      projectId: settings.linear.projectId || 'Not set',
      stateId: settings.linear.stateId || 'Not set',
      assignee: settings.linear.assignee || 'Not set',
    } : null;
    
    // Determine which credentials are actually being used
    const activeCredentials = {
      apiKey: settings.linear?.apiKey || config.linear.apiKey ? '***' + (settings.linear?.apiKey || config.linear.apiKey).slice(-4) : 'Not set',
      teamId: settings.linear?.teamId || config.linear.teamId || 'Not set',
      projectId: settings.linear?.projectId || config.linear.projectId || 'Not set',
      stateId: settings.linear?.stateId || config.linear.stateId || 'Not set',
      assignee: settings.linear?.assignee || config.linear.assignee || 'Not set',
    };
    
    return NextResponse.json({
      active: activeCredentials,
      fromSettings: settingsCredentials,
      fromEnv: envCredentials,
      source: settings.linear ? 'settings' : 'environment',
    });
  } catch (error) {
    console.error('Failed to get Linear credentials:', error);
    return NextResponse.json(
      { error: 'Failed to get Linear credentials' },
      { status: 500 }
    );
  }
}
