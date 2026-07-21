const { Resend } = require('resend');

// send an email
const sendEmail = async ({ to, subject, html }) => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      // NOTE: 'onboarding@resend.dev' is Resend's shared test sender.
      // To email other people, verify your own domain in Resend and use e.g. 'aegis@yourdomain.com'
      from: 'Aegis <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Email send error:', error);
      throw new Error(error.message || 'Failed to send email');
    }

    console.log('📧 Email sent:', data?.id);
    return data;
  } catch (err) {
    console.error('Email service error:', err.message);
    throw err;
  }
};

module.exports = { sendEmail };