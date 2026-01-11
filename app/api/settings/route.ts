import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { AppSettings, SettingsUpdateRequest } from '../../../lib/types';

const SETTINGS_KEY = 'config:settings';

// Default prompts (must match the ones in settings-service.ts)
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

function getDefaultSettings(): AppSettings {
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

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * GET /api/settings
 * Fetch current settings from KV
 */
export async function GET() {
  try {
    const data = await kv.get<AppSettings | string>(SETTINGS_KEY);
    
    let settings: AppSettings;
    if (data) {
      // Vercel KV might return the object directly or as a string
      if (typeof data === 'string') {
        settings = JSON.parse(data) as AppSettings;
      } else {
        settings = data;
      }
    } else {
      // Return defaults if not set
      settings = getDefaultSettings();
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Update settings in KV
 */
export async function PUT(request: NextRequest) {
  try {
    const body: SettingsUpdateRequest = await request.json();
    
    // Get current settings
    const currentData = await kv.get<AppSettings | string>(SETTINGS_KEY);
    let current: AppSettings;
    if (currentData) {
      if (typeof currentData === 'string') {
        current = JSON.parse(currentData) as AppSettings;
      } else {
        current = currentData;
      }
    } else {
      current = getDefaultSettings();
    }
    
    // Build updated settings
    const updated: AppSettings = {
      ...current,
      webhookUrl: body.webhookUrl ?? current.webhookUrl,
      prompts: {
        recap: body.prompts?.recap ?? current.prompts.recap,
        extraction: body.prompts?.extraction ?? current.prompts.extraction,
      },
      linear: body.linear !== undefined ? {
        apiKey: body.linear.apiKey ?? current.linear?.apiKey,
        teamId: body.linear.teamId ?? current.linear?.teamId,
        projectId: body.linear.projectId ?? current.linear?.projectId,
        stateId: body.linear.stateId ?? current.linear?.stateId,
        assignee: body.linear.assignee ?? current.linear?.assignee,
      } : current.linear,
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    };

    // Validation
    if (updated.prompts.recap.length > 10000) {
      return NextResponse.json(
        { error: 'Recap prompt too long (max 10,000 characters)' },
        { status: 400 }
      );
    }
    if (updated.prompts.extraction.length > 10000) {
      return NextResponse.json(
        { error: 'Extraction prompt too long (max 10,000 characters)' },
        { status: 400 }
      );
    }
    if (updated.webhookUrl && !isValidUrl(updated.webhookUrl)) {
      return NextResponse.json(
        { error: 'Invalid webhook URL format' },
        { status: 400 }
      );
    }

    // Save to KV
    await kv.set(SETTINGS_KEY, JSON.stringify(updated));
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
