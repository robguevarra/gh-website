'use client';

import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Info, 
  User 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/types/admin-types';

interface AccountComparisonViewProps {
  accounts: UserProfile[];
  onClose: () => void;
}

/**
 * AccountComparisonView component provides a side-by-side comparison of user accounts
 * with highlighting for matching and differing fields.
 */
export function AccountComparisonView({ accounts, onClose }: AccountComparisonViewProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'profile': true,
    'contact': true,
    'membership': true,
    'security': false,
    'activity': false,
  });

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Check if values match across all accounts
  const doValuesMatch = (key: string) => {
    if (!accounts.length) return false;
    
    const firstValue = accounts[0][key as keyof UserProfile];
    return accounts.every(account => 
      account[key as keyof UserProfile] === firstValue
    );
  };

  // Get appropriate style based on value matching
  const getValueStyle = (key: string) => {
    if (doValuesMatch(key)) {
      return 'bg-green-50 dark:bg-green-950/20';
    }
    return 'bg-amber-50 dark:bg-amber-950/20';
  };
  
  // Mock data for demonstration - would be replaced with actual user data
  const mockUserData = accounts.map((account, index) => ({
    id: account.id || `user-${index}`,
    email: account.email || `user${index}@example.com`,
    name: account.name || `User ${index}`,
    status: account.status || (index % 2 === 0 ? 'active' : 'inactive'),
    system: index % 3 === 0 ? 'Supabase' : index % 3 === 1 ? 'Shopify' : 'Legacy',
    createdAt: account.createdAt || new Date(Date.now() - index * 86400000 * 30).toISOString(),
    lastActive: account.lastActive || new Date(Date.now() - index * 86400000).toISOString(),
    role: account.role || (index === 0 ? 'admin' : 'customer'),
    phone: account.phone || (index === 0 ? '+1234567890' : '+0987654321'),
    address: account.address || `${index * 123} Main St, City ${index}`,
    membershipPlan: account.membershipPlan || (index % 2 === 0 ? 'premium' : 'basic'),
    membershipStatus: account.membershipStatus || (index % 2 === 0 ? 'active' : 'expired'),
    totalOrders: account.totalOrders || index * 5,
    totalSpent: account.totalSpent || index * 99.99,
    courseEnrollments: account.courseEnrollments || index * 2,
    lastLoginIp: account.lastLoginIp || `192.168.1.${index}`,
    twoFactorEnabled: account.twoFactorEnabled || index % 2 === 0,
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">Account Comparison</CardTitle>
            <CardDescription>
              Comparing {accounts.length} accounts - Highlighted fields indicate differences
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contact">Contact & Address</TabsTrigger>
              <TabsTrigger value="membership">Membership & Orders</TabsTrigger>
              <TabsTrigger value="activity">Activity & Security</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="basic" className="m-0">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Profile Information</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => toggleSection('profile')}
                >
                  {expandedSections['profile'] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {expandedSections['profile'] && (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Field</TableHead>
                        {mockUserData.map((user) => (
                          <TableHead key={user.id}>
                            {user.name}
                            <Badge variant="outline" className="ml-2">
                              {user.system}
                            </Badge>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">User ID</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell key={user.id} className="font-mono text-xs">
                            {user.id}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Email</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell 
                            key={user.id} 
                            className={cn(
                              mockUserData.every(u => u.email === user.email)
                                ? 'bg-green-50 dark:bg-green-950/20'
                                : 'bg-amber-50 dark:bg-amber-950/20'
                            )}
                          >
                            {user.email}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Name</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell 
                            key={user.id}
                            className={cn(
                              mockUserData.every(u => u.name === user.name)
                                ? 'bg-green-50 dark:bg-green-950/20'
                                : 'bg-amber-50 dark:bg-amber-950/20'
                            )}
                          >
                            {user.name}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Status</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell key={user.id}>
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                              {user.status}
                            </Badge>
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Role</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell 
                            key={user.id}
                            className={cn(
                              mockUserData.every(u => u.role === user.role)
                                ? 'bg-green-50 dark:bg-green-950/20'
                                : 'bg-amber-50 dark:bg-amber-950/20'
                            )}
                          >
                            {user.role}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Created</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell key={user.id}>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Last Active</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell key={user.id}>
                            {new Date(user.lastActive).toLocaleDateString()}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="contact" className="m-0">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Contact Information</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => toggleSection('contact')}
                >
                  {expandedSections['contact'] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {expandedSections['contact'] && (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Field</TableHead>
                        {mockUserData.map((user) => (
                          <TableHead key={user.id}>
                            {user.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Email</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell 
                            key={user.id}
                            className={cn(
                              mockUserData.every(u => u.email === user.email)
                                ? 'bg-green-50 dark:bg-green-950/20'
                                : 'bg-amber-50 dark:bg-amber-950/20'
                            )}
                          >
                            {user.email}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Phone</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell 
                            key={user.id}
                            className={cn(
                              mockUserData.every(u => u.phone === user.phone)
                                ? 'bg-green-50 dark:bg-green-950/20'
                                : 'bg-amber-50 dark:bg-amber-950/20'
                            )}
                          >
                            {user.phone || <span className="text-muted-foreground italic">Not set</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Address</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell 
                            key={user.id}
                            className={cn(
                              mockUserData.every(u => u.address === user.address)
                                ? 'bg-green-50 dark:bg-green-950/20'
                                : 'bg-amber-50 dark:bg-amber-950/20'
                            )}
                          >
                            {user.address || <span className="text-muted-foreground italic">Not set</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="membership" className="m-0">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Membership & Purchase Information</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => toggleSection('membership')}
                >
                  {expandedSections['membership'] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {expandedSections['membership'] && (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Field</TableHead>
                        {mockUserData.map((user) => (
                          <TableHead key={user.id}>
                            {user.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Membership Plan</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell 
                            key={user.id}
                            className={cn(
                              mockUserData.every(u => u.membershipPlan === user.membershipPlan)
                                ? 'bg-green-50 dark:bg-green-950/20'
                                : 'bg-amber-50 dark:bg-amber-950/20'
                            )}
                          >
                            {user.membershipPlan || <span className="text-muted-foreground italic">None</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Membership Status</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell key={user.id}>
                            <Badge variant={user.membershipStatus === 'active' ? 'default' : 'secondary'}>
                              {user.membershipStatus || 'none'}
                            </Badge>
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total Orders</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell key={user.id}>
                            {user.totalOrders}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total Spent</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell key={user.id}>
                            ${user.totalSpent.toFixed(2)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Course Enrollments</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell key={user.id}>
                            {user.courseEnrollments}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="activity" className="m-0">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Activity & Security Information</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => toggleSection('activity')}
                >
                  {expandedSections['activity'] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {expandedSections['activity'] && (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Field</TableHead>
                        {mockUserData.map((user) => (
                          <TableHead key={user.id}>
                            {user.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Last Login</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell key={user.id}>
                            {new Date(user.lastActive).toLocaleDateString()}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Last Login IP</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell key={user.id}>
                            {user.lastLoginIp}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">2FA Enabled</TableCell>
                        {mockUserData.map((user) => (
                          <TableCell key={user.id}>
                            {user.twoFactorEnabled ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t p-6">
        <div className="flex items-center text-sm text-muted-foreground">
          <Info className="h-4 w-4 mr-1" />
          <span>
            Matching fields are highlighted in green, differences in amber
          </span>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
