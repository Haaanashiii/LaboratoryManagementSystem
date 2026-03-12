require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Equipment = require('./models/Equipment');
const BorrowRequest = require('./models/BorrowRequest');

async function checkRequest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const request = await BorrowRequest.findOne({ status: 'pending_lecturer' })
      .populate('student', 'name email')
      .populate('equipment', 'name')
      .populate('lecturer', 'name email');
    
    if (request) {
      console.log('Pending Lecturer Request Found:');
      console.log('- Student:', request.student?.name, `(${request.student?.email})`);
      console.log('- Equipment:', request.equipment?.name);
      console.log('- Quantity:', request.quantity);
      console.log('- Status:', request.status);
      console.log('- Lecturer Email:', request.lecturer_email);
      console.log('- Assigned Lecturer:', request.lecturer ? `${request.lecturer.name} (${request.lecturer.email})` : 'NOT ASSIGNED');
      console.log('- Created:', request.createdAt);
    } else {
      console.log('No pending_lecturer requests found');
    }
    
    // Check all lecturers
    const lecturers = await User.find({ role: 'lecturer' }).select('name email');
    console.log('\n\nAvailable Lecturers:');
    lecturers.forEach(l => console.log(`- ${l.name} (${l.email})`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRequest();
