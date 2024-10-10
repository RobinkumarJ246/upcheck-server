const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt'); // Use bcrypt to hash passwords
const axios = require('axios'); // Use axios to keep the server alive

const app = express();
const PORT = process.env.PORT || 3000; // Render assigns a port

// Middleware to parse JSON
app.use(express.json());

// Use the MongoDB URI from Render environment variables
const MONGO_URI = process.env.MONGO_URI;

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

// Example endpoint to test POST requests
app.post('/api/data', async (req, res) => {
  try {
    const db = dbClient.db('your_database_name'); // Replace with your database name
    const collection = db.collection('your_collection_name'); // Replace with your collection name
    const result = await collection.insertOne(req.body); // Insert the posted data
    res.status(201).json({ message: "Data added", id: result.insertedId });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ message: "Error inserting data" });
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