import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import { retry } from '../../utils/retry';
import { FathomWebhookPayload } from '../../types/fathom';
import { settingsService } from '../config/settings-service';

export class RecapGenerator {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateRecap(payload: FathomWebhookPayload): Promise<string> {
    const transcript = payload.transcript?.text || '';
    const summary = payload.summary || '';
    const meetingTitle = payload.recording.title || 'Meeting';

    if (!transcript || transcript.trim().length === 0) {
      logger.warn('Empty transcript provided for recap generation');
      return `*${meetingTitle}*\n\nNo transcript available for recap.`;
    }

    // Get prompt template from settings service (falls back to default if KV is empty)
    const settings = await settingsService.getSettings();
    const promptTemplate = settings.prompts.recap;

    // Build the prompt with actual values
    const prompt = promptTemplate
      .replace('{{TRANSCRIPT_TEXT}}', transcript)
      .replace('{{SUMMARY}}', summary || 'Not available');

    try {
      logger.info('Generating Slack recap using OpenAI...');
      
      // Use retry logic for OpenAI API calls (handles transient failures)
      const response = await retry(
        () => this.client.chat.completions.create({
          model: 'gpt-5-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert RevOps + GTM meeting note-taker. Generate Slack-friendly recaps in emoji-led format. Return ONLY the Slack recap, no other content.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
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

      // Add meeting title header
      const recap = `*${meetingTitle}*\n\n${content.trim()}`;
      
      logger.info('Slack recap generated successfully');
      return recap;
    } catch (error) {
      logger.error('Failed to generate recap after retries:', error);
      throw new Error(`Recap generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

