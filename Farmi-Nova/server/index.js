// Node.js backend for handling supplier form and sending email via Gmail
// 1. Install dependencies: npm install express nodemailer cors body-parser dotenv
// 2. Create a .env file and set GMAIL_USER, GMAIL_PASS, and optionally RECEIVER_EMAIL

require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000; // You can change this if needed

app.use(cors());
app.options('*', cors());
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Handle invalid JSON bodies without failing the entire submission.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Invalid JSON payload received:', err.message);
    console.error('Raw payload was:', req.rawBody);
    return res.status(400).json({
      message: 'The form payload could not be parsed. Please refresh the page and try again.'
    });
  }

  next(err);
});

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Backend is running. Use POST /send-supplier-form with JSON body.' });
});

app.get('/send-supplier-form', (req, res) => {
  res.status(200).json({
    message: 'Endpoint /send-supplier-form expects POST. Please send a JSON body with full_name, company_name, email, phone, products, details.'
  });
});

app.post('/send-supplier-form', async (req, res) => {
  const { full_name, company_name, email, phone, products, details } = req.body;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  const receiverEmail = process.env.RECEIVER_EMAIL || gmailUser || process.env.SENDGRID_FROM_EMAIL;
  const sendGridFromEmail = process.env.SENDGRID_FROM_EMAIL || gmailUser || receiverEmail;

  const emailBody = `Supplier Application Received:\n\nFull Name: ${full_name}\nFarm / Company Name: ${company_name}\nEmail Address: ${email}\nPhone Number: ${phone}\nProducts Supplied: ${products}\nAdditional Details: ${details}`;

  if (sendGridApiKey) {
    if (!receiverEmail || !sendGridFromEmail) {
      console.error('SendGrid email addresses are not configured. Set SENDGRID_FROM_EMAIL and RECEIVER_EMAIL.');
      return res.status(500).json({
        message: 'SendGrid email configuration is incomplete. Please contact the site administrator.'
      });
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: receiverEmail }],
              subject: 'New Supplier Application - FarmiNova Global Trade'
            }
          ],
          from: { email: sendGridFromEmail, name: 'FarmiNova Global Trade' },
          content: [{ type: 'text/plain', value: emailBody }]
        })
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`SendGrid error ${response.status}: ${responseText}`);
      }

      return res.status(200).json({ message: 'Thank you for your application! Your details have been sent successfully.' });
    } catch (error) {
      console.error('Failed to send supplier email via SendGrid:', error);
      return res.status(502).json({
        message: 'Unable to send your application email right now. Please try again later or contact us directly.',
        warning: 'EMAIL_DELIVERY_FAILED',
        error: error.message
      });
    }
  }

  if (!gmailUser || !gmailPass) {
    console.error('Email configuration missing. Use SENDGRID_API_KEY or set GMAIL_USER and GMAIL_PASS.');
    return res.status(500).json({
      message: 'Email is not configured on the server. Please contact the site administrator.'
    });
  }

  const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: gmailUser,
    pass: gmailPass
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
  debug: true,
  logger: true
});

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP VERIFY ERROR:", error);
  } else {
    console.log("SMTP READY");
  }
});
  const mailOptions = {
    from: `"FarmiNova Global Trade" <${gmailUser}>`,
    to: receiverEmail,
    subject: 'New Supplier Application - FarmiNova Global Trade',
    text: emailBody
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Thank you for your application! Your details have been sent successfully.' });
  } catch (error) {
    console.error('Failed to send supplier email via Gmail SMTP:', error);
    res.status(502).json({
      message: 'Unable to send your application email right now. Please try again later or contact us directly.',
      warning: 'EMAIL_DELIVERY_FAILED',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


