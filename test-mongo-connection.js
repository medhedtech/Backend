const mongoose = require('mongoose');

async function testMongoConnection() {
  const mongoUri = 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
  
  console.log('Attempting to connect to MongoDB at:', mongoUri);
  
  try {
    // Set debug mode on
    mongoose.set('debug', true);
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      socketTimeoutMS: 90000,
      bufferCommands: false,
    });
    
    console.log('MongoDB connected successfully');
    
    // Test a simple query
    console.log('Testing a simple query - fetching collections...');
    const collections = await mongoose.connection.db.collections();
    console.log(`Connection successful! Found ${collections.length} collections`);
    
    // List collection names
    console.log('Collections:');
    for (const collection of collections) {
      console.log(`- ${collection.collectionName}`);
      
      // Count documents in each collection
      const count = await mongoose.connection.db.collection(collection.collectionName).countDocuments();
      console.log(`  Contains ${count} documents`);
    }
    
    // Close the connection
    await mongoose.disconnect();
    console.log('Connection closed');
    
    return true;
  } catch (error) {
    console.error('MongoDB connection failed with error:');
    console.error(error);
    
    // Detailed error diagnostics
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nServer selection error details:');
      console.error('- Error code:', error.code);
      console.error('- Error message:', error.message);
      console.error('- Topology description:', error.topology ? JSON.stringify(error.topology.description) : 'N/A');
      
      if (error.message.includes('authentication failed')) {
        console.error('\nAuthentication failure detected! Check username and password.');
      }
      
      if (error.message.includes('getaddrinfo ENOTFOUND') || error.message.includes('nodename nor servname provided')) {
        console.error('\nHostname resolution failure! Check the MongoDB hostname.');
      }
    }
    
    return false;
  }
}

// Run the test function
console.log('Starting MongoDB connection test...');
testMongoConnection().then(success => {
  console.log('Test completed with result:', success ? 'SUCCESS' : 'FAILURE');
  process.exit(success ? 0 : 1);
}); 