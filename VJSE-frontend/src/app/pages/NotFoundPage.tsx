export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '24px'
    }}>
      <div style={{ fontSize: '80px', marginBottom: '16px' }}>🚀</div>
      <h1 style={{ color: 'white', fontSize: '48px', fontWeight: 'bold', margin: '0 0 8px 0' }}>404</h1>
      <h2 style={{ color: '#1D9E75', fontSize: '22px', margin: '0 0 16px 0' }}>Lost in space</h2>
      <p style={{
        color: '#9CA3AF',
        fontSize: '16px',
        maxWidth: '400px',
        lineHeight: '1.6',
        margin: '0 0 32px 0'
      }}>
        The page you are looking for does not exist or has been moved. Let us get you back on track.
      </p>
      <button
        onClick={() => window.location.href = '/'}
        style={{
          background: 'linear-gradient(135deg, #1D9E75, #157A5C)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 28px',
          fontSize: '15px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Return to Dashboard
      </button>
    </div>
  );
}
