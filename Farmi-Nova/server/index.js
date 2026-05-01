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

const path = require('path');
const fs = require('fs');

// Clean URL routing - serve HTML pages without .html extension
// These routes must come BEFORE static file serving
const projectRoot = process.cwd();
const htmlDir = path.join(projectRoot, 'Farmi-Nova');

console.log('Project root:', projectRoot);
console.log('HTML directory:', htmlDir);
console.log('HTML directory exists:', fs.existsSync(htmlDir));

// List all HTML files in the directory
if (fs.existsSync(htmlDir)) {
  const files = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));
  console.log('Available HTML files:', files);
}

app.get('/home', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(htmlDir, 'index.html'), (err) => {
    if (err) console.error('Error serving /home:', err.message);
  });
});

app.get('/certificates', (req, res) => {
  const filePath = path.join(htmlDir, 'certifications.html');
  console.log('Attempting to serve /certificates from:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(filePath, (err) => {
    if (err) console.error('Error serving /certificates:', err.message);
  });
});

app.get('/products', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(htmlDir, 'products.html'), (err) => {
    if (err) console.error('Error serving /products:', err.message);
  });
});

app.get('/about', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(htmlDir, 'about.html'), (err) => {
    if (err) console.error('Error serving /about:', err.message);
  });
});

app.get('/contact', (req, res) => {
  const filePath = path.join(htmlDir, 'contact-us.html');
  console.log('Attempting to serve /contact from:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(filePath, (err) => {
    if (err) console.error('Error serving /contact:', err.message);
  });
});

app.get('/become-supplier', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(htmlDir, 'become-supplier.html'), (err) => {
    if (err) console.error('Error serving /become-supplier:', err.message);
  });
});

// Root path serves index.html
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(htmlDir, 'index.html'), (err) => {
    if (err) console.error('Error serving /:', err.message);
  });
});

// Serve static files (CSS, images, etc.) - this comes AFTER route handlers
app.use(express.static(path.join(htmlDir)));

// 404 handler - for debugging
app.use((req, res) => {
  console.log('404: Route not found:', req.path);
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


