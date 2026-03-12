require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Equipment = require('./models/Equipment');
const BorrowRequest = require('./models/BorrowRequest');

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const allRequests = await BorrowRequest.find()
      .populate('student', 'name email')
      .populate('equipment', 'name')
      .sort('-createdAt');
    
    console.log(`Total requests in database: ${allRequests.length}\n`);
    
    allRequests.forEach((req, i) => {
      console.log(`${i + 1}. ${req.equipment?.name || 'Unknown Equipment'}`);
      console.log(`   Student: ${req.student?.name || req.student_email}`);
      console.log(`   Status: ${req.status}`);
      console.log(`   Created: ${req.createdAt}`);
      console.log(`   Lecturer: ${req.lecturer || 'Not assigned'}`);
      console.log('');
    });
    
    const pending = allRequests.filter(r => r.status === 'pending_lecturer');
    console.log(`\nPending lecturer approvals: ${pending.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDB();
