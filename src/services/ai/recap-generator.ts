import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import { FathomWebhookPayload } from '../../types/fathom';

const RECAP_PROMPT = `You are an expert RevOps + GTM meeting note-taker. Convert messy meeting transcripts into a Slack-friendly recap in a specific emoji-led format.

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

    // Build the prompt with actual values
    const prompt = RECAP_PROMPT
      .replace('{{TRANSCRIPT_TEXT}}', transcript)
      .replace('{{SUMMARY}}', summary || 'Not available');

    try {
      logger.info('Generating Slack recap using OpenAI...');
      
      const response = await this.client.chat.completions.create({
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
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Add meeting title header
      const recap = `*${meetingTitle}*\n\n${content.trim()}`;
      
      logger.info('Slack recap generated successfully');
      return recap;
    } catch (error) {
      logger.error('Failed to generate recap:', error);
      throw new Error(`Recap generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

