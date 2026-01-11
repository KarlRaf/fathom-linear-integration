import { kv } from '@vercel/kv';
import { logger } from '../../utils/logger';

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

const SETTINGS_KEY = 'config:settings';

// Default prompts extracted from current codebase
const DEFAULT_EXTRACTION_PROMPT = `You are an assistant that extracts action items from meeting transcripts.

Given the following transcript, extract all action items and format them as JSON.

For each action item, provide:
- title: A concise, actionable title (max 100 chars)
- description: Detailed description with context from the transcript
- assignee: Person responsible (if mentioned, otherwise null)
- priority: "high", "medium", or "low" based on urgency and importance
- dueDate: ISO date string (YYYY-MM-DD) if deadline mentioned, otherwise null

Prioritize items as:
- "high": Urgent items with deadlines or critical blockers
- "medium": Important items without immediate urgency
- "low": Nice-to-have items or follow-ups

Return ONLY valid JSON in this format:
{
  "actionItems": [
    {
      "title": "...",
      "description": "...",
      "assignee": "..." or null,
      "priority": "high" | "medium" | "low",
      "dueDate": "YYYY-MM-DD" or null
    }
  ]
}

Transcript:
{{TRANSCRIPT}}

Summary (if available):
{{SUMMARY}}`;

const DEFAULT_RECAP_PROMPT = `You are an expert RevOps + GTM meeting note-taker. Convert messy meeting transcripts into a Slack-friendly recap in a specific emoji-led format.

Inputs
• Transcript: {{TRANSCRIPT_TEXT}}
• Summary: {{SUMMARY}}

⸻

Step 1 — Extract action items

From the transcript, identify explicit and implied action items. Each action item should include:
• What needs to be done (clear verb)
• Who owns it (person/team mentioned; if unclear, infer most likely owner and mark "(inferred)")
• Any key details (tools, objects, thresholds, dependencies, timelines)

Only include action items that are actually discussed.

⸻

Step 2 — Slack recap (short + scannable)

Produce a Slack recap using this exact style:
• Use emoji headers per project/theme (2–4 sections max).
• Under each header: short bullets, each starting with an @Owner → action format.
• Keep each bullet to one line when possible.
• Include key numbers/thresholds when mentioned (e.g., "last 90 days", "$20k ARR", "400 accounts").
• If something is a decision, mark it implicitly in the phrasing (e.g., "→ Proceed with…").

Slack recap structure

:emoji: Section Title
@Owner → action
@Owner → action

(Repeat for each section.)

⸻

Output format

Return ONLY the Slack Recap section. No extra commentary. No Linear issues.`;

export class SettingsService {
  private cache: { settings: AppSettings | null; timestamp: number } = {
    settings: null,
    timestamp: 0,
  };
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get current settings from KV, or return defaults if not set
   */
  async getSettings(): Promise<AppSettings> {
    // Check cache first
    const now = Date.now();
    if (this.cache.settings && (now - this.cache.timestamp) < this.cacheTTL) {
      logger.debug('Returning settings from cache');
      return this.cache.settings;
    }

    try {
      const data = await kv.get<AppSettings | string>(SETTINGS_KEY);
      
      if (data) {
        // Vercel KV might return the object directly or as a string
        let settings: AppSettings;
        if (typeof data === 'string') {
          settings = JSON.parse(data) as AppSettings;
        } else {
          settings = data;
        }

        this.cache = { settings, timestamp: now };
        logger.debug('Loaded settings from KV', { version: settings.version });
        return settings;
      }
    } catch (error) {
      logger.error('Failed to fetch settings from KV:', error);
    }

    // Return defaults if KV is empty or error
    const defaults = this.getDefaultSettings();
    logger.debug('Using default settings (KV empty or error)');
    return defaults;
  }

  /**
   * Update settings in KV
   */
  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    
    const updated: AppSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    };

    try {
      // Store as JSON string for consistency
      await kv.set(SETTINGS_KEY, JSON.stringify(updated));
      
      // Invalidate cache
      this.cache = { settings: null, timestamp: 0 };
      
      logger.info('Settings updated successfully', { version: updated.version });
      return updated;
    } catch (error) {
      logger.error('Failed to update settings in KV:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Get default settings (fallback when KV is empty)
   */
  getDefaultSettings(): AppSettings {
    // Determine webhook URL from environment
    const webhookUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/webhook/fathom`
      : process.env.VERCEL
        ? 'https://fathom-linear-integration.vercel.app/webhook/fathom'
        : 'http://localhost:3000/webhook/fathom';

    return {
      webhookUrl,
      prompts: {
        recap: DEFAULT_RECAP_PROMPT,
        extraction: DEFAULT_EXTRACTION_PROMPT,
      },
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * Clear the in-memory cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache = { settings: null, timestamp: 0 };
    logger.debug('Settings cache cleared');
  }

  /**
   * Get only the prompts (convenience method for AI services)
   */
  async getPrompts(): Promise<{ recap: string; extraction: string }> {
    const settings = await this.getSettings();
    return settings.prompts;
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
