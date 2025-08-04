const axios = require('axios');

// Test only the working analytics endpoints
async function testWorkingEndpoints() {
  const baseURL = 'http://localhost:3000/api';
  
  // You'll need to replace this with a valid JWT token from your application
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MTYwMTdjLTY1ZjAtNGI1ZC05MmU1LTQwMTNkN2M0OTVmMCIsInVzZXJuYW1lIjoicm9iZWwuYXNmYXciLCJlbWFpbCI6InJvYmVsLmFzZmF3QHplbWVuYmFuay5jb20iLCJyb2xlIjoiQWRtaW4iLCJ0eXBlIjoiQnVzaW5lc3MiLCJpYXQiOjE3NTIzODU0MDgsImV4cCI6MTc1MjQ3MTgwOH0.LxBdnHIM10kdTwhAtFWaMZJPNXC8WXkZS6ddgC8mrY4';
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Only test the working endpoints
  const workingEndpoints = [
    '/analytics/audit-findings/status',
    '/analytics/audit-findings/department', 
    '/analytics/action-plans/metrics',
    '/analytics/escalations/trends',
    '/analytics/users/workload'
  ];

  console.log('Testing Working Analytics Endpoints...\n');

  for (const endpoint of workingEndpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await axios.get(`${baseURL}${endpoint}`, { headers });
      console.log(`✅ SUCCESS: ${endpoint}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Data length: ${Array.isArray(response.data.data) ? response.data.data.length : 'Object'}`);
      console.log(`   Sample data:`, JSON.stringify(response.data.data.slice(0, 2), null, 2));
      console.log('');
    } catch (error) {
      console.log(`❌ FAILED: ${endpoint}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data.error || error.response.statusText}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
      console.log('');
    }
  }
}

// Run the test
testWorkingEndpoints().catch(console.error);
