// Node.js backend for handling supplier form and sending email via Gmail
// 1. Install dependencies: npm install express nodemailer cors body-parser dotenv
// 2. Create a .env file and set GMAIL_USER, GMAIL_PASS, and optionally RECEIVER_EMAIL

require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000; // You can change this if needed

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

  // Configure nodemailer with Gmail using environment variables
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  const receiverEmail = process.env.RECEIVER_EMAIL || gmailUser;

  if (!gmailUser || !gmailPass) {
    console.error('Email configuration missing. GMAIL_USER or GMAIL_PASS is not set.');
    return res.status(200).json({ message: 'Thank you for your application! We received your request, but email delivery is not configured yet.' });
  }

  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: gmailUser,
      pass: gmailPass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"FarmiNova Global Trade" <${gmailUser}>`,
    to: receiverEmail,
    subject: 'New Supplier Application - FarmiNova Global Trade',
    text: `Supplier Application Received:\n\nFull Name: ${full_name}\nFarm / Company Name: ${company_name}\nEmail Address: ${email}\nPhone Number: ${phone}\nProducts Supplied: ${products}\nAdditional Details: ${details}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Thank you for your application! Your details have been sent successfully.' });
  } catch (error) {
    console.error('Failed to send supplier email:', error);
    res.status(200).json({
      message: 'Thank you for your application! We received your request, but email delivery failed. We will review it manually.',
      warning: 'EMAIL_DELIVERY_FAILED'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


