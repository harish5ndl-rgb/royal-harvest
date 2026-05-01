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
  const receiverEmail = process.env.RECEIVER_EMAIL;

  console.log('🔍 DEBUG - BREVO_API_KEY exists:', !!brevoApiKey);
  console.log('🔍 DEBUG - RECEIVER_EMAIL:', receiverEmail);

  if (!brevoApiKey) {
    console.error('❌ BREVO_API_KEY not configured!');
    return res.status(500).json({
      message: 'Email service not configured. Please contact administrator.'
    });
  }

  if (!receiverEmail) {
    console.error('❌ RECEIVER_EMAIL not configured.');
    return res.status(500).json({
      message: 'Receiver email not configured.'
    });
  }

  const emailBody = `Supplier Application Received:\n\nFull Name: ${full_name}\nFarm / Company Name: ${company_name}\nEmail Address: ${email}\nPhone Number: ${phone}\nProducts Supplied: ${products}\nAdditional Details: ${details}`;

  console.log('📧 Attempting to send via Brevo...');
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'FarmiNova Global Trade', email: 'farminovaglobaltrade@gmail.com' },
        to: [{ email: receiverEmail }],
        subject: 'New Supplier Application - FarmiNova Global Trade',
        textContent: emailBody
      })
    });

    console.log('Brevo response status:', response.status);
    const responseData = await response.text();
    console.log('Brevo response:', responseData);

    if (!response.ok) {
      throw new Error(`Brevo error ${response.status}: ${responseData}`);
    }

    console.log('✅ Email sent successfully via Brevo');
    return res.status(200).json({ message: 'Thank you for your application! Your details have been sent successfully.' });
  } catch (error) {
    console.error('❌ Brevo failed:', error.message);
    return res.status(502).json({
      message: 'Unable to send email. Please try again later.',
      error: error.message
    });
  }
});

// Serve static files (CSS, images, etc.)
const path = require('path');
app.use(express.static(path.join(__dirname, '../Farmi-Nova')));

// Clean URL routing - serve HTML pages without .html extension
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '../Farmi-Nova/index.html'));
});

app.get('/certificates', (req, res) => {
  res.sendFile(path.join(__dirname, '../Farmi-Nova/certifications.html'));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, '../Farmi-Nova/products.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '../Farmi-Nova/about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../Farmi-Nova/contact-us.html'));
});

app.get('/become-supplier', (req, res) => {
  res.sendFile(path.join(__dirname, '../Farmi-Nova/become-supplier.html'));
});

// Root path serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Farmi-Nova/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


