'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Fathom-Linear Integration
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
          Manage reviews and configure AI prompts
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
        {/* Reviews Card */}
        <Link
          href="/reviews"
          style={{
            display: 'block',
            padding: '2rem',
            border: '2px solid #e5e7eb',
            borderRadius: '1rem',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 0.2s',
            backgroundColor: '#ffffff',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2563eb';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Reviews
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            View and manage pending reviews. Approve or reject action items and create Linear issues.
          </p>
        </Link>

        {/* Create Review Card */}
        <Link
          href="/reviews/create"
          style={{
            display: 'block',
            padding: '2rem',
            border: '2px solid #e5e7eb',
            borderRadius: '1rem',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 0.2s',
            backgroundColor: '#ffffff',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#8b5cf6';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>➕</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Create Review
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Manually create a review from a pasted transcript. Action items will be extracted automatically.
          </p>
        </Link>

        {/* Settings Card */}
        <Link
          href="/settings"
          style={{
            display: 'block',
            padding: '2rem',
            border: '2px solid #e5e7eb',
            borderRadius: '1rem',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 0.2s',
            backgroundColor: '#ffffff',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2563eb';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Settings
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Configure AI prompts and webhook URL. Customize action item extraction and recap generation.
          </p>
        </Link>
      </div>
    </div>
  );
}
