import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import { retry } from '../../utils/retry';
import { ActionItem, ActionItemExtractionResult } from '../../types/action-item';
import { settingsService } from '../config/settings-service';

export class ActionItemExtractor {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async extract(transcript: string, summary?: string): Promise<ActionItem[]> {
    if (!transcript || transcript.trim().length === 0) {
      logger.warn('Empty transcript provided for action item extraction');
      return [];
    }

    // Get prompt template from settings service (falls back to default if KV is empty)
    const settings = await settingsService.getSettings();
    const promptTemplate = settings.prompts.extraction;

    const prompt = promptTemplate
      .replace('{{TRANSCRIPT}}', transcript)
      .replace('{{SUMMARY}}', summary || 'Not available');

    try {
      logger.info('Extracting action items using OpenAI...');
      
      // Use retry logic for OpenAI API calls (handles transient failures)
      const response = await retry(
        () => this.client.chat.completions.create({
          model: 'gpt-5-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that extracts action items from meeting transcripts. Always return valid JSON only, no additional text.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          // gpt-5-mini doesn't support custom temperature, uses default (1)
        }),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
          retryableErrors: (error) => {
            // Retry on network errors, timeouts, and rate limits
            if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
            if (error.status === 429) return true; // Rate limit
            if (error.status >= 500) return true; // Server errors
            if (error.message?.includes('timeout')) return true;
            return false;
          },
        }
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const result: ActionItemExtractionResult = JSON.parse(content);
      const actionItems = result.actionItems || [];
      
      logger.info(`Extracted ${actionItems.length} action items`);
      return actionItems;
    } catch (error) {
      logger.error('Failed to extract action items after retries:', error);
      throw new Error(`Action item extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

