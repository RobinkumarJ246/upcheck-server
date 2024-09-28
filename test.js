const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://robin246j:RdYG9uPZukPXKuaI@app.zfm1a.mongodb.net/?retryWrites=true&w=majority&appName=App";

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB");
    // Add any further database operations here if needed
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message);
  } finally {
    await client.close();
  }
}

run();