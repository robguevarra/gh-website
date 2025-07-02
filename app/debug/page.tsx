"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { fetchPurchaseHistory } from '@/lib/services/purchaseHistory';

export default function DebugPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Test user ID (robneil@gmail.com)
  const TEST_USER_ID = '8f8f67ff-7a2c-4515-82d1-214bb8807932';

  const testGoogleDriveFix = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log('🔍 Testing fetchPurchaseHistory function...');
      const purchases = await fetchPurchaseHistory(TEST_USER_ID);
      
      if (!purchases || purchases.length === 0) {
        setTestResult({
          success: false,
          message: 'No purchases found for this user',
          data: null
        });
        return;
      }

      console.log('✅ Purchase history returned:', purchases);
      
      let itemsWithGoogleDrive = 0;
      let itemsWithoutGoogleDrive = 0;
      const detailsArray: any[] = [];
      
      purchases.forEach(order => {
        order.items.forEach(item => {
          const details = {
            orderNumber: order.order_number,
            source: order.source,
            title: item.title,
            google_drive_file_id: item.google_drive_file_id,
            hasGoogleDrive: !!item.google_drive_file_id
          };
          
          detailsArray.push(details);
          
          if (item.google_drive_file_id) {
            itemsWithGoogleDrive++;
          } else {
            itemsWithoutGoogleDrive++;
          }
        });
      });
      
      setTestResult({
        success: true,
        message: `Found ${purchases.length} orders`,
        data: {
          totalOrders: purchases.length,
          itemsWithGoogleDrive,
          itemsWithoutGoogleDrive,
          details: detailsArray,
          fullData: purchases
        }
      });
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResult({
        success: false,
        message: 'Test failed with error',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Google Drive File ID Debug Test</h1>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Testing user: robneil@gmail.com (ID: {TEST_USER_ID})
          </p>
          <Button 
            onClick={testGoogleDriveFix} 
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Testing...' : 'Test Google Drive File IDs'}
          </Button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`font-medium ${
              testResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {testResult.success ? '✅ Test Results' : '❌ Test Failed'}
            </h3>
            <p className="text-sm mt-1">{testResult.message}</p>
            
            {testResult.error && (
              <p className="text-red-700 text-sm mt-2">Error: {testResult.error}</p>
            )}
            
            {testResult.data && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-3 gap-4 p-3 bg-white rounded border">
                  <div>
                    <p className="text-xs text-gray-500">Total Orders</p>
                    <p className="font-medium">{testResult.data.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Items with Google Drive</p>
                    <p className="font-medium text-green-600">{testResult.data.itemsWithGoogleDrive}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Items without Google Drive</p>
                    <p className="font-medium text-red-600">{testResult.data.itemsWithoutGoogleDrive}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Item Details:</h4>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-1">Order</th>
                          <th className="text-left p-1">Source</th>
                          <th className="text-left p-1">Title</th>
                          <th className="text-left p-1">Google Drive</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testResult.data.details.map((item: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="p-1">{item.orderNumber}</td>
                            <td className="p-1">
                              <span className={`px-1 py-0.5 rounded text-xs ${
                                item.source === 'shopify' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                              }`}>
                                {item.source}
                              </span>
                            </td>
                            <td className="p-1">{item.title}</td>
                            <td className="p-1">
                              {item.hasGoogleDrive ? (
                                <span className="text-green-600">✅ {item.google_drive_file_id}</span>
                              ) : (
                                <span className="text-red-600">❌ None</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">Show Full Data</summary>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-40">
                    {JSON.stringify(testResult.data.fullData, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}