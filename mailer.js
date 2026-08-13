require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

// Email 1 — Sent to SOURCER when founder requests intro
// Sourcer must respond before mentor is contacted
async function sendSourcerIntroRequestEmail({
  sourcerEmail,
  sourcerName,
  founderName,
  startupName,
  mentorName,
  sourcerInviteToken,
  connectionId
}) {
  const yesLink = `${APP_BASE_URL}/api/invite/sourcer-respond?token=${sourcerInviteToken}&response=yes&connectionId=${connectionId}`;
  const noLink = `${APP_BASE_URL}/api/invite/sourcer-respond?token=${sourcerInviteToken}&response=no&connectionId=${connectionId}`;

  const mailOptions = {
    from: `"VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: sourcerEmail,
    subject: `Action Required — ${founderName} wants to connect with ${mentorName} through you`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 4px;">VJ Startups</h2>
        <p style="color: #6B7280; font-size: 13px; margin-top: 0;">Startup Support Ecosystem — VJ College</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p style="font-size: 15px; color: #111827;">Dear ${sourcerName},</p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          A founder from VJ College has expressed interest in connecting with 
          <strong>${mentorName}</strong>, whose contact details you shared with the 
          VJ Startups platform.
        </p>

        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Founder:</strong> ${founderName}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Startup:</strong> ${startupName}</p>
          <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Your Contact:</strong> ${mentorName}</p>
        </div>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          Before we reach out to ${mentorName}, we need your confirmation. 
          Are you comfortable making this introduction?
        </p>

        <p style="font-size: 14px; color: #374151; line-height: 1.7;">
          If you click <strong>Yes</strong>, we will send a formal introduction request 
          to ${mentorName} on your behalf — with your name as the introducer.
          <br />
          If you click <strong>No</strong>, the process stops here and our volunteer 
          team will follow up with you directly.
        </p>

        <div style="margin: 32px 0; text-align: center;">
          <a href="${yesLink}" style="display: inline-block; background-color: #1D9E75; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; margin-right: 16px;">
            Yes, I will introduce them
          </a>
          <a href="${noLink}" style="display: inline-block; background-color: #ffffff; color: #374151; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; border: 1px solid #d1d5db;">
            No, I cannot help right now
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; line-height: 1.6;">
          This message was sent by VJ Startups because you submitted a contact to our platform. 
          If you have any concerns please reply to this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Sourcer intro request email sent to: ${sourcerEmail}`);
}

// Email 2 — Sent to MENTOR after sourcer says yes
// Sourcer name is prominent as the introducer
async function sendLeadInviteEmail({
  leadEmail,
  leadName,
  founderName,
  startupName,
  sourcerName,
  inviteToken,
  connectionId
}) {
  const yesLink = `${APP_BASE_URL}/api/invite/respond?token=${inviteToken}&response=yes&connectionId=${connectionId}`;
  const noLink = `${APP_BASE_URL}/api/invite/respond?token=${inviteToken}&response=no&connectionId=${connectionId}`;

  const mailOptions = {
    from: `"${sourcerName} via VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: leadEmail,
    subject: `${sourcerName} would like to introduce you to ${founderName} from ${startupName}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 4px;">VJ Startups</h2>
        <p style="color: #6B7280; font-size: 13px; margin-top: 0;">Startup Support Ecosystem — VJ College</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p style="font-size: 15px; color: #111827;">Dear ${leadName},</p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          <strong>${sourcerName}</strong>, who is known to you, would like to introduce you to 
          <strong>${founderName}</strong>, the founder of <strong>${startupName}</strong> — 
          a student startup from VJ College.
        </p>

        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Introduced by:</strong> ${sourcerName}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Founder:</strong> ${founderName}</p>
          <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Startup:</strong> ${startupName}</p>
        </div>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          They are looking for guidance, feedback, or a short conversation with someone 
          experienced in your domain. ${sourcerName} believed you would be the right person 
          to speak with.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          Would you be open to a short conversation or product demo with this student startup?
        </p>

        <div style="margin: 32px 0; text-align: center;">
          <a href="${yesLink}" style="display: inline-block; background-color: #1D9E75; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; margin-right: 16px;">
            Yes, I am open
          </a>
          <a href="${noLink}" style="display: inline-block; background-color: #ffffff; color: #374151; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; border: 1px solid #d1d5db;">
            No, thank you
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; line-height: 1.6;">
          This introduction was facilitated by VJ Startups, the student startup support 
          ecosystem at VJ College. If you have any concerns please reply to this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Mentor invite email sent to: ${leadEmail}`);
}

// Email 3 — Sent to SOURCER notifying them their intro request was sent to mentor
async function sendSourcerNotificationEmail({
  sourcerEmail,
  sourcerName,
  leadName,
  founderName
}) {
  const mailOptions = {
    from: `"VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: sourcerEmail,
    subject: `Update — We have reached out to ${leadName} on your behalf`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 4px;">VJ Startups</h2>
        <p style="color: #6B7280; font-size: 13px; margin-top: 0;">Startup Support Ecosystem — VJ College</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p style="font-size: 15px; color: #111827;">Dear ${sourcerName},</p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          Thank you for agreeing to make the introduction. We have now sent a formal 
          introduction request to <strong>${leadName}</strong> on your behalf.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          ${leadName} has been informed that you are introducing them to 
          <strong>${founderName}</strong>. We will notify you once they respond.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          If ${leadName} agrees, the VJ Startups team will coordinate the next steps 
          and keep you informed throughout.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF;">
          VJ Startups — Startup Support Ecosystem, VJ College
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Sourcer notification email sent to: ${sourcerEmail}`);
}

// Email 4 — Sent to MENTOR after they click Yes I am open
// Confirms the connection and gives them next steps
async function sendWelcomeEmail({
  leadEmail,
  leadName,
  founderName,
  startupName,
  sourcerName
}) {
  const signupLink = APP_BASE_URL;

  const mailOptions = {
    from: `"VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: leadEmail,
    subject: `Welcome — You are now connected with ${founderName} from ${startupName}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 4px;">VJ Startups</h2>
        <p style="color: #6B7280; font-size: 13px; margin-top: 0;">Startup Support Ecosystem — VJ College</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p style="font-size: 15px; color: #111827;">Dear ${leadName},</p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          Thank you for agreeing to connect. We are delighted to welcome you to the 
          VJ Startups ecosystem.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          <strong>${sourcerName}</strong> will personally reach out to you shortly 
          to facilitate the introduction with <strong>${founderName}</strong> from 
          <strong>${startupName}</strong>.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          The introduction will happen through ${sourcerName} who knows you personally 
          and will coordinate the best way to connect both parties.
        </p>

        <div style="margin: 32px 0; text-align: center;">
          <a href="${signupLink}" style="display: inline-block; background-color: #1D9E75; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold;">
            Visit VJ Startups Platform
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF;">
          VJ Startups — Startup Support Ecosystem, VJ College
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Welcome email sent to mentor: ${leadEmail}`);
}

module.exports = {
  sendSourcerIntroRequestEmail,
  sendLeadInviteEmail,
  sendSourcerNotificationEmail,
  sendWelcomeEmail
};
