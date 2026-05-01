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
  
  console.log('📬 Received supplier form submission:', { full_name, company_name, email, phone });

  const brevoApiKey = process.env.BREVO_API_KEY;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  const receiverEmail = process.env.RECEIVER_EMAIL || gmailUser;

  if (!receiverEmail) {
    console.error('❌ Receiver email not configured.');
    return res.status(500).json({
      message: 'Email configuration incomplete. Please contact the administrator.'
    });
  }

  const emailBody = `Supplier Application Received:\n\nFull Name: ${full_name}\nFarm / Company Name: ${company_name}\nEmail Address: ${email}\nPhone Number: ${phone}\nProducts Supplied: ${products}\nAdditional Details: ${details}`;

  // Try Brevo first (more reliable on Render)
  if (brevoApiKey) {
    console.log('📧 Attempting to send via Brevo...');
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'FarmiNova Global Trade', email: 'noreply@farminovaglobaltrade.com' },
          to: [{ email: receiverEmail }],
          subject: 'New Supplier Application - FarmiNova Global Trade',
          textContent: emailBody
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo error ${response.status}: ${errorText}`);
      }

      console.log('✅ Email sent successfully via Brevo');
      return res.status(200).json({ message: 'Thank you for your application! Your details have been sent successfully.' });
    } catch (error) {
      console.error('❌ Brevo failed:', error.message);
    }
  }

  // Fallback to Gmail
  if (!gmailUser || !gmailPass) {
    console.error('❌ Email configuration missing. Set BREVO_API_KEY or GMAIL_USER + GMAIL_PASS.');
    return res.status(500).json({
      message: 'Email service is not configured. Please try again later.'
    });
  }

  console.log('📧 Attempting to send via Gmail SMTP...');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  });

  try {
    await transporter.sendMail({
      from: `"FarmiNova Global Trade" <${gmailUser}>`,
      to: receiverEmail,
      subject: 'New Supplier Application - FarmiNova Global Trade',
      text: emailBody
    });
    console.log('✅ Email sent successfully via Gmail');
    res.status(200).json({ message: 'Thank you for your application! Your details have been sent successfully.' });
  } catch (error) {
    console.error('❌ Gmail SMTP failed:', error.message);
    res.status(502).json({
      message: 'Unable to send your application email right now. Please try again later.',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


