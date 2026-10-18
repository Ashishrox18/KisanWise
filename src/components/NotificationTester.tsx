import React, { useState } from 'react';
import { Bell, Send, TestTube } from 'lucide-react';

// This component is for testing notifications during development
// Remove from production build

const NotificationTester = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const testNotifications = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Test by creating a listing (which should trigger notifications)
      const response = await fetch('/api/farmer/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          cropType: 'Test Wheat',
          quantity: 100,
          quantityUnit: 'kg',
          minimumPrice: 2000,
          pickupLocation: 'Test Location',
          description: 'Test listing for notification system',
          harvestDate: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        setMessage('✅ Test listing created! Check notification bell for updates.');
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.error || 'Failed to create test listing'}`);
      }
    } catch (error: any) {
      setMessage(`❌ Network error: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Only show in development
  const isProd = import.meta.env.MODE === 'production';
  if (isProd) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible ? (
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition"
          title="Test Notifications"
        >
          <TestTube className="h-5 w-5" />
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-xl border p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              Notification Tester
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            This will create a test listing to trigger notifications for all buyers.
          </p>

          <button
            onClick={testNotifications}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Test Notifications
              </>
            )}
          </button>

          {message && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
              {message}
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500">
            <strong>Dev Tool:</strong> This component only appears in development mode.
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationTester;
