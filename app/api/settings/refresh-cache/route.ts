import { NextResponse } from 'next/server';
import { settingsService } from '../../../../src/services/config/settings-service';

/**
 * POST /api/settings/refresh-cache
 * Clear the settings cache to force reload from KV on next access
 */
export async function POST() {
  try {
    settingsService.clearCache();
    return NextResponse.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
