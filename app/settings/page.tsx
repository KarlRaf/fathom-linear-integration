'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import LogoutButton from '../components/LogoutButton';

interface AppSettings {
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
  version: number;
}

interface PreviewResult {
  type: 'extraction' | 'recap';
  result: any;
  rawOutput?: string;
  formattedResult?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingCache, setRefreshingCache] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState<AppSettings>({
    webhookUrl: '',
    prompts: {
      recap: '',
      extraction: '',
    },
    linear: {
      apiKey: '',
      teamId: '',
      projectId: '',
      stateId: '',
      assignee: '',
    },
    updatedAt: '',
    version: 1,
  });

  // Preview state
  const [previewing, setPreviewing] = useState<'extraction' | 'recap' | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [sampleTranscript, setSampleTranscript] = useState('');
  const [sampleSummary, setSampleSummary] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      setSettings(data);
      // Initialize formData with defaults if linear is not set
      setFormData({
        ...data,
        linear: data.linear || {
          apiKey: '',
          teamId: '',
          projectId: '',
          stateId: '',
          assignee: '',
        },
      });
      setMessage(null);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: formData.webhookUrl,
          prompts: {
            recap: formData.prompts.recap,
            extraction: formData.prompts.extraction,
          },
          linear: formData.linear,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      const updated = await response.json();
      setSettings(updated);
      setFormData(updated);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshCache = async () => {
    try {
      setRefreshingCache(true);
      setMessage(null);
      
      const response = await fetch('/api/settings/refresh-cache', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refresh cache');
      }

      setMessage({ type: 'success', text: 'Cache cleared! Prompt changes will be applied immediately.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to refresh cache' });
    } finally {
      setRefreshingCache(false);
    }
  };

  const handlePreview = async (promptType: 'extraction' | 'recap') => {
    if (!sampleTranscript.trim()) {
      setMessage({ type: 'error', text: 'Please enter a sample transcript to test the prompt.' });
      return;
    }

    try {
      setPreviewing(promptType);
      setPreviewResult(null);
      setMessage(null);

      const prompt = promptType === 'extraction' 
        ? formData.prompts.extraction 
        : formData.prompts.recap;

      const response = await fetch('/api/settings/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptType,
          prompt,
          sampleTranscript,
          sampleSummary: sampleSummary || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || 'Failed to generate preview');
      }

      const result = await response.json();
      setPreviewResult(result);
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Failed to generate preview' 
      });
    } finally {
      setPreviewing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', padding: '4rem' }}>
          <Spinner size={32} />
          <span style={{ color: '#6b7280', fontSize: '1rem' }}>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <Toast message={message} onClose={() => setMessage(null)} />
      
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Settings</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>
              Home
            </Link>
            <Link href="/reviews" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}>
              Reviews
            </Link>
            <LogoutButton />
          </div>
        </div>
        {settings && (
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Last updated: {formatDate(settings.updatedAt)} • Version {settings.version}
          </div>
        )}
      </div>

      {/* Webhook URL Section */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Webhook URL</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
          The Fathom webhook URL for receiving meeting transcripts. This is for reference only.
        </p>
        <input
          type="url"
          value={formData.webhookUrl}
          onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
          placeholder="https://your-app.vercel.app/webhook/fathom"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '1rem',
          }}
        />
      </div>

      {/* Linear Configuration Section */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', backgroundColor: '#f9fafb' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Linear Configuration</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Configure Linear API credentials. These will override environment variables. Leave empty to use environment variables.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              API Key *
            </label>
            <input
              type="password"
              value={formData.linear?.apiKey || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                linear: { ...formData.linear, apiKey: e.target.value } 
              })}
              placeholder="lin_api_..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Team ID *
            </label>
            <input
              type="text"
              value={formData.linear?.teamId || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                linear: { ...formData.linear, teamId: e.target.value } 
              })}
              placeholder="Team UUID"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Project ID (Optional)
            </label>
            <input
              type="text"
              value={formData.linear?.projectId || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                linear: { ...formData.linear, projectId: e.target.value } 
              })}
              placeholder="Project UUID"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              State ID (Optional)
            </label>
            <input
              type="text"
              value={formData.linear?.stateId || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                linear: { ...formData.linear, stateId: e.target.value } 
              })}
              placeholder="Workflow state UUID (e.g., Triage)"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Default Assignee (Optional)
          </label>
          <input
            type="text"
            value={formData.linear?.assignee || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              linear: { ...formData.linear, assignee: e.target.value } 
            })}
            placeholder="Karl"
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
            }}
          />
          <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Default assignee name if not specified in action items
          </p>
        </div>
      </div>

      {/* Sample Data Section for Preview */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', backgroundColor: '#f9fafb' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Test Data for Prompt Preview</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Enter sample transcript and summary to test your prompts before saving.
        </p>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Sample Summary (optional)
          </label>
          <textarea
            value={sampleSummary}
            onChange={(e) => setSampleSummary(e.target.value)}
            placeholder="Enter a sample meeting summary..."
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Sample Transcript *
          </label>
          <textarea
            value={sampleTranscript}
            onChange={(e) => setSampleTranscript(e.target.value)}
            placeholder="Enter a sample meeting transcript to test the prompts..."
            rows={8}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
          <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.75rem' }}>
            {sampleTranscript.length} characters
          </div>
        </div>
      </div>

      {/* Extraction Prompt Section */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Action Item Extraction Prompt</h2>
          <button
            onClick={() => handlePreview('extraction')}
            disabled={previewing === 'extraction' || !sampleTranscript.trim()}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              backgroundColor: previewing === 'extraction' || !sampleTranscript.trim() ? '#d1d5db' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: previewing === 'extraction' || !sampleTranscript.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {previewing === 'extraction' ? '⏳ Testing...' : '🔍 Preview'}
          </button>
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
          This prompt is used to extract action items from meeting transcripts. Use <code style={{ backgroundColor: '#f3f4f6', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>{'{{TRANSCRIPT}}'}</code> and <code style={{ backgroundColor: '#f3f4f6', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>{'{{SUMMARY}}'}</code> as placeholders.
        </p>
        <textarea
          value={formData.prompts.extraction}
          onChange={(e) => setFormData({ ...formData, prompts: { ...formData.prompts, extraction: e.target.value } })}
          rows={20}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            resize: 'vertical',
          }}
        />
        <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.75rem' }}>
          {formData.prompts.extraction.length} characters
        </div>

        {/* Preview Result for Extraction */}
        {previewResult && previewResult.type === 'extraction' && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '0.5rem',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#166534' }}>
              Preview Results ({previewResult.result.length} action item{previewResult.result.length !== 1 ? 's' : ''})
            </h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <pre style={{
                backgroundColor: '#ffffff',
                padding: '1rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {JSON.stringify(previewResult.result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Recap Prompt Section */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Recap Generation Prompt</h2>
          <button
            onClick={() => handlePreview('recap')}
            disabled={previewing === 'recap' || !sampleTranscript.trim()}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              backgroundColor: previewing === 'recap' || !sampleTranscript.trim() ? '#d1d5db' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: previewing === 'recap' || !sampleTranscript.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {previewing === 'recap' ? '⏳ Testing...' : '🔍 Preview'}
          </button>
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
          This prompt is used to generate meeting recaps. Use <code style={{ backgroundColor: '#f3f4f6', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>{'{{TRANSCRIPT_TEXT}}'}</code> and <code style={{ backgroundColor: '#f3f4f6', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>{'{{SUMMARY}}'}</code> as placeholders.
        </p>
        <textarea
          value={formData.prompts.recap}
          onChange={(e) => setFormData({ ...formData, prompts: { ...formData.prompts, recap: e.target.value } })}
          rows={25}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            resize: 'vertical',
          }}
        />
        <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.75rem' }}>
          {formData.prompts.recap.length} characters
        </div>

        {/* Preview Result for Recap */}
        {previewResult && previewResult.type === 'recap' && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '0.5rem',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#166534' }}>
              Preview Result
            </h3>
            <div style={{
              backgroundColor: '#ffffff',
              padding: '1rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
              {previewResult.formattedResult || previewResult.result}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={handleRefreshCache}
          disabled={refreshingCache}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            cursor: refreshingCache ? 'not-allowed' : 'pointer',
            opacity: refreshingCache ? 0.6 : 1,
            fontWeight: 500,
          }}
          title="Clear the prompt cache to apply changes immediately without waiting for the 5-minute cache TTL"
        >
          {refreshingCache ? 'Refreshing...' : '🔄 Refresh Prompt Cache'}
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            fontWeight: 600,
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
