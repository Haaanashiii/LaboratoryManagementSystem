const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Equipment = require('./models/Equipment');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const users = [
  {
    name: 'System Administrator',
    email: 'admin@its.ac.id',
    password: 'Admin123!',
    role: 'admin',
    status: 'active'
  },
  {
    name: 'Dr. Ahmad Fauzi',
    email: 'head@its.ac.id',
    password: 'Head123!',
    role: 'head_of_lab',
    status: 'active'
  },
  {
    name: 'Dr. Siti Aminah',
    email: 'lecturer@its.ac.id',
    password: 'Lecturer123!',
    role: 'lecturer',
    status: 'active'
  },
  {
    name: 'Budi Santoso',
    email: 'assistant@its.ac.id',
    password: 'Assistant123!',
    role: 'lab_assistant',
    status: 'active'
  },
  {
    name: 'Andi Wijaya',
    email: 'student@its.ac.id',
    password: 'Student123!',
    role: 'student',
    studentId: '5025201001',
    status: 'active'
  }
];

const equipment = [
  {
    name: 'Zeiss Axioscope 5 Optical Microscope',
    category: 'Microscope',
    quantity: 5,
    available: 5,
    condition: 'Excellent',
    location: 'Lab Room 301',
    manufacturer: 'Carl Zeiss',
    model: 'Axioscope 5',
    specifications: {
      magnification: '40x-1000x',
      type: 'Optical Microscope',
      illumination: 'LED'
    },
    description: 'High-quality optical microscope for biological research'
  },
  {
    name: 'Thermo Scientific Centrifuge',
    category: 'Centrifuge',
    quantity: 3,
    available: 3,
    condition: 'Good',
    location: 'Lab Room 302',
    manufacturer: 'Thermo Scientific',
    model: 'Sorvall ST 16R',
    specifications: {
      max_speed: '15000 rpm',
      capacity: '24 x 1.5ml tubes'
    },
    description: 'Refrigerated benchtop centrifuge'
  },
  {
    name: 'Agilent UV-Vis Spectrophotometer',
    category: 'Spectrometer',
    quantity: 2,
    available: 2,
    condition: 'Excellent',
    location: 'Lab Room 303',
    manufacturer: 'Agilent',
    model: 'Cary 60',
    specifications: {
      wavelength_range: '190-1100 nm',
      bandwidth: '1.5 nm'
    },
    description: 'UV-Visible spectrophotometer for molecular analysis'
  },
  {
    name: 'VWR Incubator',
    category: 'Incubator',
    quantity: 4,
    available: 4,
    condition: 'Good',
    location: 'Lab Room 301',
    manufacturer: 'VWR',
    model: 'Symphony 5.3A',
    specifications: {
      temperature_range: 'Ambient +5°C to 70°C',
      capacity: '150 liters'
    },
    description: 'Microbiological incubator with precise temperature control'
  },
  {
    name: 'Eppendorf PCR Thermal Cycler',
    category: 'PCR Machine',
    quantity: 2,
    available: 2,
    condition: 'Excellent',
    location: 'Lab Room 304',
    manufacturer: 'Eppendorf',
    model: 'Mastercycler nexus',
    specifications: {
      block_capacity: '96 wells',
      temperature_range: '4-99°C'
    },
    description: 'PCR thermal cycler for DNA amplification'
  },
  {
    name: 'Mettler Toledo Analytical Balance',
    category: 'Balance',
    quantity: 6,
    available: 6,
    condition: 'Excellent',
    location: 'Lab Room 302',
    manufacturer: 'Mettler Toledo',
    model: 'XPE205',
    specifications: {
      capacity: '220g',
      readability: '0.01mg'
    },
    description: 'High-precision analytical balance'
  },
  {
    name: 'Sartorius pH Meter',
    category: 'pH Meter',
    quantity: 4,
    available: 4,
    condition: 'Good',
    location: 'Lab Room 301',
    manufacturer: 'Sartorius',
    model: 'PB-11',
    specifications: {
      pH_range: '-2.00 to 16.00',
      accuracy: '±0.01 pH'
    },
    description: 'Benchtop pH meter with automatic temperature compensation'
  },
  {
    name: 'New Brunswick Shaker Incubator',
    category: 'Shaker',
    quantity: 2,
    available: 2,
    condition: 'Fair',
    location: 'Lab Room 302',
    manufacturer: 'New Brunswick',
    model: 'Innova 44',
    specifications: {
      temperature_range: '4-60°C',
      shaking_speed: '25-500 rpm',
      capacity: '4 platforms'
    },
    description: 'Refrigerated shaker incubator for cell culture'
  },
  {
    name: 'Bio-Rad Power Supply',
    category: 'Power Supply',
    quantity: 8,
    available: 8,
    condition: 'Good',
    location: 'Lab Room 303',
    manufacturer: 'Bio-Rad',
    model: 'PowerPac Basic',
    specifications: {
      voltage_range: '10-300V',
      current: '400mA'
    },
    description: 'Basic power supply for gel electrophoresis'
  },
  {
    name: 'Olympus Stereo Microscope',
    category: 'Microscope',
    quantity: 3,
    available: 3,
    condition: 'Good',
    location: 'Lab Room 301',
    manufacturer: 'Olympus',
    model: 'SZ61',
    specifications: {
      magnification: '6.7x-45x',
      working_distance: '110mm'
    },
    description: 'Stereo microscope for dissection and inspection'
  }
];

const seedDatabase = async () => {
  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Equipment.deleteMany({});
    console.log('✓ Existing data cleared');

    // Create users
    console.log('\nCreating users...');
    for (const userData of users) {
      const user = await User.create(userData);
      console.log(`✓ Created user: ${user.name} (${user.role})`);
    }

    // Create equipment
    console.log('\nCreating equipment...');
    for (const equipData of equipment) {
      const equip = await Equipment.create(equipData);
      console.log(`✓ Created equipment: ${equip.name}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest Accounts:');
    console.log('-----------------------------------');
    users.forEach(user => {
      console.log(`${user.role.toUpperCase()}: ${user.email}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
