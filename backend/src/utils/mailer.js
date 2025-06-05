const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendMail({ to, subject, text, html }) {
  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to, subject, text, html
  });
}

module.exports = { sendMail };
