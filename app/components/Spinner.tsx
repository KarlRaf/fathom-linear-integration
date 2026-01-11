export default function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        border: '3px solid #e5e7eb',
        borderTopColor: '#2563eb',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}
