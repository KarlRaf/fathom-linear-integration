'use client';

import Link from 'next/link';
import LogoutButton from '../components/LogoutButton';

export default function DashboardPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      padding: '2rem',
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '3rem',
        }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#1f2937',
            margin: 0,
          }}>
            Dashboard
          </h1>
          <LogoutButton />
        </div>

        {/* Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
        }}>
          {/* Reviews Card */}
          <Link 
            href="/reviews"
            style={{
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.2s',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
            }}
            >
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
              }}>
                📋
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '0.5rem',
              }}>
                Reviews
              </h2>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: 0,
              }}>
                View and manage all meeting reviews, approve or reject action items, and track their status.
              </p>
            </div>
          </Link>

          {/* Create Review Card */}
          <Link 
            href="/reviews/create"
            style={{
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.2s',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
            }}
            >
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
              }}>
                ➕
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '0.5rem',
              }}>
                Create Review
              </h2>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: 0,
              }}>
                Manually create a review by pasting a meeting transcript. Extract action items and create Linear issues.
              </p>
            </div>
          </Link>

          {/* Settings Card */}
          <Link 
            href="/settings"
            style={{
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.2s',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
            }}
            >
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
              }}>
                ⚙️
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '0.5rem',
              }}>
                Settings
              </h2>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: 0,
              }}>
                Configure webhook URL, AI prompts, Linear credentials, and other application settings.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
