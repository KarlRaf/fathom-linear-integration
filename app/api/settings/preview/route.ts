import { NextRequest, NextResponse } from 'next/server';
import { ActionItemExtractor } from '../../../../src/services/ai/action-extractor';
import { RecapGenerator } from '../../../../src/services/ai/recap-generator';
import { config } from '../../../../src/config/env';

const actionExtractor = new ActionItemExtractor(config.openai.apiKey);
const recapGenerator = new RecapGenerator(config.openai.apiKey);

export async function POST(request: NextRequest) {
  try {
    const { promptType, prompt, sampleTranscript, sampleSummary } = await request.json();
    
    if (!promptType || !prompt) {
      return NextResponse.json(
        { error: 'promptType and prompt are required' },
        { status: 400 }
      );
    }
    
    if (promptType === 'extraction' && !sampleTranscript) {
      return NextResponse.json(
        { error: 'sampleTranscript is required for extraction preview' },
        { status: 400 }
      );
    }
    
    if (promptType === 'recap' && !sampleTranscript) {
      return NextResponse.json(
        { error: 'sampleTranscript is required for recap preview' },
        { status: 400 }
      );
    }
    
    try {
      if (promptType === 'extraction') {
        // Temporarily update settings to use the test prompt
        const settingsService = (await import('../../../../src/services/config/settings-service')).settingsService;
        const currentSettings = await settingsService.getSettings();
        
        // Create a temporary extractor with the test prompt
        const testPrompt = prompt
          .replace('{{TRANSCRIPT}}', sampleTranscript)
          .replace('{{SUMMARY}}', sampleSummary || 'Not available');
        
        // Use OpenAI directly with the test prompt
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: config.openai.apiKey });
        
        const response = await openai.chat.completions.create({
          model: 'gpt-5-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that extracts action items from meeting transcripts. Always return valid JSON only, no additional text.',
            },
            {
              role: 'user',
              content: testPrompt,
            },
          ],
          response_format: { type: 'json_object' },
        });
        
        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response content from OpenAI');
        }
        
        const result = JSON.parse(content);
        
        return NextResponse.json({
          success: true,
          type: 'extraction',
          result: result.actionItems || [],
          rawOutput: content,
        });
      } else if (promptType === 'recap') {
        // Create a mock payload for recap generation
        const mockPayload = {
          recording: { title: 'Sample Meeting' },
          transcript: { text: sampleTranscript },
          summary: sampleSummary || '',
        };
        
        // Use OpenAI directly with the test prompt
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: config.openai.apiKey });
        
        const testPrompt = prompt
          .replace('{{TRANSCRIPT_TEXT}}', sampleTranscript)
          .replace('{{SUMMARY}}', sampleSummary || 'Not available');
        
        const response = await openai.chat.completions.create({
          model: 'gpt-5-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert RevOps + GTM meeting note-taker. Generate Slack-friendly recaps in emoji-led format. Return ONLY the Slack recap, no other content.',
            },
            {
              role: 'user',
              content: testPrompt,
            },
          ],
        });
        
        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response content from OpenAI');
        }
        
        return NextResponse.json({
          success: true,
          type: 'recap',
          result: content.trim(),
          formattedResult: `*Sample Meeting*\n\n${content.trim()}`,
        });
      } else {
        return NextResponse.json(
          { error: 'Invalid promptType. Must be "extraction" or "recap"' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate preview',
          details: error?.message || String(error),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to preview prompt:', error);
    return NextResponse.json(
      { error: 'Failed to preview prompt' },
      { status: 500 }
    );
  }
}
