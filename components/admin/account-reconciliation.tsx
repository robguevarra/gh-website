'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Search, UserSearch, Users, Link2, MergeIcon } from 'lucide-react';
import { TabContentLoading } from './user-detail-loading';
import { AccountComparisonView } from './account-comparison-view';
import { AccountLinkingDialog } from './account-linking-dialog';
import { AccountMergePreview } from './account-merge-preview';
import { UserSearchResult } from '@/types/admin-types';
import { searchUserAccounts, getAccountDetails, linkAccounts } from '@/app/actions/admin-reconciliation';
import { toast } from '@/components/ui/use-toast';

/**
 * AccountReconciliation component provides an interface for searching, comparing,
 * linking, and merging user accounts across different systems.
 */
export function AccountReconciliation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for search form
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
  const [searchType, setSearchType] = useState(searchParams.get('type') || 'email');
  const [searchSystem, setSearchSystem] = useState(searchParams.get('system') || 'all');
  const [includeInactive, setIncludeInactive] = useState(searchParams.get('inactive') === 'true');
  const [fuzzyMatch, setFuzzyMatch] = useState(searchParams.get('fuzzy') === 'true');
  
  // State for search results and selected accounts
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  
  // State for comparison and actions
  const [showComparison, setShowComparison] = useState(false);
  const [showLinkingDialog, setShowLinkingDialog] = useState(false);
  const [showMergePreview, setShowMergePreview] = useState(false);
  const [showSelectedAccounts, setShowSelectedAccounts] = useState(false);
  
  // Handle search submission
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    params.set('query', searchQuery);
    params.set('type', searchType);
    params.set('system', searchSystem);
    params.set('inactive', String(includeInactive));
    params.set('fuzzy', String(fuzzyMatch));
    router.push(`?${params.toString()}`);
    
    try {
      // Call the server action to search for user accounts
      const response = await searchUserAccounts({
        query: searchQuery,
        type: searchType as 'email' | 'name' | 'phone',
        system: searchSystem as 'all' | 'unified' | 'systemeio' | 'xendit',
        includeInactive,
        fuzzyMatch
      });
      
      setSearchResults(response.results);
      
      if (response.results.length === 0) {
        toast({
          title: "No results found",
          description: "Try adjusting your search criteria or using fuzzy matching.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error searching accounts:', error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle account selection
  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };
  
  // Handle comparison action
  const handleCompare = () => {
    if (selectedAccounts.length < 2) {
      toast({
        title: "Selection required",
        description: "Select at least 2 accounts to compare.",
        variant: "destructive"
      });
      return;
    }
    
    setShowComparison(true);
  };
  
  // Handle linking action
  const handleLink = () => {
    if (selectedAccounts.length < 2) {
      toast({
        title: "Selection required",
        description: "Select at least 2 accounts to link.",
        variant: "destructive"
      });
      return;
    }
    
    setShowLinkingDialog(true);
  };
  
  // Handle merge action
  const handleMerge = () => {
    if (selectedAccounts.length !== 2) {
      toast({
        title: "Selection required",
        description: "Select exactly 2 accounts to merge.",
        variant: "destructive"
      });
      return;
    }
    
    setShowMergePreview(true);
  };
  
  // Load search results from URL params on initial render
  useEffect(() => {
    if (searchParams.get('query')) {
      handleSearch();
    }
  }, []);
  
  return (
    <div className="space-y-6">
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <UserSearch className="mr-2 h-5 w-5" />
            Account Search
          </CardTitle>
          <CardDescription>
            Search for user accounts across different systems to identify potential duplicates or related accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="searchQuery">Search Query</Label>
                <div className="flex w-full items-center space-x-2 mt-1">
                  <Input
                    id="searchQuery"
                    placeholder="Enter email, name, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isSearching}>
                    {isSearching ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden md:inline">Search</span>
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="searchType">Search By</Label>
                <Select
                  value={searchType}
                  onValueChange={setSearchType}
                >
                  <SelectTrigger id="searchType" className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="searchSystem">System</Label>
                <Select
                  value={searchSystem}
                  onValueChange={setSearchSystem}
                >
                  <SelectTrigger id="searchSystem" className="mt-1">
                    <SelectValue placeholder="Select system" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Systems</SelectItem>
                    <SelectItem value="unified">Unified Profiles</SelectItem>
                    <SelectItem value="systemeio">SystemeIO</SelectItem>
                    <SelectItem value="xendit">Xendit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeInactive"
                  checked={includeInactive}
                  onCheckedChange={(checked) => setIncludeInactive(!!checked)}
                />
                <Label htmlFor="includeInactive" className="text-sm">Include inactive accounts</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fuzzyMatch"
                  checked={fuzzyMatch}
                  onCheckedChange={(checked) => setFuzzyMatch(!!checked)}
                />
                <Label htmlFor="fuzzyMatch" className="text-sm">Enable fuzzy matching</Label>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Search Results */}
      {isSearching ? (
        <TabContentLoading />
      ) : searchResults.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Search Results</CardTitle>
            <CardDescription>
              {searchResults.length} accounts found matching your search criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Selected Accounts Panel */}
              {selectedAccounts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-muted p-2 rounded-md">
                    <button 
                      onClick={() => setShowSelectedAccounts(!showSelectedAccounts)}
                      className="text-sm flex items-center hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded px-1"
                    >
                      <span className="font-medium">{selectedAccounts.length}</span> accounts selected
                      <svg 
                        className={`h-4 w-4 ml-1 transition-transform ${showSelectedAccounts ? 'rotate-180' : ''}`} 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCompare}
                        disabled={selectedAccounts.length < 2}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Compare
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLink}
                        disabled={selectedAccounts.length < 2}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMerge}
                        disabled={selectedAccounts.length !== 2}
                      >
                        <MergeIcon className="h-4 w-4 mr-1" />
                        Merge
                      </Button>
                  </div>
                  
                  {/* Expandable panel with selected accounts */}
                  {showSelectedAccounts && (
                    <div className="border rounded-md p-3 bg-background">
                      <h4 className="text-sm font-medium mb-2">Selected Accounts</h4>
                      <div className="space-y-2">
                        {selectedAccounts.map(id => {
                          // Find the account in search results
                          const account = searchResults.find(result => result.id === id);
                          // If not found in current results, show basic info
                          return (
                            <div key={id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-md">
                              <div className="flex items-center">
                                <span className="font-medium">
                                  {account ? (
                                    <>
                                      {account.name || account.email}
                                      <span className="ml-2 text-xs text-muted-foreground">{account.system}</span>
                                    </>
                                  ) : (
                                    <span>{id} <span className="text-xs text-muted-foreground">(not in current results)</span></span>
                                  )}
                                </span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 px-2" 
                                onClick={() => toggleAccountSelection(id)}
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedAccounts([])}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Results List */}
              <div className="space-y-2">
                {searchResults.map((account) => (
                  <div
                    key={account.id}
                    className={`
                      p-4 rounded-md border cursor-pointer transition-colors
                      ${selectedAccounts.includes(account.id) ? 'bg-muted border-primary' : 'hover:bg-muted/50'}
                    `}
                    onClick={() => toggleAccountSelection(account.id)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{account.name || 'Unnamed Account'}</h4>
                          <Badge variant="outline">{account.system}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{account.email}</p>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant={account.status === 'active' ? 'default' : 'secondary'} className="w-fit">
                            {account.status || 'unknown'}
                          </Badge>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Last Active</span>
                          <span>
                            {account.lastActive 
                              ? new Date(account.lastActive).toLocaleDateString() 
                              : 'Unknown'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Match Score</span>
                          <span className="flex items-center">
                            {(account.matchScore || 0) > 0.8 ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
                            ) : (account.matchScore || 0) > 0.5 ? (
                              <AlertCircle className="h-3 w-3 text-amber-500 mr-1" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                            )}
                            {((account.matchScore || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : searchParams.get('query') ? (
        <Card className="p-8 flex flex-col items-center justify-center">
          <UserSearch className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No matching accounts found</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Try adjusting your search criteria or enable fuzzy matching to find similar accounts.
          </p>
        </Card>
      ) : null}
      
      {/* Dialogs */}
      {showComparison && (
        <AccountComparisonView 
          accounts={selectedAccounts.map(id => ({ id }))}
          onClose={() => setShowComparison(false)}
          getAccountDetails={getAccountDetails}
        />
      )}
      
      {showLinkingDialog && (
        <AccountLinkingDialog
          accounts={selectedAccounts.map(id => {
            // Find the account in search results to get full details
            const account = searchResults.find(result => result.id === id);
            return {
              id: id,
              name: account?.name || '',
              email: account?.email || '',
              system: account?.system || ''
            };
          })}
          onClose={() => setShowLinkingDialog(false)}
          onSuccess={() => {
            setShowLinkingDialog(false);
            setSelectedAccounts([]);
            toast({
              title: "Accounts linked",
              description: "The selected accounts have been successfully linked.",
              variant: "default"
            });
          }}
          linkAccounts={linkAccounts}
          getAccountDetails={getAccountDetails}
        />
      )}
      
      {showMergePreview && (
        <AccountMergePreview
          accounts={selectedAccounts.map(id => ({ id }))}
          onClose={() => setShowMergePreview(false)}
          onSuccess={() => {
            setShowMergePreview(false);
            setSelectedAccounts([]);
            toast({
              title: "Accounts merged",
              description: "The selected accounts have been successfully merged.",
              variant: "default"
            });
            handleSearch(); // Refresh results
          }}
          getAccountDetails={getAccountDetails}
        />
      )}
    </div>
  );
}
