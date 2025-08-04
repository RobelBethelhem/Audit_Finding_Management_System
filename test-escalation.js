const { testEscalationForFinding, getEscalationDaysForLevel, getSupervisorAtLevel, calculateDaysDifference } = require('./escalationCronJob');

async function testEscalationSystem() {
  console.log('=== Testing Enhanced Multi-Level Escalation System ===\n');
  
  // Test escalation day calculations
  console.log('1. Testing Date Calculation Logic:');
  // Test various date scenarios
  const testCases = [
    { start: '2025-07-11T03:25:23.000Z', end: '2025-07-12T01:07:53.000Z', expected: 1, description: 'July 11 to July 12 (same as our test case)' },
    { start: '2025-07-10T23:59:59.000Z', end: '2025-07-11T00:00:01.000Z', expected: 1, description: 'Just after midnight boundary' },
    { start: '2025-07-01T12:00:00.000Z', end: '2025-07-16T12:00:00.000Z', expected: 15, description: 'Exactly 15 days (Level 1 threshold)' },
    { start: '2025-07-01T12:00:00.000Z', end: '2025-07-31T12:00:00.000Z', expected: 30, description: 'Exactly 30 days (Level 2 threshold)' }
  ];

  for (const testCase of testCases) {
    const result = calculateDaysDifference(testCase.start, testCase.end);
    const status = result === testCase.expected ? '✅' : '❌';
    console.log(`   ${status} ${testCase.description}: Expected ${testCase.expected}, Got ${result}`);
  }

  console.log('\n2. Testing Escalation Day Calculations:');
  for (let level = 1; level <= 10; level++) {
    const days = getEscalationDaysForLevel(level);
    console.log(`   Level ${level}: ${days} days`);
  }
  
  console.log('\n3. Testing Supervisor Chain Logic:');
  // Test with a known user ID (you can replace this with an actual user ID from your database)
  const testUserId = 'fe2c7ff0-8eff-4fb1-8cf5-88237f02a28e'; // desalegn.kidie
  
  try {
    for (let level = 1; level <= 5; level++) {
      const supervisor = await getSupervisorAtLevel(testUserId, level);
      console.log(`   Level ${level} supervisor for user ${testUserId}: ${supervisor ? supervisor.username : 'None'}`);
    }
  } catch (error) {
    console.error('   Error testing supervisor chain:', error.message);
  }
  
  console.log('\n4. Testing Escalation Logic for Specific Finding:');
  // Test with a known finding ID (you can replace this with an actual finding ID from your database)
  const testFindingId = 'df53bc1e-8da3-4e33-9876-277993cd4301'; // Replace with actual finding ID
  
  try {
    await testEscalationForFinding(testFindingId);
  } catch (error) {
    console.error('   Error testing escalation for finding:', error.message);
  }
  
  console.log('\n=== Escalation System Test Complete ===');
  console.log('\nTo test the Audit Finding Reminder System, run:');
  console.log('node test-reminder.js');
  process.exit(0);
}

// Run the test
testEscalationSystem().catch(console.error);
