// index.js
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000; // Vercel will assign a port

// Middleware to parse JSON
app.use(express.json());

// MongoDB connection string
const MONGO_URI = "mongodb+srv://robin246j:RdYG9uPZukPXKuaI@app.zfm1a.mongodb.net/?retryWrites=true&w=majority&appName=App"

async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI);
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
  res.send('Hello World!');
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

// Start the server only if running locally
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;