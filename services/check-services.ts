import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Service ports
const services = [
  { name: 'API Gateway', url: 'http://localhost:8080/health' },
  { name: 'User Service', url: 'http://localhost:3001/api/v1' },
  { name: 'Course Service', url: 'http://localhost:3002/api/v1' },
  { name: 'Payment Service', url: 'http://localhost:3003/api/v1' },
  { name: 'Email Service', url: 'http://localhost:3004/api/v1' },
  { name: 'File Service', url: 'http://localhost:3005/api/v1' },
  { name: 'Search Service', url: 'http://localhost:3006/api/v1' },
  { name: 'Analytics Service', url: 'http://localhost:3007/api/v1' },
  { name: 'Admin Service', url: 'http://localhost:3008/api/v1' }
];

// Check MongoDB connection
async function checkMongoDB() {
  console.log('\n--- Checking MongoDB Connection ---');
  
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
  console.log(`Attempting to connect to MongoDB at: ${mongoUri}`);
  
  try {
    mongoose.set('strictQuery', false);
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Short timeout for quick feedback
      connectTimeoutMS: 5000,
    });
    
    console.log('✅ MongoDB connection: SUCCESS');
    
    // Check if we can perform a simple operation
    if (!mongoose.connection.db) {
      throw new Error('Database connection not fully established');
    }
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.ping();
    console.log('✅ MongoDB ping: SUCCESS', result);
    
    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ MongoDB connection: FAILED');
    console.error('Error details:', error.message);
    
    if (error.name === 'MongooseServerSelectionError') {
      console.error('Possible causes:');
      console.error('  - MongoDB server is not running');
      console.error('  - MongoDB URI is incorrect');
      console.error('  - Network connectivity issues');
      console.error('  - Firewall blocking connection');
    }
  }
}

// Check a single service
async function checkService(service: { name: string; url: string }) {
  try {
    console.log(`Checking ${service.name} at ${service.url}...`);
    const response = await axios.get(service.url, { timeout: 5000 });
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ ${service.name}: UP (Status: ${response.status})`);
      return true;
    } else {
      console.log(`❌ ${service.name}: ERROR (Status: ${response.status})`);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ ${service.name}: DOWN`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Main function to check all services
async function checkAllServices() {
  console.log('\n=== Microservices Health Check ===\n');
  
  const results = [];
  
  // Check MongoDB first
  await checkMongoDB();
  
  // Check other services
  console.log('\n--- Checking Service Endpoints ---');
  for (const service of services) {
    const isUp = await checkService(service);
    results.push({ service: service.name, status: isUp ? 'UP' : 'DOWN' });
  }
  
  // Summary
  console.log('\n=== Health Check Summary ===');
  const upCount = results.filter(r => r.status === 'UP').length;
  console.log(`Services UP: ${upCount}/${services.length}`);
  
  results.forEach(result => {
    const statusSymbol = result.status === 'UP' ? '✅' : '❌';
    console.log(`${statusSymbol} ${result.service}: ${result.status}`);
  });
}

// Run the check
checkAllServices().catch(error => {
  console.error('Error during health check:', error);
}); 