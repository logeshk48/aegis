const { buildDigestForUser } = require('../services/digestService');
const { sendEmail } = require('../services/emailService');

// @desc   Send a digest email to the logged-in user (manual trigger)
// @route  POST /api/digest/send
// @access Protected
const sendMyDigest = async (req, res) => {
  try {
    const { subject, html } = await buildDigestForUser(req.user);

    await sendEmail({
      to: req.user.email,
      subject,
      html,
    });

    res.status(200).json({ message: `Digest sent to ${req.user.email} 📧` });
  } catch (error) {
    console.error('Digest send error:', error.message);
    res.status(500).json({ message: 'Could not send digest', error: error.message });
  }
};

module.exports = { sendMyDigest };