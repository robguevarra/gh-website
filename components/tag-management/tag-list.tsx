// components/tag-management/tag-list.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // Added import
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input"; // Added Input import
import { useTagStore } from "@/lib/hooks/use-tag-store";
import TagForm from "./tag-form";
import type { Tag, TagType } from "@/lib/supabase/data-access/tags";
import { PlusCircle, Edit3, Trash2, Loader2, Filter, Tag as TagIcon, Search, ChevronRight, Home, Users } from 'lucide-react'; // Added ChevronRight, Home, Users

export default function TagList() {
  const {
    tags,
    tagTypes,
    fetchTags, // Still needed for initial load and form success potentially
    fetchTagTypes,
    deleteTag,
    isLoadingTags,
    isLoadingTagTypes,
    tagsError,
    navigateToTagChildren, // New action
    currentParentTag,      // New state
    breadcrumbs,           // New state
  } = useTagStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Tag | null>(null);
  const [selectedTagTypeId, setSelectedTagTypeId] = useState<string | null>(null); // For type filter dropdown
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    // Initial fetch: if no current parent, fetch root tags. Otherwise, current view is managed by navigateToTagChildren.
    if (!currentParentTag && breadcrumbs.length === 0) {
      navigateToTagChildren(null); // Fetches root tags and sets up initial state
    }
    if (!tagTypes.length) {
      fetchTagTypes();
    }
  }, [navigateToTagChildren, fetchTagTypes, tagTypes.length, currentParentTag, breadcrumbs.length]);

  // useEffect for handling type filter changes
  useEffect(() => {
    // Don't run on initial mount if navigateToTagChildren(null) is already fetching root tags.
    // Let the initial breadcrumb/parent-driven fetch complete first.
    // This effect should primarily react to user changing the type filter.
    if (breadcrumbs.length > 0 || currentParentTag !== null) {
      // If we are in a drilled-down state or explicitly at root via breadcrumbs
      fetchTags({ 
        typeId: selectedTagTypeId || undefined, // Pass undefined if null, API might expect this or ignore
        parentId: currentParentTag?.id ?? null 
      });
    } else if (selectedTagTypeId) {
      // Case: initial load, no breadcrumbs yet, but a type filter is selected (e.g. from URL param in future)
      // This might overlap with the first useEffect's navigateToTagChildren(null) if no type is selected.
      // For now, let navigateToTagChildren handle initial root load, and this handles subsequent type changes.
      fetchTags({ 
        typeId: selectedTagTypeId, 
        parentId: null // Assume root if no breadcrumbs/parent established
      });
    }
    // If selectedTagTypeId is null and breadcrumbs are empty (initial root state), 
    // the main useEffect's navigateToTagChildren(null) handles the fetch.
  }, [selectedTagTypeId, fetchTags, currentParentTag, breadcrumbs]);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingTag(undefined);
    // Re-fetch children of the current parent, or root if no parent
    navigateToTagChildren(currentParentTag);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingTag(undefined);
  };

  const handleAddNew = () => {
    setEditingTag(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (showDeleteConfirm?.id) {
      await deleteTag(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
      navigateToTagChildren(currentParentTag); // Re-fetch current view
    }
  };

  const filteredTags = useMemo(() => {
    // The fetchTags action already handles filtering by typeId if selectedTagTypeId is set.
    // This memo is more for if we were to fetch all tags and filter client-side, 
    // but since fetchTags is called with typeId, `tags` should already be filtered.
    // If `selectedTagTypeId` is undefined, `tags` contains root tags based on current fetch logic.
    // Now, also filter by searchTerm
    return tags.filter(tag => 
      tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tags, searchTerm]);

  const getTypeName = (typeId?: string | null) => {
    if (!typeId) return 'N/A';
    return tagTypes.find(tt => tt.id === typeId)?.name || 'Unknown Type';
  };
  
  // getParentName is less relevant if we are always showing children of currentParentTag
  // but can be kept for card display if needed.
  const getParentNameDisplay = () => {
    return currentParentTag ? currentParentTag.name : 'Root';
  }

  if ((isLoadingTags && !tags.length && breadcrumbs.length === 0) || (isLoadingTagTypes && !tagTypes.length)) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Loading tags...</span></div>;
  }

  if (tagsError) {
    return <p className="text-destructive">Error loading tags: {tagsError}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Home className="h-4 w-4 cursor-pointer hover:text-primary" onClick={() => navigateToTagChildren(null)} />
          <ChevronRight className="h-4 w-4 text-gray-400" />
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.id} className="flex items-center space-x-1">
              <span 
                className={`cursor-pointer hover:text-primary ${index === breadcrumbs.length - 1 ? 'font-semibold text-primary' : ''}`}
                onClick={() => navigateToTagChildren(crumb)}
              >
                {crumb.name}
              </span>
              {index < breadcrumbs.length - 1 && <ChevronRight className="h-4 w-4 text-gray-400" />}
            </span>
          ))}
          {breadcrumbs.length === 0 && <span className="font-semibold text-primary">Root Tags</span>}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Search tags..."
              className="pl-8 w-full sm:w-[180px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select onValueChange={setSelectedTagTypeId} value={selectedTagTypeId || "all"}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter by type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem> {/* Changed from All Root Tags */}
              {tagTypes.map(type => (
                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddNew} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Add New Tag</Button>
        </div>
      </div>

      {/* Removed h3 for Manage Tags as breadcrumbs serve a similar purpose now */}

      <Dialog open={isFormOpen} onOpenChange={(open) => {if (!open) handleFormCancel(); else setIsFormOpen(true);}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit" : "Create"} Tag</DialogTitle>
          </DialogHeader>
          <TagForm
            initialData={editingTag}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {filteredTags.length === 0 && !isLoadingTags && (
        <p className="text-center py-6 text-muted-foreground">
          {searchTerm ? `No tags found matching "${searchTerm}".` : "No tags found for the current filter. Add some!"}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTags.map((tag) => (
          <Card key={tag.id} className="flex flex-col group">
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors" 
              onClick={() => navigateToTagChildren(tag)} // Make header clickable for drill-down
            >
              <CardTitle className="flex items-center"><TagIcon className="mr-2 h-5 w-5 text-primary group-hover:text-accent-foreground"/> {tag.name}</CardTitle>
              <CardDescription className="flex flex-col space-y-1 mt-1">
                <span>Type: {getTypeName(tag.type_id)} | Parent: {getParentNameDisplay()}</span>
                {tag.user_count !== undefined && (
                  <span className="flex items-center text-xs text-muted-foreground">
                    <Users className="mr-1 h-3 w-3" /> Usage: {tag.user_count}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            {tag.metadata && Object.keys(tag.metadata).length > 0 && (
                <CardContent className="flex-grow text-xs text-muted-foreground bg-muted/30 p-3 m-2 rounded-md overflow-auto max-h-24">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(tag.metadata, null, 2)}</pre>
                </CardContent>
            )}
            {!tag.metadata || Object.keys(tag.metadata).length === 0 && (
                <CardContent className="flex-grow">
                    <p className="text-xs text-muted-foreground italic">No metadata.</p>
                </CardContent>
            )}
            <CardFooter className="flex justify-end space-x-2 mt-auto pt-4">
              <Button variant="outline" size="sm" onClick={() => handleEdit(tag)}><Edit3 className="mr-1 h-3 w-3" /> Edit</Button>
              <AlertDialog open={showDeleteConfirm?.id === tag.id} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(tag)}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Deleting "<strong>{showDeleteConfirm?.name}</strong>" will remove it. Child tags (if any) might need to be re-parented manually or might be affected based on DB constraints (e.g., ON DELETE SET NULL for parent_id).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowDeleteConfirm(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isLoadingTags}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
