// Test script to verify notification triggers are working
import { NotificationsController } from './controllers/notifications.controller';

async function testNotificationTriggers() {
  console.log('🔍 Testing Notification Triggers...\n');

  try {
    // Test 1: Create a test notification
    console.log('1. Testing notification creation...');
    const testNotification = await NotificationsController.createNotification({
      userId: 'test-user-123',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working',
      type: 'farmer_listing',
      relatedId: 'test-listing-123',
      link: '/farmer/listings/test-listing-123'
    });
    console.log('✅ Notification created successfully:', testNotification.id);

    // Test 2: Send notification to role
    console.log('\n2. Testing role-based notifications...');
    await NotificationsController.sendNotificationToRole('buyer', {
      title: 'Test Role Notification',
      message: 'This notification should go to all buyers',
      type: 'farmer_listing',
      relatedId: 'test-listing-456',
      link: '/buyer/listings/test-listing-456'
    });
    console.log('✅ Role-based notification sent successfully');

    console.log('\n🎉 All notification triggers are working!');

  } catch (error) {
    console.error('❌ Error testing notification triggers:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testNotificationTriggers();
}

export { testNotificationTriggers };