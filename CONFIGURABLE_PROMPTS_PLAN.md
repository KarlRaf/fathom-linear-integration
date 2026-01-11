# Configurable Prompts & Settings Implementation Plan

> **Note**: This plan has been updated to include **webapp-based validation** instead of Slack-based validation. See [WEBAPP_VALIDATION_PLAN.md](./WEBAPP_VALIDATION_PLAN.md) for details on the review/validation workflow.

## 📋 Overview

This document outlines the implementation plan for making the Fathom-Linear integration configurable via a webapp, allowing users to:
1. View/update the webhook URL (for reference and future use)
2. Edit AI prompt templates for Slack recaps and Linear issue generation
3. Save settings without requiring code changes or redeployment
4. **Review and approve action items in the webapp** (instead of Slack)

## 🎯 Current State Analysis

### Hard-coded Elements
1. **AI Prompts:**
   - `EXTRACTION_PROMPT` in `src/services/ai/action-extractor.ts` (Lines 6-39)
   - `RECAP_PROMPT` in `src/services/ai/recap-generator.ts` (Lines 6-46)

2. **Webhook URL:**
   - Currently configured in Fathom's dashboard (not in code)
   - Backend endpoint is fixed: `/webhook/fathom`
   - We'll store the full URL (e.g., `https://app.vercel.app/webhook/fathom`) for reference and future automation

### Existing Infrastructure
- ✅ Vercel KV already configured (`@vercel/kv` package installed)
- ✅ Serverless functions on Vercel
- ✅ Express.js backend with TypeScript
- ✅ Environment variables for secrets

## 🏗️ Architecture Design

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Webapp                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Settings Page (/settings)                           │   │
│  │  - Webhook URL input/display                         │   │
│  │  - Slack Recap Prompt Editor                         │   │
│  │  - Action Item Extraction Prompt Editor              │   │
│  │  - Save button                                       │   │
│  │  - Preview functionality (optional)                  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP API Calls
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              API Routes (Next.js API Routes)                 │
│  GET  /api/settings          - Fetch current settings       │
│  PUT  /api/settings          - Update settings              │
│  POST /api/settings/preview  - Preview prompt output        │
│  GET  /api/settings/history  - Get version history (opt)    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Vercel KV Storage                               │
│  Key: config:settings                                        │
│  Value: {                                                    │
│    webhookUrl: string,                                       │
│    prompts: {                                                │
│      recap: string,                                          │
│      extraction: string                                      │
│    },                                                        │
│    updatedAt: ISO timestamp,                                 │
│    version: number                                           │
│  }                                                           │
│                                                              │
│  Key: config:settings:history:${version}  (optional)        │
│  Value: Full settings snapshot for rollback                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│           Backend Services (Existing)                        │
│  - ActionItemExtractor (reads prompt from KV)               │
│  - RecapGenerator (reads prompt from KV)                    │
│  - Webhook handler (uses webhook URL from KV for reference) │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Updated File Structure

```
fathom-linear-integration/
├── src/
│   ├── services/
│   │   ├── ai/
│   │   │   ├── action-extractor.ts      # Modified: Read prompt from KV
│   │   │   └── recap-generator.ts       # Modified: Read prompt from KV
│   │   ├── config/
│   │   │   └── settings-service.ts      # NEW: KV-based settings service
│   │   └── ... (existing services)
│   └── ... (existing files)
├── app/                                  # NEW: Next.js App Router
│   ├── layout.tsx                        # Root layout
│   ├── page.tsx                          # Home/redirect to settings
│   ├── settings/
│   │   └── page.tsx                      # Settings UI page
│   └── api/
│       ├── settings/
│       │   ├── route.ts                  # GET/PUT /api/settings
│       │   ├── preview/
│       │   │   └── route.ts              # POST /api/settings/preview
│       │   └── history/
│       │       └── route.ts              # GET /api/settings/history (optional)
│       └── ... (existing API routes)
├── components/                           # NEW: React components
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── TextArea.tsx
│   │   └── Card.tsx
│   └── settings/
│       ├── WebhookUrlEditor.tsx
│       ├── PromptEditor.tsx
│       └── PromptPreview.tsx             # Optional
├── lib/
│   ├── kv-client.ts                      # NEW: KV client wrapper
│   └── types.ts                          # NEW: Shared types
├── next.config.js                        # NEW: Next.js config
├── package.json                          # Modified: Add Next.js deps
└── ... (existing files)
```

## 🗄️ Data Schema

### Vercel KV Storage Schema

#### Main Settings Key: `config:settings`

```typescript
interface AppSettings {
  webhookUrl: string;                    // Full URL: https://app.vercel.app/webhook/fathom
  prompts: {
    recap: string;                       // Slack recap prompt template
    extraction: string;                  // Action item extraction prompt template
  };
  updatedAt: string;                     // ISO 8601 timestamp
  updatedBy?: string;                    // Optional: user identifier
  version: number;                       // Incremental version number
}

// Default values (fallback if KV is empty)
const DEFAULT_SETTINGS: AppSettings = {
  webhookUrl: process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/webhook/fathom`
    : 'https://fathom-linear-integration.vercel.app/webhook/fathom',
  prompts: {
    recap: `[Default recap prompt from recap-generator.ts]`,
    extraction: `[Default extraction prompt from action-extractor.ts]`,
  },
  updatedAt: new Date().toISOString(),
  version: 1,
};
```

#### Version History Key: `config:settings:history:${version}` (Optional)

```typescript
interface SettingsHistoryEntry extends AppSettings {
  version: number;
  changedAt: string;
  changes: string[];                     // Array of changed field names
}
```

## 🔧 Implementation Steps

### Phase 1: Backend Infrastructure (Settings Service)

1. **Create Settings Service** (`src/services/config/settings-service.ts`)
   - Methods:
     - `getSettings(): Promise<AppSettings>`
     - `updateSettings(updates: Partial<AppSettings>): Promise<AppSettings>`
     - `getDefaultSettings(): AppSettings`
   - Uses Vercel KV for persistence
   - Falls back to default prompts (from current code) if KV is empty

2. **Refactor AI Services**
   - `ActionItemExtractor`: Read prompt from settings service instead of hard-coded constant
   - `RecapGenerator`: Read prompt from settings service instead of hard-coded constant
   - Add caching layer (in-memory cache with TTL) to avoid KV lookup on every request
   - Cache invalidation strategy: TTL of 5 minutes, or clear on settings update

3. **Create KV Client Wrapper** (`lib/kv-client.ts`)
   - Shared KV client instance
   - Type-safe get/set methods
   - Error handling

### Phase 2: Next.js App Setup

1. **Initialize Next.js**
   - Install Next.js, React, React DOM
   - Configure `next.config.js` for API routes
   - Set up TypeScript config for Next.js

2. **Create API Routes**
   - `app/api/settings/route.ts`: GET/PUT handlers
   - `app/api/settings/preview/route.ts`: POST handler for preview
   - `app/api/settings/history/route.ts`: GET handler for version history (optional)

3. **Create Shared Types** (`lib/types.ts`)
   - `AppSettings` interface
   - API request/response types

### Phase 3: UI Components

1. **Create Base UI Components** (`components/ui/`)
   - Reusable Button, Input, TextArea, Card components
   - Simple styling (Tailwind CSS or inline styles)

2. **Create Settings Page** (`app/settings/page.tsx`)
   - Webhook URL editor (with validation)
   - Prompt editors (Monaco Editor or simple textarea)
   - Save button with loading state
   - Success/error notifications

3. **Create Prompt Preview Component** (Optional)
   - `components/settings/PromptPreview.tsx`
   - Test prompt with sample transcript
   - Show formatted output

### Phase 4: Integration & Testing

1. **Wire Up Backend Services**
   - Update webhook handler to use settings service
   - Test prompt loading from KV
   - Test fallback to defaults

2. **End-to-End Testing**
   - Test settings update flow
   - Test prompt changes reflect in next webhook
   - Test version history (if implemented)

3. **Deployment**
   - Update Vercel configuration for Next.js
   - Ensure KV access in both serverless functions and Next.js API routes
   - Test in production

## 📝 Detailed Code Changes

### 1. Settings Service (`src/services/config/settings-service.ts`)

```typescript
import { kv } from '@vercel/kv';
import { logger } from '../../utils/logger';

export interface AppSettings {
  webhookUrl: string;
  prompts: {
    recap: string;
    extraction: string;
  };
  updatedAt: string;
  updatedBy?: string;
  version: number;
}

const SETTINGS_KEY = 'config:settings';
const DEFAULT_RECAP_PROMPT = `[Current prompt from recap-generator.ts]`;
const DEFAULT_EXTRACTION_PROMPT = `[Current prompt from action-extractor.ts]`;

export class SettingsService {
  private cache: { settings: AppSettings | null; timestamp: number } = {
    settings: null,
    timestamp: 0,
  };
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  async getSettings(): Promise<AppSettings> {
    // Check cache first
    const now = Date.now();
    if (this.cache.settings && (now - this.cache.timestamp) < this.cacheTTL) {
      return this.cache.settings;
    }

    try {
      const settings = await kv.get<AppSettings>(SETTINGS_KEY);
      
      if (settings) {
        this.cache = { settings, timestamp: now };
        return settings;
      }
    } catch (error) {
      logger.error('Failed to fetch settings from KV:', error);
    }

    // Return defaults if KV is empty or error
    return this.getDefaultSettings();
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    
    const updated: AppSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    };

    try {
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

  getDefaultSettings(): AppSettings {
    return {
      webhookUrl: process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/webhook/fathom`
        : 'https://fathom-linear-integration.vercel.app/webhook/fathom',
      prompts: {
        recap: DEFAULT_RECAP_PROMPT,
        extraction: DEFAULT_EXTRACTION_PROMPT,
      },
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  clearCache(): void {
    this.cache = { settings: null, timestamp: 0 };
  }
}

export const settingsService = new SettingsService();
```

### 2. Modified Action Item Extractor

```typescript
// src/services/ai/action-extractor.ts
import { settingsService } from '../config/settings-service';

export class ActionItemExtractor {
  // ... existing code ...

  async extract(transcript: string, summary?: string): Promise<ActionItem[]> {
    // Get prompt from settings service
    const settings = await settingsService.getSettings();
    const promptTemplate = settings.prompts.extraction;

    const prompt = promptTemplate
      .replace('{{TRANSCRIPT}}', transcript)
      .replace('{{SUMMARY}}', summary || 'Not available');

    // ... rest of existing extraction logic ...
  }
}
```

### 3. Modified Recap Generator

```typescript
// src/services/ai/recap-generator.ts
import { settingsService } from '../config/settings-service';

export class RecapGenerator {
  // ... existing code ...

  async generateRecap(payload: FathomWebhookPayload): Promise<string> {
    // Get prompt from settings service
    const settings = await settingsService.getSettings();
    const promptTemplate = settings.prompts.recap;

    const prompt = promptTemplate
      .replace('{{TRANSCRIPT_TEXT}}', transcript)
      .replace('{{SUMMARY}}', summary || 'Not available');

    // ... rest of existing recap generation logic ...
  }
}
```

### 4. Next.js API Route (`app/api/settings/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { AppSettings } from '@/lib/types';

const SETTINGS_KEY = 'config:settings';

export async function GET() {
  try {
    const settings = await kv.get<AppSettings>(SETTINGS_KEY);
    
    if (!settings) {
      // Return defaults if not set
      return NextResponse.json({
        webhookUrl: process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}/webhook/fathom`
          : 'https://fathom-linear-integration.vercel.app/webhook/fathom',
        prompts: {
          recap: DEFAULT_RECAP_PROMPT,
          extraction: DEFAULT_EXTRACTION_PROMPT,
        },
        version: 1,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const current = await kv.get<AppSettings>(SETTINGS_KEY) || getDefaultSettings();
    
    const updated: AppSettings = {
      ...current,
      ...body,
      updatedAt: new Date().toISOString(),
      version: (current.version || 0) + 1,
    };

    // Validate
    if (updated.prompts?.recap && updated.prompts.recap.length > 10000) {
      return NextResponse.json(
        { error: 'Recap prompt too long (max 10,000 characters)' },
        { status: 400 }
      );
    }
    if (updated.prompts?.extraction && updated.prompts.extraction.length > 10000) {
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

    await kv.set(SETTINGS_KEY, JSON.stringify(updated));
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

### 5. Settings Page (`app/settings/page.tsx`)

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    webhookUrl: '',
    prompts: {
      recap: '',
      extraction: '',
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(err => {
        setMessage({ type: 'error', text: 'Failed to load settings' });
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Settings</h1>

      {message && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          borderRadius: '4px',
        }}>
          {message.text}
        </div>
      )}

      <section style={{ marginBottom: '2rem' }}>
        <h2>Webhook URL</h2>
        <input
          type="text"
          value={settings.webhookUrl}
          onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
          placeholder="https://your-app.vercel.app/webhook/fathom"
          style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
        />
        <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
          This is the URL where Fathom sends webhooks. Update this in Fathom's dashboard.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Slack Recap Prompt</h2>
        <textarea
          value={settings.prompts.recap}
          onChange={(e) => setSettings({
            ...settings,
            prompts: { ...settings.prompts, recap: e.target.value }
          })}
          rows={20}
          style={{ width: '100%', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}
        />
        <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
          Template variables: <code>{'{{TRANSCRIPT_TEXT}}'}</code>, <code>{'{{SUMMARY}}'}</code>
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Action Item Extraction Prompt</h2>
        <textarea
          value={settings.prompts.extraction}
          onChange={(e) => setSettings({
            ...settings,
            prompts: { ...settings.prompts, extraction: e.target.value }
          })}
          rows={20}
          style={{ width: '100%', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}
        />
        <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
          Template variables: <code>{'{{TRANSCRIPT}}'}</code>, <code>{'{{SUMMARY}}'}</code>
        </p>
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
```

## 🎨 Optional Enhancements

### 1. Prompt Preview

Create `app/api/settings/preview/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { promptType, prompt, sampleTranscript, sampleSummary } = await request.json();
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const filledPrompt = prompt
      .replace('{{TRANSCRIPT}}', sampleTranscript || 'Sample transcript text...')
      .replace('{{TRANSCRIPT_TEXT}}', sampleTranscript || 'Sample transcript text...')
      .replace('{{SUMMARY}}', sampleSummary || 'Sample summary...');

    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: promptType === 'recap'
            ? 'You are an expert RevOps + GTM meeting note-taker.'
            : 'You are a helpful assistant that extracts action items from meeting transcripts.',
        },
        { role: 'user', content: filledPrompt },
      ],
      response_format: promptType === 'extraction' ? { type: 'json_object' } : undefined,
    });

    return NextResponse.json({
      output: response.choices[0]?.message?.content || '',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Preview generation failed' },
      { status: 500 }
    );
  }
}
```

### 2. Version History

Store snapshots in KV with key pattern: `config:settings:history:${version}`

```typescript
// In settings update:
await kv.set(`config:settings:history:${updated.version}`, JSON.stringify(updated));
await kv.zadd('config:settings:versions', updated.version, updated.version); // For listing
```

### 3. UI Validation

- Real-time URL validation (show error if invalid)
- Character count for prompts
- Required field validation
- Unsaved changes warning

## 🔒 Security Considerations

1. **Authentication** (Future Enhancement)
   - Add basic auth or API key to `/api/settings` routes
   - Protect settings page with authentication middleware

2. **Rate Limiting**
   - Limit settings update frequency
   - Limit preview API calls

3. **Input Validation**
   - Sanitize prompt inputs (prevent XSS in preview)
   - Validate URL format
   - Enforce max prompt length

## 📦 Dependencies to Add

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

## 🚀 Deployment Considerations

1. **Vercel Configuration**
   - Next.js apps deploy automatically on Vercel
   - Ensure KV environment variables are set
   - Update `vercel.json` if needed for routing

2. **Migration Strategy**
   - On first deployment, KV will be empty
   - Settings service falls back to defaults (current hard-coded prompts)
   - Users can update via UI, which populates KV

3. **Backward Compatibility**
   - Existing serverless functions continue to work
   - Settings service gracefully handles missing KV data
   - Default prompts ensure system works even if KV fails

## ✅ Testing Checklist

- [ ] Settings service reads from KV correctly
- [ ] Settings service falls back to defaults when KV is empty
- [ ] Settings update persists to KV
- [ ] Cache invalidation works correctly
- [ ] AI services use prompts from settings
- [ ] Next.js API routes return correct data
- [ ] Settings page loads and saves correctly
- [ ] Prompt changes reflect in next webhook processing
- [ ] URL validation works
- [ ] Preview functionality works (if implemented)
- [ ] Version history works (if implemented)

## 📝 Notes

- **Webhook URL**: While the URL is configured in Fathom's dashboard, storing it in the app provides:
  - Reference/documentation
  - Future automation possibilities
  - Consistency checks
- **Prompt Templates**: Keep current prompts as defaults in code for fallback
- **Caching**: In-memory cache reduces KV lookups but may cause 5-minute delay before changes take effect (acceptable trade-off)
- **Next.js vs. Standalone Pages**: Using Next.js App Router for seamless integration with Vercel deployment
