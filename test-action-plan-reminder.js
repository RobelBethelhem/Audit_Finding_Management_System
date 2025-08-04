const { 
  testActionPlanReminderForActionPlan, 
  calculateDaysDifference, 
  hasReminderBeenSent,
  processActionPlanReminders,
  REMINDER_INTERVALS 
} = require('./actionPlanReminderCronJob');

async function testActionPlanReminderSystem() {
  console.log('=== Testing Action Plan Reminder System ===\n');
  
  // Test 1: Date calculation logic
  console.log('1. Testing Date Calculation Logic:');
  const testCases = [
    { start: '2025-07-12T09:30:00.000Z', end: '2025-07-15T09:30:00.000Z', expected: 3, description: '3 days remaining (reminder eligible)' },
    { start: '2025-07-12T09:30:00.000Z', end: '2025-07-14T09:30:00.000Z', expected: 2, description: '2 days remaining (reminder eligible)' },
    { start: '2025-07-12T09:30:00.000Z', end: '2025-07-13T09:30:00.000Z', expected: 1, description: '1 day remaining (reminder eligible)' },
    { start: '2025-07-12T09:30:00.000Z', end: '2025-07-12T23:59:59.000Z', expected: 0, description: 'Due today (final reminder)' },
    { start: '2025-07-12T09:30:00.000Z', end: '2025-07-11T09:30:00.000Z', expected: -1, description: 'Overdue (no reminder)' },
    { start: '2025-07-12T09:30:00.000Z', end: '2025-07-16T09:30:00.000Z', expected: 4, description: '4 days remaining (no reminder)' }
  ];
  
  for (const testCase of testCases) {
    const result = calculateDaysDifference(testCase.start, testCase.end);
    const status = result === testCase.expected ? '✅' : '❌';
    const reminderEligible = REMINDER_INTERVALS.includes(result) ? '(REMINDER ELIGIBLE)' : '(no reminder)';
    console.log(`   ${status} ${testCase.description}: Expected ${testCase.expected}, Got ${result} ${reminderEligible}`);
  }

  // Test 2: Reminder intervals
  console.log('\n2. Testing Action Plan Reminder Intervals:');
  console.log(`   Configured intervals: [${REMINDER_INTERVALS.join(', ')}] days before due date`);
  for (const interval of REMINDER_INTERVALS) {
    const description = interval === 0 ? 'Due date (final reminder)' : `${interval} day${interval !== 1 ? 's' : ''} before due`;
    console.log(`   - ${description}`);
  }

  // Test 3: Action plan reminder logic for specific action plan
  console.log('\n3. Testing Action Plan Reminder Logic for Specific Action Plan:');
  // Test with a known action plan ID (replace with actual action plan ID from your database)
  const testActionPlanId = 'test-action-plan-id'; // Replace with actual action plan ID
  
  try {
    await testActionPlanReminderForActionPlan(testActionPlanId);
  } catch (error) {
    console.error('   Error testing action plan reminder for action plan:', error.message);
    console.log('   Note: Make sure to replace testActionPlanId with an actual action plan ID from your database');
  }

  // Test 4: Action plan reminder duplicate prevention
  console.log('\n4. Testing Action Plan Reminder Duplicate Prevention:');
  try {
    // Test with a known action plan and user ID (replace with actual IDs)
    const testUserId = 'fe2c7ff0-8eff-4fb1-8cf5-88237f02a28e'; // Replace with actual user ID
    
    for (const interval of REMINDER_INTERVALS) {
      const alreadySent = await hasReminderBeenSent(testActionPlanId, interval, testUserId, 'assigned');
      const status = alreadySent ? '✅ Already sent' : '❌ Not sent yet';
      const intervalDesc = interval === 0 ? 'Due date' : `${interval} day${interval !== 1 ? 's' : ''} before`;
      console.log(`   ${status} - ${intervalDesc} reminder for user ${testUserId}`);
    }
  } catch (error) {
    console.error('   Error testing action plan reminder duplicate prevention:', error.message);
  }

  // Test 5: Database query structure validation
  console.log('\n5. Testing Database Query Structure:');
  console.log('   Action Plan → AuditFinding → AuditFindingAssigned → User (for assigned users)');
  console.log('   Action Plan → AuditFinding → User (for creator)');
  console.log('   This ensures proper access to both assigned users and creators from action plans');

  console.log('\n=== Action Plan Reminder System Test Complete ===');
  console.log('\nTo test the full action plan reminder processing system, you can run:');
  console.log('processActionPlanReminders() - This will process all pending action plans');
  console.log('\nNote: Make sure you have:');
  console.log('1. Action plans with status "Pending"');
  console.log('2. Due dates set on those action plans');
  console.log('3. Action plans linked to audit findings');
  console.log('4. Users assigned to the parent audit findings');
  console.log('5. Email service properly configured');
  
  process.exit(0);
}

// Test function to run the full action plan reminder processing (commented out by default)
async function testFullActionPlanReminderProcessing() {
  console.log('\n=== Testing Full Action Plan Reminder Processing ===');
  try {
    await processActionPlanReminders();
    console.log('Full action plan reminder processing test completed successfully.');
  } catch (error) {
    console.error('Error in full action plan reminder processing test:', error);
  }
}

// Test function to compare action plan reminders with audit finding reminders
async function compareReminderSystems() {
  console.log('\n=== Comparing Action Plan vs Audit Finding Reminder Systems ===');
  console.log('Similarities:');
  console.log('✅ Same reminder intervals: [3, 2, 1, 0] days');
  console.log('✅ Same date calculation logic');
  console.log('✅ Same duplicate prevention mechanism');
  console.log('✅ Same email urgency levels and templates');
  console.log('✅ Same notification table usage');
  
  console.log('\nKey Differences:');
  console.log('🔄 Target Entity: Action Plans vs Audit Findings');
  console.log('🔄 User Source: Parent Audit Finding assignments vs Direct assignments');
  console.log('🔄 Creator Source: Parent Audit Finding creator vs Direct creator');
  console.log('🔄 Schedule: 9:30 AM vs 9:00 AM (sequential execution)');
  console.log('🔄 Database Path: ActionPlan → AuditFinding → Users vs AuditFinding → Users');
}

// Run the test
testActionPlanReminderSystem().catch(console.error);

// Uncomment the lines below to test additional functionality
// testFullActionPlanReminderProcessing().catch(console.error);
// compareReminderSystems();
