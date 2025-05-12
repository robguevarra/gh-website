// components/tag-management/tag-type-list.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTagStore } from "@/lib/hooks/use-tag-store";
import TagTypeForm from "./tag-type-form";
import type { TagType } from "@/lib/supabase/data-access/tags";
import { PlusCircle, Edit3, Trash2, Loader2 } from 'lucide-react';

export default function TagTypeList() {
  const {
    tagTypes,
    fetchTagTypes,
    deleteTagType,
    isLoadingTagTypes,
    tagTypesError,
  } = useTagStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTagType, setEditingTagType] = useState<TagType | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<TagType | null>(null);

  useEffect(() => {
    fetchTagTypes();
  }, [fetchTagTypes]);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingTagType(undefined);
    fetchTagTypes(); // Re-fetch to get the latest list
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingTagType(undefined);
  };

  const handleAddNew = () => {
    setEditingTagType(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (tagType: TagType) => {
    setEditingTagType(tagType);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (showDeleteConfirm?.id) {
      await deleteTagType(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
      fetchTagTypes(); // Re-fetch
    }
  };

  if (isLoadingTagTypes && !tagTypes.length) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Loading tag types...</span></div>;
  }

  if (tagTypesError) {
    return <p className="text-destructive">Error loading tag types: {tagTypesError}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tag Types</h2>
        <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add New Type</Button>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => {if (!open) handleFormCancel(); else setIsFormOpen(true);}}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTagType ? "Edit" : "Create"} Tag Type</DialogTitle>
            <DialogDescription>
              {editingTagType ? "Update the details of this tag type." : "Define a new category for your tags."}
            </DialogDescription>
          </DialogHeader>
          <TagTypeForm
            initialData={editingTagType}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {tagTypes.length === 0 && !isLoadingTagTypes && (
        <p>No tag types found. Get started by adding one!</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tagTypes.map((type) => (
          <Card key={type.id}>
            <CardHeader>
              <CardTitle>{type.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground h-10 truncate">
                {type.description || "No description provided."}
              </p>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleEdit(type)}><Edit3 className="mr-1 h-3 w-3" /> Edit</Button>
              <AlertDialog open={showDeleteConfirm?.id === type.id} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(type)}><Trash2 className="mr-1 h-3 w-3"/> Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the tag type "<strong>{showDeleteConfirm?.name}</strong>". Tags using this type will not be deleted but will lose this categorization.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowDeleteConfirm(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isLoadingTagTypes}>Delete</AlertDialogAction>
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
