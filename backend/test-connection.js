// Test MongoDB connection and check data
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Equipment = require('./models/Equipment');
const User = require('./models/User');
const BorrowRequest = require('./models/BorrowRequest');

async function testConnection() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    console.log('Database:', mongoose.connection.name);

    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Collections in database:');
    collections.forEach(coll => {
      console.log(`  - ${coll.name}`);
    });

    // Count documents
    const equipmentCount = await Equipment.countDocuments();
    const userCount = await User.countDocuments();
    const requestCount = await BorrowRequest.countDocuments();

    console.log('\n📊 Document counts:');
    console.log(`  - Equipment: ${equipmentCount}`);
    console.log(`  - Users: ${userCount}`);
    console.log(`  - Borrow Requests: ${requestCount}`);

    // Show recent equipment
    if (equipmentCount > 0) {
      console.log('\n🔧 Recent Equipment (last 5):');
      const recentEquipment = await Equipment.find()
        .sort('-createdAt')
        .limit(5)
        .select('name category quantity available createdAt');
      
      recentEquipment.forEach((eq, i) => {
        console.log(`  ${i + 1}. ${eq.name} (${eq.category}) - ${eq.available}/${eq.quantity} available - Created: ${eq.createdAt ? eq.createdAt.toISOString() : 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  No equipment found in database');
    }

    // Show recent borrow requests
    if (requestCount > 0) {
      console.log('\n📋 Recent Borrow Requests (last 5):');
      const recentRequests = await BorrowRequest.find()
        .sort('-createdAt')
        .limit(5)
        .select('status equipment quantity createdAt')
        .populate('equipment', 'name');
      
      recentRequests.forEach((req, i) => {
        const equipmentName = req.equipment?.name || 'Unknown';
        console.log(`  ${i + 1}. ${equipmentName} - Status: ${req.status} - Created: ${req.createdAt ? req.createdAt.toISOString() : 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  No borrow requests found in database');
    }

    await mongoose.connection.close();
    console.log('\n✅ Test completed. Connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();
