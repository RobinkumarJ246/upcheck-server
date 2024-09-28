// config/db.js
const mongoose = require('mongoose');
const URI = "mongodb+srv://robin246j:RdYG9uPZukPXKuaI@app.zfm1a.mongodb.net/?retryWrites=true&w=majority&appName=App"

const connectDB = async () => {
  try {
    await mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;