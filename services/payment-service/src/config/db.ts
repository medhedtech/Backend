import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 60000, // 60 seconds
    connectTimeoutMS: 60000, // 60 seconds
    socketTimeoutMS: 90000, // 90 seconds
    bufferCommands: false, // Disable buffering
  });
  console.log('Connected to MongoDB');
}; 