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
import { 
  RadioGroup, 
  RadioGroupItem 
} from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  MergeIcon, 
  ShieldAlert 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/types/admin-types';

interface AccountMergePreviewProps {
  accounts: UserProfile[];
  onClose: () => void;
  onMerge: (mergedData: Record<string, any>) => void;
}

/**
 * AccountMergePreview component provides a preview of the merged account
 * and allows resolving conflicts before merging.
 */
export function AccountMergePreview({ accounts, onClose, onMerge }: AccountMergePreviewProps) {
  // Ensure we have exactly 2 accounts
  if (accounts.length !== 2) {
    throw new Error('Account merge preview requires exactly 2 accounts');
  }
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mergedData, setMergedData] = useState<Record<string, any>>({});
  const [selectedSource, setSelectedSource] = useState<Record<string, 0 | 1>>({
    email: 0,
    name: 0,
    phone: 0,
    address: 0,
    membershipPlan: 0,
    role: 0
  });
  
  // Mock data for demonstration - would be replaced with actual user data
  const mockUserData = accounts.map((account, index) => ({
    id: account.id || `user-${index}`,
    email: account.email || `user${index}@example.com`,
    name: account.name || `User ${index}`,
    status: account.status || (index % 2 === 0 ? 'active' : 'inactive'),
    system: index % 2 === 0 ? 'Supabase' : 'Shopify',
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
  
  // Check if values match between accounts
  const doValuesMatch = (key: string) => {
    return mockUserData[0][key as keyof typeof mockUserData[0]] === mockUserData[1][key as keyof typeof mockUserData[1]];
  };
  
  // Handle source selection for a field
  const handleSourceSelection = (field: string, sourceIndex: 0 | 1) => {
    setSelectedSource(prev => ({
      ...prev,
      [field]: sourceIndex
    }));
    
    setMergedData(prev => ({
      ...prev,
      [field]: mockUserData[sourceIndex][field as keyof (typeof mockUserData)[0]]
    }));
  };
  
  // Get preview of merged account
  const getMergedPreview = () => {
    const preview: Record<string, any> = {
      id: mockUserData[0].id, // Primary account ID
      system: 'Merged',
      status: mockUserData[0].status === 'active' || mockUserData[1].status === 'active' ? 'active' : 'inactive',
      createdAt: new Date(Math.min(
        new Date(mockUserData[0].createdAt).getTime(),
        new Date(mockUserData[1].createdAt).getTime()
      )).toISOString(),
      lastActive: new Date(Math.max(
        new Date(mockUserData[0].lastActive).getTime(),
        new Date(mockUserData[1].lastActive).getTime()
      )).toISOString(),
      totalOrders: mockUserData[0].totalOrders + mockUserData[1].totalOrders,
      totalSpent: mockUserData[0].totalSpent + mockUserData[1].totalSpent,
      courseEnrollments: mockUserData[0].courseEnrollments + mockUserData[1].courseEnrollments,
      twoFactorEnabled: mockUserData[0].twoFactorEnabled || mockUserData[1].twoFactorEnabled,
    };
    
    // Add selected fields
    Object.keys(selectedSource).forEach(field => {
      preview[field] = mockUserData[selectedSource[field]][field as keyof typeof mockUserData[0]];
    });
    
    return preview;
  };
  
  // Handle merge submission
  const handleMerge = async () => {
    setIsSubmitting(true);
    
    try {
      const mergedAccount = getMergedPreview();
      
      // In a real implementation, this would call an API
      await new Promise(resolve => setTimeout(resolve, 1500));
      onMerge(mergedAccount);
      onClose();
    } catch (error) {
      console.error('Error merging accounts:', error);
      // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MergeIcon className="mr-2 h-5 w-5" />
          Merge Accounts
        </CardTitle>
        <CardDescription>
          Preview and customize the result of merging these accounts
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start space-x-3">
          <ShieldAlert className="h-6 w-6 text-amber-500 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-medium">Important: This action cannot be undone</p>
            <p className="mt-1">
              Merging accounts will combine all data from both accounts into a single account.
              The secondary account will be marked as merged and will no longer be accessible.
              All enrollments, purchases, and activity will be transferred to the primary account.
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Resolve Conflicts</h3>
          <p className="text-sm text-muted-foreground">
            Select which account should be the source for each field where there are differences.
            Fields that match between accounts are automatically resolved.
          </p>
          
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Field</TableHead>
                  <TableHead>Account 1 (Primary)</TableHead>
                  <TableHead>Account 2 (Secondary)</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Email</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <RadioGroup
                        value={String(selectedSource.email)}
                        onValueChange={(value) => handleSourceSelection('email', Number(value) as 0 | 1)}
                        className="flex"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="0" id="email-0" />
                        </div>
                      </RadioGroup>
                      <span>{mockUserData[0].email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <RadioGroup
                        value={String(selectedSource.email)}
                        onValueChange={(value) => handleSourceSelection('email', Number(value) as 0 | 1)}
                        className="flex"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1" id="email-1" />
                        </div>
                      </RadioGroup>
                      <span>{mockUserData[1].email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {doValuesMatch('email') ? (
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300">
                        Match
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
                        Conflict
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Name</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <RadioGroup
                        value={String(selectedSource.name)}
                        onValueChange={(value) => handleSourceSelection('name', Number(value) as 0 | 1)}
                        className="flex"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="0" id="name-0" />
                        </div>
                      </RadioGroup>
                      <span>{mockUserData[0].name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <RadioGroup
                        value={String(selectedSource.name)}
                        onValueChange={(value) => handleSourceSelection('name', Number(value) as 0 | 1)}
                        className="flex"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1" id="name-1" />
                        </div>
                      </RadioGroup>
                      <span>{mockUserData[1].name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {doValuesMatch('name') ? (
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300">
                        Match
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
                        Conflict
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Phone</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <RadioGroup
                        value={String(selectedSource.phone)}
                        onValueChange={(value) => handleSourceSelection('phone', Number(value) as 0 | 1)}
                        className="flex"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="0" id="phone-0" />
                        </div>
                      </RadioGroup>
                      <span>{mockUserData[0].phone || <span className="text-muted-foreground italic">Not set</span>}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <RadioGroup
                        value={String(selectedSource.phone)}
                        onValueChange={(value) => handleSourceSelection('phone', Number(value) as 0 | 1)}
                        className="flex"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1" id="phone-1" />
                        </div>
                      </RadioGroup>
                      <span>{mockUserData[1].phone || <span className="text-muted-foreground italic">Not set</span>}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {doValuesMatch('phone') ? (
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300">
                        Match
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
                        Conflict
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Role</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <RadioGroup
                        value={String(selectedSource.role)}
                        onValueChange={(value) => handleSourceSelection('role', Number(value) as 0 | 1)}
                        className="flex"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="0" id="role-0" />
                        </div>
                      </RadioGroup>
                      <span>{mockUserData[0].role}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <RadioGroup
                        value={String(selectedSource.role)}
                        onValueChange={(value) => handleSourceSelection('role', Number(value) as 0 | 1)}
                        className="flex"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1" id="role-1" />
                        </div>
                      </RadioGroup>
                      <span>{mockUserData[1].role}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {doValuesMatch('role') ? (
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300">
                        Match
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
                        Conflict
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Membership Plan</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <RadioGroup
                        value={String(selectedSource.membershipPlan)}
                        onValueChange={(value) => handleSourceSelection('membershipPlan', Number(value) as 0 | 1)}
                        className="flex"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="0" id="membershipPlan-0" />
                        </div>
                      </RadioGroup>
                      <span>{mockUserData[0].membershipPlan}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <RadioGroup
                        value={String(selectedSource.membershipPlan)}
                        onValueChange={(value) => handleSourceSelection('membershipPlan', Number(value) as 0 | 1)}
                        className="flex"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1" id="membershipPlan-1" />
                        </div>
                      </RadioGroup>
                      <span>{mockUserData[1].membershipPlan}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {doValuesMatch('membershipPlan') ? (
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300">
                        Match
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
                        Conflict
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Merged Account Preview</h3>
          <p className="text-sm text-muted-foreground">
            This is how the merged account will appear after combining data from both accounts.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{mockUserData[selectedSource.name].name}</span>
                  
                  <span className="text-muted-foreground">Email:</span>
                  <span>{mockUserData[selectedSource.email].email}</span>
                  
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{mockUserData[selectedSource.phone].phone || 'Not set'}</span>
                  
                  <span className="text-muted-foreground">Role:</span>
                  <span>{mockUserData[selectedSource.role].role}</span>
                  
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline">
                    {mockUserData[0].status === 'active' || mockUserData[1].status === 'active' ? 'active' : 'inactive'}
                  </Badge>
                  
                  <span className="text-muted-foreground">Created:</span>
                  <span>
                    {new Date(Math.min(
                      new Date(mockUserData[0].createdAt).getTime(),
                      new Date(mockUserData[1].createdAt).getTime()
                    )).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Membership & Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <span className="text-muted-foreground">Membership Plan:</span>
                  <span>{mockUserData[selectedSource.membershipPlan].membershipPlan}</span>
                  
                  <span className="text-muted-foreground">Total Orders:</span>
                  <span>{mockUserData[0].totalOrders + mockUserData[1].totalOrders}</span>
                  
                  <span className="text-muted-foreground">Total Spent:</span>
                  <span>${(mockUserData[0].totalSpent + mockUserData[1].totalSpent).toFixed(2)}</span>
                  
                  <span className="text-muted-foreground">Course Enrollments:</span>
                  <span>{mockUserData[0].courseEnrollments + mockUserData[1].courseEnrollments}</span>
                  
                  <span className="text-muted-foreground">Last Active:</span>
                  <span>
                    {new Date(Math.max(
                      new Date(mockUserData[0].lastActive).getTime(),
                      new Date(mockUserData[1].lastActive).getTime()
                    )).toLocaleDateString()}
                  </span>
                  
                  <span className="text-muted-foreground">2FA Enabled:</span>
                  <span>
                    {mockUserData[0].twoFactorEnabled || mockUserData[1].twoFactorEnabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      'No'
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox id="confirmMerge" />
            <Label htmlFor="confirmMerge" className="text-sm">
              I understand that this action cannot be undone and will permanently merge these accounts
            </Label>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="destructive" 
          onClick={handleMerge}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Merging...
            </>
          ) : (
            <>
              <MergeIcon className="h-4 w-4 mr-2" />
              Merge Accounts
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
