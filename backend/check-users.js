require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const users = await User.find().select('email name role status');
    console.log(`Total users: ${users.length}\n`);
    
    users.forEach(u => {
      console.log(`- ${u.email}`);
      console.log(`  Name: ${u.name}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Status: ${u.status}\n`);
    });
    
    // Try to find lecturer
    const lecturer = await User.findOne({ email: 'lecturer@its.ac.id' }).select('+password');
    if (lecturer) {
      console.log('Lecturer account found!');
      console.log('Has password:', !!lecturer.password);
      console.log('Password length:', lecturer.password ? lecturer.password.length : 0);
    } else {
      console.log('Lecturer account NOT found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
