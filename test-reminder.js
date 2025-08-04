const { 
  testReminderForFinding, 
  calculateDaysDifference, 
  hasReminderBeenSent,
  processAuditFindingReminders,
  REMINDER_INTERVALS 
} = require('./auditFindingReminderCronJob');

async function testReminderSystem() {
  console.log('=== Testing Audit Finding Reminder System ===\n');
  
  // Test 1: Date calculation logic
  console.log('1. Testing Date Calculation Logic:');
  const testCases = [
    { start: '2025-07-12T09:00:00.000Z', end: '2025-07-15T09:00:00.000Z', expected: 3, description: '3 days remaining (reminder eligible)' },
    { start: '2025-07-12T09:00:00.000Z', end: '2025-07-14T09:00:00.000Z', expected: 2, description: '2 days remaining (reminder eligible)' },
    { start: '2025-07-12T09:00:00.000Z', end: '2025-07-13T09:00:00.000Z', expected: 1, description: '1 day remaining (reminder eligible)' },
    { start: '2025-07-12T09:00:00.000Z', end: '2025-07-12T23:59:59.000Z', expected: 0, description: 'Due today (final reminder)' },
    { start: '2025-07-12T09:00:00.000Z', end: '2025-07-11T09:00:00.000Z', expected: -1, description: 'Overdue (no reminder)' },
    { start: '2025-07-12T09:00:00.000Z', end: '2025-07-16T09:00:00.000Z', expected: 4, description: '4 days remaining (no reminder)' }
  ];
  
  for (const testCase of testCases) {
    const result = calculateDaysDifference(testCase.start, testCase.end);
    const status = result === testCase.expected ? '✅' : '❌';
    const reminderEligible = REMINDER_INTERVALS.includes(result) ? '(REMINDER ELIGIBLE)' : '(no reminder)';
    console.log(`   ${status} ${testCase.description}: Expected ${testCase.expected}, Got ${result} ${reminderEligible}`);
  }

  // Test 2: Reminder intervals
  console.log('\n2. Testing Reminder Intervals:');
  console.log(`   Configured intervals: [${REMINDER_INTERVALS.join(', ')}] days before due date`);
  for (const interval of REMINDER_INTERVALS) {
    const description = interval === 0 ? 'Due date (final reminder)' : `${interval} day${interval !== 1 ? 's' : ''} before due`;
    console.log(`   - ${description}`);
  }

  // Test 3: Reminder logic for specific finding
  console.log('\n3. Testing Reminder Logic for Specific Finding:');
  // Test with a known finding ID (replace with actual finding ID from your database)
  const testFindingId = 'df53bc1e-8da3-4e33-9876-277993cd4301'; // Replace with actual finding ID
  
  try {
    await testReminderForFinding(testFindingId);
  } catch (error) {
    console.error('   Error testing reminder for finding:', error.message);
  }

  // Test 4: Reminder duplicate prevention
  console.log('\n4. Testing Reminder Duplicate Prevention:');
  try {
    // Test with a known finding and user ID (replace with actual IDs)
    const testUserId = 'fe2c7ff0-8eff-4fb1-8cf5-88237f02a28e'; // Replace with actual user ID
    
    for (const interval of REMINDER_INTERVALS) {
      const alreadySent = await hasReminderBeenSent(testFindingId, interval, testUserId, 'assigned');
      const status = alreadySent ? '✅ Already sent' : '❌ Not sent yet';
      const intervalDesc = interval === 0 ? 'Due date' : `${interval} day${interval !== 1 ? 's' : ''} before`;
      console.log(`   ${status} - ${intervalDesc} reminder for user ${testUserId}`);
    }
  } catch (error) {
    console.error('   Error testing reminder duplicate prevention:', error.message);
  }

  console.log('\n=== Audit Finding Reminder System Test Complete ===');
  console.log('\nTo test the full reminder processing system, you can run:');
  console.log('processAuditFindingReminders() - This will process all pending findings');
  console.log('\nTo test the Action Plan Reminder System, run:');
  console.log('node test-action-plan-reminder.js');
  console.log('\nNote: Make sure you have:');
  console.log('1. Audit findings with status "Pending"');
  console.log('2. Due dates set on those findings');
  console.log('3. Users assigned to those findings');
  console.log('4. Email service properly configured');
  
  process.exit(0);
}

// Test function to run the full reminder processing (commented out by default)
async function testFullReminderProcessing() {
  console.log('\n=== Testing Full Reminder Processing ===');
  try {
    await processAuditFindingReminders();
    console.log('Full reminder processing test completed successfully.');
  } catch (error) {
    console.error('Error in full reminder processing test:', error);
  }
}

// Run the test
testReminderSystem().catch(console.error);

// Uncomment the line below to test full reminder processing
// testFullReminderProcessing().catch(console.error);
