'use client';

import { useState } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: 'small' | 'medium';
}

export default function CopyButton({ text, label, size = 'medium' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const sizeStyles = {
    small: {
      padding: '0.25rem 0.5rem',
      fontSize: '0.75rem',
    },
    medium: {
      padding: '0.5rem 0.75rem',
      fontSize: '0.875rem',
    },
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        ...sizeStyles[size],
        backgroundColor: copied ? '#10b981' : '#f3f4f6',
        color: copied ? 'white' : '#374151',
        border: '1px solid #d1d5db',
        borderRadius: '0.25rem',
        cursor: 'pointer',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s',
      }}
      title={copied ? 'Copied!' : `Copy ${label || 'text'}`}
    >
      {copied ? '✓ Copied' : label ? `📋 ${label}` : '📋 Copy'}
    </button>
  );
}
