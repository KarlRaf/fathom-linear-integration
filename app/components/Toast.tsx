'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: { type: 'success' | 'error'; text: string } | null;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto-close after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  const isSuccess = message.type === 'success';

  // Check if message contains URLs (starts with http/https)
  const lines = message.text.split('\n');
  const mainText = lines[0];
  const urlLines = lines.slice(1).filter(line => line.trim().startsWith('•'));
  
  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        padding: '1rem 1.5rem',
        backgroundColor: isSuccess ? '#10b981' : '#dc2626',
        color: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        zIndex: 9999,
        maxWidth: '500px',
        animation: 'slideIn 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: urlLines.length > 0 ? '0.5rem' : 0 }}>{mainText}</div>
          {urlLines.length > 0 && (
            <div style={{ fontSize: '0.875rem', lineHeight: 1.6, marginTop: '0.5rem' }}>
              {urlLines.map((line, idx) => {
                const parts = line.split(': ');
                if (parts.length === 2) {
                  const [title, url] = parts;
                  return (
                    <div key={idx} style={{ marginBottom: '0.25rem' }}>
                      <span>{title}: </span>
                      <a
                        href={url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          color: 'white',
                          textDecoration: 'underline',
                          fontWeight: 500,
                        }}
                      >
                        Open in Linear
                      </a>
                    </div>
                  );
                }
                return <div key={idx}>{line}</div>;
              })}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '1.25rem',
            lineHeight: 1,
            padding: 0,
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
