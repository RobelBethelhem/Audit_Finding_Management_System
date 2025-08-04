const axios = require('axios');

// Test analytics endpoints
async function testAnalyticsEndpoints() {
  const baseURL = 'http://localhost:3000/api';
  
  // You'll need to replace this with a valid JWT token from your application
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MTYwMTdjLTY1ZjAtNGI1ZC05MmU1LTQwMTNkN2M0OTVmMCIsInVzZXJuYW1lIjoicm9iZWwuYXNmYXciLCJlbWFpbCI6InJvYmVsLmFzZmF3QHplbWVuYmFuay5jb20iLCJyb2xlIjoiQWRtaW4iLCJ0eXBlIjoiQnVzaW5lc3MiLCJpYXQiOjE3NTIzODU0MDgsImV4cCI6MTc1MjQ3MTgwOH0.LxBdnHIM10kdTwhAtFWaMZJPNXC8WXkZS6ddgC8mrY4';
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const endpoints = [
    '/analytics/dashboard',
    '/analytics/audit-findings/status',
    '/analytics/audit-findings/risk-level',
    '/analytics/audit-findings/department',
    '/analytics/audit-findings/trends',
    '/analytics/action-plans/metrics',
    '/analytics/escalations/trends',
    '/analytics/users/workload',
    '/analytics/compliance/gaps',
    '/analytics/timeline/analytics'
  ];

  console.log('Testing Analytics Endpoints...\n');

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await axios.get(`${baseURL}${endpoint}`, { headers });
      console.log(`✅ SUCCESS: ${endpoint}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Data length: ${Array.isArray(response.data.data) ? response.data.data.length : 'Object'}`);
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
testAnalyticsEndpoints().catch(console.error);
