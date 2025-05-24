'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, X, Tag as TagIcon, Clock, User, Search, Filter } from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Types from our data access layer
import { Tag, TagType } from '@/lib/supabase/data-access/tags';

interface UserTagsSegmentsProps {
  userId: string;
  userEmail: string;
}

interface UserTagWithHistory extends Tag {
  assigned_at?: string;
  assigned_by?: string;
}

// Tag category color mapping following design context
const getTagTypeColor = (tagType?: string) => {
  const colors = {
    'Behavioral': 'hsl(315 15% 60%)', // Primary purple
    'Demographic': 'hsl(355 70% 85%)', // Secondary pink
    'Engagement': 'hsl(200 35% 75%)', // Accent blue
    'Custom': 'hsl(0 0% 60%)', // Neutral gray
  };
  return colors[tagType as keyof typeof colors] || colors.Custom;
};

export function UserTagsSegments({ userId, userEmail }: UserTagsSegmentsProps) {
  // State management
  const [userTags, setUserTags] = useState<UserTagWithHistory[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagTypes, setTagTypes] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [selectedTagType, setSelectedTagType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [commandOpen, setCommandOpen] = useState(false);

  // Fetch user's current tags
  const fetchUserTags = useCallback(async () => {
    try {
      const response = await fetch(`/api/user-tags?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user tags');
      const result = await response.json();
      setUserTags(result.data || []);
    } catch (error) {
      console.error('Error fetching user tags:', error);
      toast.error('Failed to load user tags');
    }
  }, [userId]);

  // Fetch all available tags for autocomplete
  const fetchAvailableTags = useCallback(async () => {
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) throw new Error('Failed to fetch tags');
      const result = await response.json();
      setAvailableTags(result.data || []);
    } catch (error) {
      console.error('Error fetching available tags:', error);
      toast.error('Failed to load available tags');
    }
  }, []);

  // Fetch tag types for categorization
  const fetchTagTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/tag-types');
      if (!response.ok) throw new Error('Failed to fetch tag types');
      const result = await response.json();
      setTagTypes(result.data || []);
    } catch (error) {
      console.error('Error fetching tag types:', error);
      toast.error('Failed to load tag types');
    }
  }, []);

  // Load all data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserTags(),
        fetchAvailableTags(),
        fetchTagTypes()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchUserTags, fetchAvailableTags, fetchTagTypes]);

  // Add tag to user
  const handleAddTag = async (tagId: string) => {
    setIsAddingTag(true);
    try {
      const response = await fetch('/api/user-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagIds: [tagId],
          userIds: [userId]
        })
      });

      if (!response.ok) throw new Error('Failed to add tag');
      
      await fetchUserTags(); // Refresh user tags
      toast.success('Tag added successfully');
      setCommandOpen(false);
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Failed to add tag');
    } finally {
      setIsAddingTag(false);
    }
  };

  // Remove tag from user
  const handleRemoveTag = async (tagId: string) => {
    try {
      const response = await fetch('/api/user-tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagIds: [tagId],
          userIds: [userId]
        })
      });

      if (!response.ok) throw new Error('Failed to remove tag');
      
      await fetchUserTags(); // Refresh user tags
      toast.success('Tag removed successfully');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag');
    }
  };

  // Filter available tags (exclude already assigned ones)
  const getFilteredAvailableTags = () => {
    const userTagIds = new Set(userTags.map(tag => tag.id));
    return availableTags.filter(tag => {
      const notAssigned = !userTagIds.has(tag.id);
      const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedTagType === 'all' || tag.tag_type?.id === selectedTagType;
      return notAssigned && matchesSearch && matchesType;
    });
  };

  // Group user tags by type for clear visual hierarchy
  const getUserTagsByType = () => {
    const grouped: { [key: string]: UserTagWithHistory[] } = {};
    
    userTags.forEach(tag => {
      const typeName = tag.tag_type?.name || 'Untyped';
      if (!grouped[typeName]) {
        grouped[typeName] = [];
      }
      grouped[typeName].push(tag);
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-24 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const groupedTags = getUserTagsByType();
  const filteredAvailableTags = getFilteredAvailableTags();

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with Add Tag Button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Tags & Segments</h3>
            <p className="text-sm text-muted-foreground">
              Manage tags and view segments for {userEmail}
            </p>
          </div>
          
          <Popover open={commandOpen} onOpenChange={setCommandOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="border-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                disabled={isAddingTag}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="end">
              <Command>
                <CommandInput 
                  placeholder="Search tags..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <div className="border-b px-3 py-2">
                  <Select value={selectedTagType} onValueChange={setSelectedTagType}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {tagTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-[200px]">
                    {filteredAvailableTags.map(tag => (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => handleAddTag(tag.id)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getTagTypeColor(tag.tag_type?.name) }}
                          />
                          <span>{tag.name}</span>
                          {tag.tag_type && (
                            <Badge variant="secondary" className="text-xs">
                              {tag.tag_type.name}
                            </Badge>
                          )}
                        </div>
                        <Plus className="h-4 w-4" />
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Current Tags Display - Grouped by Type */}
        {Object.keys(groupedTags).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedTags).map(([typeName, tags]) => (
              <Card key={typeName}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getTagTypeColor(typeName) }}
                    />
                    <CardTitle className="text-base">{typeName}</CardTitle>
                    <Badge variant="outline" className="ml-auto">
                      {tags.length} tag{tags.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <Tooltip key={tag.id}>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="secondary" 
                            className="flex items-center gap-1 pr-1 cursor-help"
                            style={{ 
                              backgroundColor: `${getTagTypeColor(typeName)}20`,
                              borderColor: getTagTypeColor(typeName),
                              color: getTagTypeColor(typeName)
                            }}
                          >
                            <span>{tag.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleRemoveTag(tag.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">{tag.name}</p>
                            {tag.assigned_at && (
                              <p className="text-xs text-muted-foreground">
                                <Clock className="inline h-3 w-3 mr-1" />
                                Added {new Date(tag.assigned_at).toLocaleDateString()}
                              </p>
                            )}
                            {tag.assigned_by && (
                              <p className="text-xs text-muted-foreground">
                                <User className="inline h-3 w-3 mr-1" />
                                By {tag.assigned_by}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <CardContent>
              <TagIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tags assigned</h3>
              <p className="text-muted-foreground mb-4">
                This user doesn't have any tags assigned yet.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setCommandOpen(true)}
                className="border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Tag
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Segments Section - Future Implementation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Segments</CardTitle>
            <CardDescription>
              Segments this user belongs to based on their tags and behavior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Segment analysis coming soon</p>
            </div>
          </CardContent>
        </Card>

        {/* Tag History Section */}
        {userTags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tag Assignment History</CardTitle>
              <CardDescription>
                Chronological history of tag assignments for this user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userTags
                  .slice() // Create a copy to avoid mutating the original array
                  .sort((a, b) => new Date(b.assigned_at || '').getTime() - new Date(a.assigned_at || '').getTime())
                  .map(tag => (
                    <div key={`${tag.id}-history`} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getTagTypeColor(tag.tag_type?.name) }}
                        />
                        <div>
                          <p className="font-medium text-sm">{tag.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tag.tag_type?.name && (
                              <span className="inline-flex items-center">
                                <span>{tag.tag_type.name}</span>
                                <span className="mx-1">•</span>
                              </span>
                            )}
                            Added {tag.assigned_at ? new Date(tag.assigned_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTag(tag.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
} 