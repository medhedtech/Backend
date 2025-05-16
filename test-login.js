const axios = require('axios');
const mongoose = require('mongoose');

// Connect to MongoDB first to get valid credentials
async function connectToMongoDB() {
  try {
    const mongoUri = 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
    console.log('Connecting to MongoDB to find valid credentials...');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000
    });
    
    console.log('Connected to MongoDB, looking for users...');
    
    // Find one user to use for testing
    const users = await mongoose.connection.db.collection('users')
      .find({})
      .project({ email: 1, _id: 0 })
      .limit(5)
      .toArray();
    
    console.log('Found users:', users.map(u => u.email));
    
    await mongoose.disconnect();
    return users[0]?.email || 'abhi@gmail.com';
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    return 'abhi@gmail.com'; // Fallback
  }
}

async function testLogin(email) {
  const url = 'http://localhost:3001/api/v1/auth/login';
  const data = {
    email: email,
    password: 'password123' // Test with common password
  };

  console.log(`Testing login for ${data.email} at ${url}...`);
  
  try {
    const response = await axios.post(url, data, { 
      timeout: 60000, // 60 second timeout
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('Login failed with error:');
    
    if (error.response) {
      // Server responded with an error status
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received. Request timeout or server down.');
      console.error(error.message);
    } else {
      // Error in setting up the request
      console.error('Error setting up request:', error.message);
    }
    
    return false;
  }
}

console.log('Starting login test...');
connectToMongoDB()
  .then(email => testLogin(email))
  .then(success => {
    console.log(`\nTest ${success ? 'PASSED' : 'FAILED'}`);
  }); 