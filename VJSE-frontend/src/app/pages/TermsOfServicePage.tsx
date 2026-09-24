const sectionStyle: React.CSSProperties = {
  marginBottom: '36px',
};

const headingStyle: React.CSSProperties = {
  color: '#1D9E75',
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '10px',
  borderBottom: '1px solid #1F2937',
  paddingBottom: '8px',
};

const paraStyle: React.CSSProperties = {
  color: '#9CA3AF',
  fontSize: '15px',
  lineHeight: '1.8',
  margin: '0 0 10px 0',
};

export default function TermsOfServicePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '40px 24px',
      color: 'white',
    }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          style={{
            background: 'transparent',
            border: '1px solid #1F2937',
            color: '#9CA3AF',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '32px',
          }}
        >
          ← Back
        </button>

        <div style={{ marginBottom: '40px' }}>
          <p style={{ color: '#1D9E75', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>Legal</p>
          <h1 style={{ color: 'white', fontSize: '36px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Terms of Service</h1>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>VJ Startups — Last updated: August 2026</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 1 — Acceptance</h2>
          <p style={paraStyle}>
            By accessing or using VJ Startups you agree to these terms. If you do not agree do not use the platform.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 2 — Who can use this platform</h2>
          <p style={paraStyle}>
            This platform is operated for the exclusive use of VJ College of Engineering and Technology students, faculty, and approved industry professionals. Access is granted by role assignment from platform administrators.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 3 — Student responsibilities</h2>
          <p style={paraStyle}>
            Students who submit professional contacts confirm that: the contact is aware their details are being submitted, the contact has expressed willingness to be approached, the information submitted is accurate to the best of their knowledge. Submitting false or fabricated contact details will result in immediate account suspension.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 4 — Founder responsibilities</h2>
          <p style={paraStyle}>
            Founders who request introductions agree to: use the connection for genuine startup-related purposes only, treat mentors and contacts with professionalism and respect, not contact a mentor directly using details obtained outside this platform.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 5 — Prohibited conduct</h2>
          <p style={paraStyle}>
            You may not: submit fake or duplicate contacts, use the platform for commercial solicitation unrelated to your startup, share your account credentials, attempt to access data beyond your assigned role.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 6 — Platform availability</h2>
          <p style={paraStyle}>
            VJ Startups is provided as-is by the VJ College startup cell. We do not guarantee uninterrupted availability and may modify or discontinue the service at any time.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 7 — Limitation of liability</h2>
          <p style={paraStyle}>
            VJ Startups facilitates introductions but is not responsible for the outcome of any connection made through the platform.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 8 — Contact</h2>
          <p style={paraStyle}>
            For any questions about these terms contact the VJ Startups team at VJ College of Engineering and Technology, Hyderabad.
          </p>
          <p style={paraStyle}>
            Email: <a href="mailto:vjstartups25@gmail.com" style={{ color: '#1D9E75' }}>vjstartups25@gmail.com</a>
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #1F2937' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              background: 'linear-gradient(135deg, #1D9E75, #157A5C)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
          <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '24px' }}>
            © {new Date().getFullYear()} VJ Startups — VJ College of Engineering and Technology
          </p>
        </div>
      </div>
    </div>
  );
}
