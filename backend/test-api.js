require('dotenv').config();
const http = require('http');

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function test() {
  try {
    // Login as lecturer
    console.log('1. Logging in as lecturer...');
    const loginRes = await httpRequest({
      hostname: 'localhost', port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ email: 'lecturer@its.ac.id', password: 'Lecturer123!' }));
    
    console.log('Login status:', loginRes.status);
    console.log('Login success:', loginRes.data.success);
    
    if (!loginRes.data.success) {
      console.log('Login failed:', loginRes.data.message);
      return;
    }
    
    const token = loginRes.data.token || loginRes.data.data?.token;
    console.log('Token received:', !!token);
    console.log('User:', loginRes.data.data?.name, loginRes.data.data?.role);
    
    // Get borrow requests
    console.log('\n2. Getting borrow requests as lecturer...');
    const reqRes = await httpRequest({
      hostname: 'localhost', port: 3000,
      path: '/api/borrow-requests',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Response status:', reqRes.status);
    console.log('Success:', reqRes.data.success);
    console.log('Count:', reqRes.data.count);
    console.log('Data length:', reqRes.data.data?.length);
    
    if (reqRes.data.data?.length > 0) {
      reqRes.data.data.forEach((r, i) => {
        console.log(`  ${i+1}. ${r.equipment_name} - ${r.status}`);
      });
    } else {
      console.log('  NO DATA RETURNED!');
      console.log('  Full response:', JSON.stringify(reqRes.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
