'use client';

/**
 * Payout Role Management Component
 * 
 * This component allows super admins to manage payout roles for other administrators.
 * It provides a user-friendly interface for assigning and modifying payout permissions.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Edit, Shield, UserCheck, AlertTriangle, Search, Users } from 'lucide-react';
import { 
  assignPayoutRole, 
  getUserPermissions, 
  checkPayoutPermission,
  type PayoutRole,
  type PayoutPermission 
} from '@/lib/auth/payout-permissions';

// Role definitions with descriptions
const PAYOUT_ROLES: Record<PayoutRole, { 
  label: string; 
  description: string; 
  color: string;
  level: number;
}> = {
  payout_viewer: {
    label: 'Payout Viewer',
    description: 'Can view payout data and reports',
    color: 'bg-blue-100 text-blue-800',
    level: 1
  },
  payout_operator: {
    label: 'Payout Operator', 
    description: 'Can verify payouts and manage conversions',
    color: 'bg-green-100 text-green-800',
    level: 2
  },
  payout_processor: {
    label: 'Payout Processor',
    description: 'Can process verified payouts and resolve errors',
    color: 'bg-yellow-100 text-yellow-800',
    level: 3
  },
  payout_manager: {
    label: 'Payout Manager',
    description: 'Can handle high-value payouts and all operations',
    color: 'bg-orange-100 text-orange-800',
    level: 4
  },
  payout_admin: {
    label: 'Payout Admin',
    description: 'Full payout system access',
    color: 'bg-red-100 text-red-800',
    level: 5
  },
  super_admin: {
    label: 'Super Admin',
    description: 'Complete system access',
    color: 'bg-purple-100 text-purple-800',
    level: 6
  }
};

// Permission descriptions
const PERMISSION_DESCRIPTIONS: Record<PayoutPermission, string> = {
  'payout.view': 'View payout data and basic information',
  'payout.preview': 'Generate payout previews before processing',
  'payout.verify': 'Verify payouts for processing',
  'payout.process': 'Process verified payouts (send to payment system)',
  'payout.cancel': 'Cancel pending payouts',
  'payout.export': 'Export payout data and reports',
  'payout.monitor': 'Access monitoring dashboard and real-time data',
  'payout.reports': 'Generate and access detailed reports',
  'payout.error_resolve': 'Resolve payout processing errors',
  'payout.high_value': 'Handle high-value payouts (above threshold)',
  'conversion.view': 'View affiliate conversion data',
  'conversion.verify': 'Verify affiliate conversions',
  'conversion.update': 'Update conversion status and details',
  'admin.full_access': 'Complete administrative access to all features'
};

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
  current_role?: PayoutRole;
  permissions: PayoutPermission[];
  last_login?: string;
  is_active: boolean;
}

interface RoleAssignment {
  user_id: string;
  role_name: PayoutRole;
  assigned_by: string;
  assigned_at: string;
  is_active: boolean;
}

export default function PayoutRoleManagement() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<PayoutRole>('payout_viewer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canManageRoles, setCanManageRoles] = useState(false);

  // Load admin users and check permissions
  useEffect(() => {
    loadAdminUsers();
    checkManagementPermissions();
  }, []);

  const checkManagementPermissions = async () => {
    try {
      const response = await fetch('/api/admin/auth/check-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: 'admin.full_access' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCanManageRoles(data.granted);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setCanManageRoles(false);
    }
  };

  const loadAdminUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/affiliate/payouts/role-management/users');
      if (!response.ok) throw new Error('Failed to load admin users');
      
      const data = await response.json();
      setAdminUsers(data.users || []);
      setRoleAssignments(data.assignments || []);
    } catch (error) {
      setError('Failed to load admin users');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignRole = async (userId: string, role: PayoutRole) => {
    if (!canManageRoles) {
      setError('You do not have permission to manage roles');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/affiliate/payouts/role-management/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign role');
      }
      
      setSuccess(`Role "${PAYOUT_ROLES[role].label}" assigned successfully`);
      await loadAdminUsers(); // Reload data
      setSelectedUser(null);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to assign role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeRole = async (userId: string) => {
    if (!canManageRoles) {
      setError('You do not have permission to manage roles');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/affiliate/payouts/role-management/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke role');
      }
      
      setSuccess('Role revoked successfully');
      await loadAdminUsers();
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to revoke role');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = adminUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canManageRoles) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You do not have permission to manage payout roles. Contact a super administrator for access.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payout Role Management</h2>
          <p className="text-gray-600">Manage administrator roles and permissions for the payout system</p>
        </div>
        <Button onClick={loadAdminUsers} disabled={isLoading}>
          <Users className="h-4 w-4 mr-2" />
          Refresh Users
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <UserCheck className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="roles">Role Definitions</TabsTrigger>
          <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Administrator Users</CardTitle>
              <CardDescription>
                Current administrators and their payout system roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name || 'No name'}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.current_role ? (
                          <Badge className={PAYOUT_ROLES[user.current_role].color}>
                            {PAYOUT_ROLES[user.current_role].label}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No Role</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.last_login ? 
                          new Date(user.last_login).toLocaleDateString() : 
                          'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Manage Role for {user.full_name}</DialogTitle>
                                <DialogDescription>
                                  Assign or modify the payout system role for this administrator
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="role">Select Role</Label>
                                  <Select value={selectedRole} onValueChange={(value: PayoutRole) => setSelectedRole(value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(PAYOUT_ROLES).map(([role, config]) => (
                                        <SelectItem key={role} value={role}>
                                          <div className="flex items-center space-x-2">
                                            <span>{config.label}</span>
                                            <Badge variant="outline" className="text-xs">
                                              Level {config.level}
                                            </Badge>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {PAYOUT_ROLES[selectedRole].description}
                                  </p>
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => handleAssignRole(user.user_id, selectedRole)}
                                    disabled={isLoading}
                                  >
                                    Assign Role
                                  </Button>
                                  {user.current_role && (
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleRevokeRole(user.user_id)}
                                      disabled={isLoading}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Revoke
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Definitions Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(PAYOUT_ROLES).map(([role, config]) => (
              <Card key={role}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{config.label}</CardTitle>
                    <Badge className={config.color}>Level {config.level}</Badge>
                  </div>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Key Permissions:</p>
                    <div className="flex flex-wrap gap-1">
                      {/* Show sample permissions for each role */}
                      {role === 'payout_viewer' && ['payout.view', 'payout.monitor'].map(perm => (
                        <Badge key={perm} variant="outline" className="text-xs">{perm}</Badge>
                      ))}
                      {role === 'payout_operator' && ['payout.verify', 'conversion.update'].map(perm => (
                        <Badge key={perm} variant="outline" className="text-xs">{perm}</Badge>
                      ))}
                      {role === 'payout_processor' && ['payout.process', 'payout.error_resolve'].map(perm => (
                        <Badge key={perm} variant="outline" className="text-xs">{perm}</Badge>
                      ))}
                      {role === 'payout_manager' && ['payout.high_value', 'payout.cancel'].map(perm => (
                        <Badge key={perm} variant="outline" className="text-xs">{perm}</Badge>
                      ))}
                      {(role === 'payout_admin' || role === 'super_admin') && (
                        <Badge variant="outline" className="text-xs">All Permissions</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Permission Matrix Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>
                Detailed view of which permissions are granted to each role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead>Description</TableHead>
                      {Object.entries(PAYOUT_ROLES).map(([role, config]) => (
                        <TableHead key={role} className="text-center min-w-24">
                          {config.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(PERMISSION_DESCRIPTIONS).map(([permission, description]) => (
                      <TableRow key={permission}>
                        <TableCell className="font-medium">{permission}</TableCell>
                        <TableCell className="text-sm text-gray-600">{description}</TableCell>
                        {Object.keys(PAYOUT_ROLES).map(role => {
                          // Simple permission check logic
                          const hasPermission = role === 'super_admin' || 
                            (role === 'payout_admin' && permission !== 'admin.full_access') ||
                            (role === 'payout_manager' && !permission.includes('admin.')) ||
                            (role === 'payout_processor' && ['payout.view', 'payout.preview', 'payout.verify', 'payout.process', 'payout.cancel', 'payout.export', 'payout.monitor', 'payout.reports', 'payout.error_resolve', 'conversion.view', 'conversion.verify', 'conversion.update'].includes(permission as PayoutPermission)) ||
                            (role === 'payout_operator' && ['payout.view', 'payout.preview', 'payout.verify', 'payout.export', 'payout.monitor', 'payout.reports', 'conversion.view', 'conversion.verify', 'conversion.update'].includes(permission as PayoutPermission)) ||
                            (role === 'payout_viewer' && ['payout.view', 'payout.monitor', 'payout.reports', 'conversion.view'].includes(permission as PayoutPermission));
                          
                          return (
                            <TableCell key={role} className="text-center">
                              {hasPermission ? (
                                <Shield className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 