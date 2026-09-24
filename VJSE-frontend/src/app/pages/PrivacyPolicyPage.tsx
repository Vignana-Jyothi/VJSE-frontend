import { useNavigate } from 'react-router-dom';

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

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

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
          onClick={() => navigate(-1)}
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
          <h1 style={{ color: 'white', fontSize: '36px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Privacy Policy</h1>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>VJ Startups — Last updated: August 2026</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 1 — Who we are</h2>
          <p style={paraStyle}>
            VJ Startups is a student startup support ecosystem operated by the startup cell of VJ College of Engineering and Technology, Hyderabad. We help student startups find warm introductions to industry professionals through a trusted referral network.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 2 — What data we collect and why</h2>
          <p style={paraStyle}>We collect two categories of data:</p>
          <p style={paraStyle}>
            <strong style={{ color: 'white' }}>Data submitted by students voluntarily:</strong> When a VJ College student submits a professional contact to our platform they provide: the contact's name, email address, phone number, organisation, job title, and domain. This is submitted with the student's confirmation that the contact is aware and willing to be approached.
          </p>
          <p style={paraStyle}>
            <strong style={{ color: 'white' }}>Data provided by users who register:</strong> When a user creates an account via Google Sign-In we store their name, email address, Google profile ID, and the role they are assigned on the platform. Students who complete their profile also provide their phone number, year of study, and branch.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 3 — How we use your data</h2>
          <p style={paraStyle}>
            Professional contact details (mentor data) are used solely to facilitate warm introductions between student startups and industry professionals. Contact details are never shown publicly and are only accessible to verified student founders, platform volunteers, and administrators. We do not sell, share, or transfer your data to any third party.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 4 — Who can see your data</h2>
          <p style={paraStyle}>
            Your professional details are visible to: verified student founders searching for mentors in your domain (name, organisation, domain, and skills only — your email and phone are never shown to founders), platform volunteers who verify submissions, and platform administrators who manage the ecosystem.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 5 — Email communications</h2>
          <p style={paraStyle}>
            If your contact details were submitted to our platform by a VJ College student you may receive an email invitation asking if you are open to connecting with a student startup. You can decline this invitation at any time by clicking the "No thank you" button in the email. To stop receiving any further emails from us click the unsubscribe link in any email we send you or contact us at the email below.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 6 — Your rights</h2>
          <p style={paraStyle}>
            You have the right to: know what data we hold about you, request correction of inaccurate data, request deletion of your data, withdraw consent at any time. To exercise any of these rights email us at the contact address below and we will respond within 7 working days.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 7 — Data retention</h2>
          <p style={paraStyle}>
            We retain professional contact data for as long as the platform is active or until you request deletion. User account data is retained until the account is deleted.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 8 — Security</h2>
          <p style={paraStyle}>
            All data is stored in an encrypted database using AES-256 encryption. Access is restricted by role-based authentication. We use HTTPS for all data transmission.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 9 — Contact us</h2>
          <p style={paraStyle}>
            For any privacy concerns, data requests, or questions contact the VJ Startups team at the startup cell, VJ College of Engineering and Technology, Hyderabad.
          </p>
          <p style={paraStyle}>
            Email: <a href="mailto:vjstartups25@gmail.com" style={{ color: '#1D9E75' }}>vjstartups25@gmail.com</a>
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Section 10 — Changes to this policy</h2>
          <p style={paraStyle}>
            We may update this policy as the platform evolves. The last updated date at the top of this page will always reflect the most recent version.
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
