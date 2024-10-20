const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt'); // Use bcrypt to hash passwords
const axios = require('axios'); // Use axios to keep the server alive
const nodemailer = require('nodemailer');
const http = require('http');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000; // Render assigns a port

// Middleware to parse JSON
app.use(express.json());

// Use the MongoDB URI from Render environment variables
const MONGO_URI = process.env.MONGO_URI;

const generateVerificationCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();  // Generates a 6-character hex code
};

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'upcheck.team@gmail.com', // Your email address
    pass: 'cfni tpqz rycd llev', // Your email password or app-specific password if using Gmail
  },
});

// Function to send custom email
const sendCustomEmail = (toEmail, subject, htmlContent) => {
  // Email options
  const mailOptions = {
    from: 'innovatexcel.team@gmail.com', // Sender address
    to: toEmail, // Recipient address
    subject: subject, // Subject line
    html: htmlContent, // HTML content
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};

async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    console.log("MongoDB Connected");
    return client;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Exit the process on connection failure
  }
}

// Connect to MongoDB
let dbClient;
connectDB().then(client => {
  dbClient = client;
});

// Example endpoint to test the API
app.get('/', (req, res) => {
  res.send('Hello World from Render v1!');
});

// Example endpoint to test the logs
app.get('/logs', (req, res) => {
  res.send('Login endpoint added\nRegistration endpoint added\nToken generation included in request and store in database')
});

// Example endpoint to fetch data from MongoDB
app.get('/api/data', async (req, res) => {
  try {
    const db = dbClient.db('app'); // Replace with your database name
    const collection = db.collection('users'); // Replace with your collection name
    const data = await collection.find({}).toArray(); // Fetch all documents
    res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ message: "Error fetching data" });
  }
});

// Registration endpoint v1
app.post('/api/v1/auth/register', async (req, res) => {
  const { displayName, username, email, password } = req.body;

  try {
    const db = dbClient.db('app');
    const collection = db.collection('users');

    // Check if the user already exists
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // Insert the new user
    const newUser = {
      displayName,
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newUser);
    res.status(201).json({ message: "User created", userId: result.insertedId });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Error during registration" });
  }
});

//v2
app.post('/api/v2/auth/register', async (req, res) => {
  const { displayName, username, email, password, token } = req.body;

  try {
    const db = dbClient.db('app');
    const collection = db.collection('users');

    // Check if the user already exists by email
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // Create new user object with hashed password, the token, and email_verified set to false
    const newUser = {
      displayName,
      username,
      email,
      password: hashedPassword,
      token,  // Store the token (can be an API key or JWT token later)
      email_verified: false, // Add the email_verified field
      createdAt: new Date(),
    };

    // Insert the new user into the database
    const result = await collection.insertOne(newUser);

    // Send success response with the inserted user's ID
    res.status(201).json({ message: "User created", userId: result.insertedId, token });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Error during registration" });
  }
});

// Update user profile endpoint
app.put('/api/v2/auth/updateProfile', async (req, res) => {
  const { email, cultivation, experience, address, phoneNumber, bio } = req.body;

  try {
    const db = dbClient.db('app');
    const collection = db.collection('users');

    // Find the user by their email
    const result = await collection.updateOne(
      { email },  // Identify user based on email
      {
        $set: {
          cultivation,           // Update or add the 'cultivation' field
          experience,            // Update or add the 'experience' field
          address,               // Update or add the 'address' field
          phoneNumber,           // Update or add the 'phoneNumber' field
          bio,                   // Update or add the 'bio' field
        },
      },
      { upsert: true }  // Create the document if it does not exist
    );

    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      res.status(200).json({ message: 'Profile updated successfully.' });
    } else {
      res.status(404).json({ message: 'User not found.' });
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile.' });
  }
});

//Welcome users

app.post('/api/v1/mailing/welcome', async (req, res) => {
  try {
    const subject = 'Upcheck Onboarding';
    const htmlContent = `
    <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
            color: #333;
        }
        header {
            background-color: #007BFF;
            padding: 20px;
            text-align: center;
            color: white;
        }
        section {
            padding: 20px;
        }
        h1 {
            margin: 0;
        }
        p {
            line-height: 1.6;
        }
        .feature {
            background-color: #e9ecef;
            margin: 10px 0;
            padding: 10px;
            border-radius: 5px;
        }
        footer {
            background-color: #007BFF;
            padding: 20px;
            text-align: center;
            color: white;
        }
        a {
            color: #007BFF;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <header>
        <h1>Welcome to Upcheck!</h1>
    </header>
    <section>
        <p>Hello ${req.body.userName},</p>
        <p>Thank you for registering with Upcheck! We are excited to have you on board. Our app is designed to help you monitor and optimize your shrimp cultivation process. Here are some of the key features you can look forward to:</p>

        <div class="feature">
            <strong>✨ Yield Prediction:</strong> Get accurate predictions to maximize your harvest.
        </div>
        <div class="feature">
            <strong>💧 Pond Quality Analysis:</strong> Monitor water quality parameters for optimal shrimp health.
        </div>
        <div class="feature">
            <strong>🍽️ Feed Management:</strong> Track and manage your feed usage and inventory effectively.
        </div>
        <div class="feature">
            <strong>🐟 Shrimp Behavior Analysis:</strong> Gain insights into shrimp behavior for better management.
        </div>
        <div class="feature">
            <strong>🦠 Disease Prediction:</strong> Receive alerts for potential diseases before they become critical.
        </div>
        <div class="feature">
            <strong>🌐 Market Connection:</strong> Connect with markets for selling your produce.
        </div>
        <div class="feature">
            <strong>👥 Peer Connection:</strong> Network with fellow shrimp cultivators for shared insights and support.
        </div>
        <div class="feature">
            <strong>📰 Real-time News & Updates:</strong> Stay informed with the latest trends and information in shrimp cultivation.
        </div>

        <p>We are here to support you every step of the way. If you have any questions or need assistance, feel free to reach out to us.</p>
    </section>
    <footer>
        <p style="margin: 0;">Best regards,<br>The Upcheck Team</p>
        <p><a href="https://upcheck.framer.website">Visit our website</a></p>
    </footer>
</body>
    `;

    sendCustomEmail(req.body.email, subject, htmlContent);

    res.status(200).json({ message: 'Welcome mail sent successfully'});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred during welcome mail sending' });
  }
});

//Generate email verification code and send to the mail

app.post('/api/v1/auth/verify-email', async (req, res) => {
  try {
    const db = dbClient.db('app');
    const collection = db.collection('v_codes');
    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store the verification code with the email and expiration time
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 10); // Expires in 10 minutes
    await collection.insertOne({
      email: req.body.email,
      code: verificationCode,
      expiresAt: expirationTime,
    });

    // Send the verification code via email
    const subject = 'Email Verification Code';
    const htmlContent = `
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification Code</title>
      </head>
      <body style="font-family: Arial, sans-serif;">
        <header style="background-color: #f0f0f0; padding: 20px;">
          <h1 style="margin: 0; color: #333;">Email Verification Code</h1>
        </header>
        <section style="padding: 20px;">
          <p>Hello ${req.body.userName},</p>
          <p>Your verification code is: <strong>${verificationCode}</strong></p>
          <p>Please use this code to verify your email address within the next 10 minutes.</p>
          <p>If you didnt request the code, please ignore this email</p>
        </section>
        <footer style="background-color: #f0f0f0; padding: 20px; text-align: center;">
          <p style="margin: 0;">Best regards,<br> Upcheck team</p>
        </footer>
      </body>
    `;

    sendCustomEmail(req.body.email, subject, htmlContent);

    res.status(200).json({ message: 'Verification code sent successfully'});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred during verification code sending' });
  }
});

// Verify the email verification code
app.post('/api/v1/auth/verify-code', async (req, res) => {
  try {
    const { email, verificationCode, userId } = req.body; // Expecting email, code, and userId in the request body
    const db = dbClient.db('app');
    const collection = db.collection('v_codes');

    // Fetch the record from the database
    const record = await collection.findOne({ email, code: verificationCode });

    if (!record) {
      return res.status(400).json({ error: 'Invalid verification code or email' });
    }

    // Check if the code is expired
    const currentTime = new Date();
    if (currentTime > record.expiresAt) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Optionally: Check if userId matches (if you are storing userId with the verification codes)
    // const userRecord = await db.collection('users').findOne({ userId });
    // if (!userRecord || userRecord.email !== email) {
    //   return res.status(400).json({ error: 'User ID does not match the email' });
    // }

    // If everything is valid, you can proceed to mark the email as verified
    // await db.collection('users').updateOne({ userId }, { $set: { emailVerified: true } });
    
    // Optionally: Remove the used verification code from the database
    if(record){
    await collection.deleteOne({ email, code: verificationCode });
    }

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred during verification' });
  }
});

// Login endpoint
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const db = dbClient.db('app'); // Replace with your database name
    const collection = db.collection('users'); // Replace with your collection name

    // Find user by email
    const user = await collection.findOne({ email });

    // If user not found, respond with an error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password); // Assume user.password is hashed

    if (isPasswordValid) {
      // Login successful
      return res.status(200).json({ message: "Login successful", userId: user._id });
    } else {
      // Incorrect password
      return res.status(401).json({ message: "Invalid password" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Error during login" });
  }
});

//login v2

app.post('/api/v2/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const db = dbClient.db('app'); // Replace with your database name
    const collection = db.collection('users'); // Replace with your collection name

    // Find user by email
    const user = await collection.findOne({ email });

    // If user not found, respond with an error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password); // Assume user.password is hashed

    if (isPasswordValid) {
      // Login successful, return user details and token
      return res.status(200).json({
        message: "Login successful",
        userId: user._id,
        displayName: user.displayName, // Assuming user has this field
        username: user.username, // Assuming user has this field
        email: user.email, // Return user's email
        token: user.token // Return the existing token from the database
      });
    } else {
      // Incorrect password
      return res.status(401).json({ message: "Invalid password" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Error during login" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Keep server alive to prevent sleeping on idle
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    axios.get(`http://localhost:${PORT}`) // Ping the server at intervals
      .then(() => console.log('Keep-alive ping'))
      .catch(err => console.error('Error in keep-alive ping:', err));
  }, 10 * 60 * 1000); // Ping every 10 minutes (adjust time as needed)
}

module.exports = app;