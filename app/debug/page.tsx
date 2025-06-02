'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Component with actual content
function DebugContent() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adminSettingLoading, setAdminSettingLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch user data on page load
  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch('/api/debug');
        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setMessage('Error fetching user data');
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, []);

  // Set user as admin
  async function setUserAsAdmin() {
    if (!userData?.user?.id) {
      setMessage('No user ID available');
      return;
    }

    setAdminSettingLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/debug/set-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userData.user.id }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Successfully set as admin. Please refresh the page and try accessing the admin dashboard again.');
        
        // Refresh user data
        const updatedResponse = await fetch('/api/debug');
        const updatedData = await updatedResponse.json();
        setUserData(updatedData);
      } else {
        setMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error setting user as admin:', error);
      setMessage('Error setting user as admin');
    } finally {
      setAdminSettingLoading(false);
    }
  }

  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-3xl font-bold mb-6">User Debug Information</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Status</CardTitle>
              <CardDescription>Current user authentication information</CardDescription>
            </CardHeader>
            <CardContent>
              {userData?.status === 'authenticated' ? (
                <div className="space-y-2">
                  <p className="text-green-600 font-semibold">Authenticated ✓</p>
                  <p><strong>User ID:</strong> {userData.user.id}</p>
                  <p><strong>Email:</strong> {userData.user.email}</p>
                </div>
              ) : (
                <p className="text-red-600">Not authenticated: {userData?.authError}</p>
              )}
            </CardContent>
          </Card>

          {userData?.profile && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>User profile from the database</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Role:</strong> {userData.profile.role}</p>
                  <p><strong>Admin Status:</strong> {userData.profile.is_admin ? 'Admin ✓' : 'Not Admin'}</p>
                  <p><strong>Name:</strong> {userData.profile.first_name} {userData.profile.last_name}</p>
                  <p><strong>Created:</strong> {new Date(userData.profile.created_at).toLocaleString()}</p>
                </div>
              </CardContent>
              <CardFooter>
                {userData.profile.role !== 'admin' || !userData.profile.is_admin ? (
                  <Button 
                    onClick={setUserAsAdmin} 
                    disabled={adminSettingLoading}
                  >
                    {adminSettingLoading ? 'Setting as Admin...' : 'Set as Admin'}
                  </Button>
                ) : (
                  <p className="text-green-600">User already has admin privileges</p>
                )}
              </CardFooter>
            </Card>
          )}

          {userData?.roles && (
            <Card>
              <CardHeader>
                <CardTitle>Available Roles</CardTitle>
                <CardDescription>Roles defined in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {userData.roles.map((role: any) => (
                    <li key={role.id} className="border-b pb-3">
                      <div className="font-semibold">{role.name}</div>
                      <div className="text-sm text-gray-600">{role.description}</div>
                      <div className="text-xs text-gray-500">Priority: {role.priority}</div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {message && (
            <div className={`p-4 rounded-md ${message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {message}
            </div>
          )}

          <div className="pt-6 flex space-x-4">
            <Button asChild variant="outline">
              <a href="/dashboard">Go to Dashboard</a>
            </Button>
            <Button asChild>
              <a href="/admin">Try Admin Dashboard</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main component with Suspense boundary
export default function DebugPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading debug information...</div>}>
      <DebugContent />
    </Suspense>
  );
}