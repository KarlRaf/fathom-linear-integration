import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import { ActionItem, ActionItemExtractionResult } from '../../types/action-item';

const EXTRACTION_PROMPT = `You are an assistant that extracts action items from meeting transcripts.

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

    const prompt = EXTRACTION_PROMPT
      .replace('{{TRANSCRIPT}}', transcript)
      .replace('{{SUMMARY}}', summary || 'Not available');

    try {
      logger.info('Extracting action items using OpenAI...');
      
      const response = await this.client.chat.completions.create({
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
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const result: ActionItemExtractionResult = JSON.parse(content);
      const actionItems = result.actionItems || [];
      
      logger.info(`Extracted ${actionItems.length} action items`);
      return actionItems;
    } catch (error) {
      logger.error('Failed to extract action items:', error);
      throw new Error(`Action item extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

