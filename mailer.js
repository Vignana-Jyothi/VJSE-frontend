require('dotenv').config();
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

// Email 1 — Sent to LEAD asking if they are aware and willing
async function sendLeadInviteEmail({ leadEmail, leadName, founderName, startupName, sourcerName, inviteToken, connectionId }) {
  const yesLink = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/invite/respond?token=${inviteToken}&response=yes&connectionId=${connectionId}`;
  const noLink = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/invite/respond?token=${inviteToken}&response=no&connectionId=${connectionId}`;

  const mailOptions = {
    from: `"VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: leadEmail,
    subject: `An Invitation from VJ Startups — ${founderName} would like to connect`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 4px;">VJ Startups</h2>
        <p style="color: #6B7280; font-size: 13px; margin-top: 0;">Startup Support Ecosystem — VJ College</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p style="font-size: 15px; color: #111827;">Dear ${leadName},</p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          We are writing to you on behalf of <strong>${founderName}</strong>, the founder of 
          <strong>${startupName}</strong>, a student startup from VJ College.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          Your contact details were shared with our platform by <strong>${sourcerName}</strong>, 
          who believed you could offer valuable guidance or support to early-stage student startups 
          in your domain.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          Before we proceed, we would like to confirm — are you aware of this and are you open to 
          a short conversation or product demo with this student startup?
        </p>

        <div style="margin: 32px 0; text-align: center;">
          <a href="${yesLink}" style="display: inline-block; background-color: #1D9E75; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; margin-right: 16px;">
            Yes, I am in
          </a>
          <a href="${noLink}" style="display: inline-block; background-color: #ffffff; color: #374151; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; border: 1px solid #d1d5db;">
            No, thank you
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; line-height: 1.6;">
          This invitation was sent by VJ Startups, the student startup support ecosystem at VJ College. 
          If you have any concerns please reply to this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Lead invite email sent to: ${leadEmail}`);
}

// Email 2 — Sent to SOURCER requesting warm introduction to the lead
async function sendSourcerNotificationEmail({ sourcerEmail, sourcerName, leadName, founderName }) {
  const mailOptions = {
    from: `"VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: sourcerEmail,
    subject: `Warm Introduction Request: ${founderName} wants to connect with ${leadName}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 4px;">VJ Startups</h2>
        <p style="color: #6B7280; font-size: 13px; margin-top: 0;">Startup Support Ecosystem — VJ College</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p style="font-size: 15px; color: #111827;">Dear ${sourcerName},</p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          Thank you for submitting the lead for <strong>${leadName}</strong> to the VJ Startups platform!
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          <strong>${founderName}</strong>, a student startup founder in our ecosystem, has reviewed 
          ${leadName}'s profile and requested a connection to seek guidance and potential mentorship.
        </p>

        <div style="background-color: #F3F4F6; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="font-size: 15px; color: #1F2937; margin: 0; font-weight: bold;">
            Warm Introduction Request:
          </p>
          <p style="font-size: 14px; color: #4B5563; margin: 8px 0 0 0; line-height: 1.6;">
            Since you submitted this lead, could you please provide a warm introduction connecting 
            <strong>${founderName}</strong> with <strong>${leadName}</strong> over email or WhatsApp? 
            A personal introduction from you will help build initial trust.
          </p>
        </div>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          We have also sent an automated notification email to ${leadName} to confirm their availability.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF;">
          VJ Startups — Startup Support Ecosystem, VJ College
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Warm intro request email sent to sourcer: ${sourcerEmail}`);
}

// Email 3 — Sent to LEAD after they click Yes I am in
async function sendWelcomeEmail({ leadEmail, leadName, founderName, startupName }) {
  const signupLink = process.env.FRONTEND_URL || 'http://localhost:5173';

  const mailOptions = {
    from: `"VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: leadEmail,
    subject: `Welcome to VJ Startups — You are now connected with ${founderName}`,
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
          <strong>${founderName}</strong> from <strong>${startupName}</strong> will be in touch 
          with you shortly through a warm introduction facilitated by the student who referred you.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          You can also visit our platform to learn more about the startups in our ecosystem:
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
  console.log(`✉️ Welcome email sent to lead: ${leadEmail}`);
}

module.exports = { sendLeadInviteEmail, sendSourcerNotificationEmail, sendWelcomeEmail };
