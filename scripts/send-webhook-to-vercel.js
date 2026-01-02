#!/usr/bin/env node

/**
 * Script to send a signed mock webhook to Vercel deployment
 * This signs the webhook payload with HMAC SHA-256 as Fathom does
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const VERCEL_URL = process.env.VERCEL_URL || 'https://fathom-linear-integration.vercel.app';
const WEBHOOK_SECRET = process.env.FATHOM_WEBHOOK_SECRET || process.env.FATHOM_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.error('❌ FATHOM_WEBHOOK_SECRET not found in environment variables');
  console.error('   Please set it in .env.local or export it');
  process.exit(1);
}

const mockPayloadPath = path.join(__dirname, '..', 'mock-webhook-payload.json');

if (!fs.existsSync(mockPayloadPath)) {
  console.error(`❌ Mock payload file not found: ${mockPayloadPath}`);
  process.exit(1);
}

// Read the mock payload
const mockPayload = JSON.parse(fs.readFileSync(mockPayloadPath, 'utf8'));

// Transform mock payload to FathomWebhookPayload format (same as test route does)
function parseTimestamp(timestamp) {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function transformMockPayload(mockPayload) {
  const transcriptText = mockPayload.transcript
    ? mockPayload.transcript.map((item) => `${item.speaker.display_name}: ${item.text}`).join('\n')
    : '';

  return {
    event: {
      id: `test-${Date.now()}`,
      event_type: 'recording.processed',
      timestamp: new Date().toISOString(),
    },
    recording: {
      id: mockPayload.recording_id?.toString() || 'test-recording',
      title: mockPayload.title || mockPayload.meeting_title || 'Test Recording',
      started_at: mockPayload.recording_start_time || mockPayload.scheduled_start_time || new Date().toISOString(),
      ended_at: mockPayload.recording_end_time || mockPayload.scheduled_end_time || new Date().toISOString(),
      duration_seconds: 0,
    },
    transcript: {
      text: transcriptText,
      paragraphs: mockPayload.transcript?.map((item) => ({
        speaker: item.speaker?.display_name || 'Unknown',
        text: item.text || '',
        start_time: parseTimestamp(item.timestamp || '00:00:00'),
        end_time: parseTimestamp(item.timestamp || '00:00:00') + 5,
      })) || [],
    },
    summary: mockPayload.default_summary?.markdown_formatted || '',
    action_items: mockPayload.action_items?.map((item) => ({
      text: item.description || '',
      owner: item.assignee?.name || undefined,
    })) || [],
    calendar_invitees: mockPayload.calendar_invitees?.map((invitee) => ({
      name: invitee.name,
      email: invitee.email,
      email_domain: invitee.email_domain,
      is_external: invitee.is_external,
    })) || [],
  };
}

// Transform the payload
const payload = transformMockPayload(mockPayload);

// Convert payload to JSON string
const payloadString = JSON.stringify(payload);

// Generate signature using HMAC SHA-256 (base64 encoded, with v1 prefix)
const signatureBase64 = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payloadString, 'utf8')
  .digest('base64');
  
const signature = `v1,${signatureBase64}`;

// Send to Vercel
const url = `${VERCEL_URL}/webhook/fathom`;

console.log(`📤 Sending signed webhook to: ${url}`);
console.log(`   Payload size: ${payloadString.length} bytes`);
console.log(`   Signature: ${signature.substring(0, 16)}...`);

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'webhook-signature': signature,
  },
  body: payloadString,
})
  .then(async (response) => {
    const text = await response.text();
    console.log(`\n✅ Response status: ${response.status} ${response.statusText}`);
    console.log(`\nResponse body:`);
    try {
      const json = JSON.parse(text);
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log(text);
    }

    if (!response.ok) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Error sending webhook:', error.message);
    process.exit(1);
  });

