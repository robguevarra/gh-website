"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Search, FolderPlus, Upload, X, Loader2, ImageIcon, FileIcon, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getFiles, uploadFile, deleteFile, getFolders, createFolder } from "@/lib/supabase/storage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MediaItem {
  id: string;
  name: string;
  url: string;
  size?: number;
  created_at?: string;
  updated_at?: string;
  type?: string;
}

interface Folder {
  id: string;
  name: string;
  path: string;
}

interface MediaLibraryProps {
  onSelect?: (url: string) => void;
  selectable?: boolean;
}

export function MediaLibrary({ onSelect, selectable = false }: MediaLibraryProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [currentFolder, setCurrentFolder] = useState("images");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Load media items from storage
  const loadMediaItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const files = await getFiles(currentFolder);
      setMediaItems(files);
    } catch (error) {
      console.error("Error loading media:", error);
      toast.error("Failed to load media files");
    } finally {
      setIsLoading(false);
    }
  }, [currentFolder]);

  // Load folders from storage
  const loadFolders = useCallback(async () => {
    try {
      const foldersList = await getFolders();
      setFolders(foldersList);
    } catch (error) {
      console.error("Error loading folders:", error);
      toast.error("Failed to load folders");
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMediaItems();
    loadFolders();
  }, [loadMediaItems, loadFolders]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const uploadProgressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) return prev;
          return prev + 5;
        });
      }, 200);
      
      const result = await uploadFile(file, currentFolder);
      
      clearInterval(uploadProgressInterval);
      setUploadProgress(100);
      
      // Refresh list
      await loadMediaItems();
      toast.success("File uploaded successfully");
      setUploadDialogOpen(false);
      
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file deletion
  const handleDeleteFile = async () => {
    if (!selectedItem) return;
    
    try {
      setIsLoading(true);
      await deleteFile(`${currentFolder}/${selectedItem.name}`);
      
      // Refresh the list
      await loadMediaItems();
      toast.success("File deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle folder creation
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Folder name is required");
      return;
    }
    
    try {
      setIsLoading(true);
      await createFolder(newFolderName);
      
      // Refresh folders
      await loadFolders();
      toast.success("Folder created successfully");
      setFolderDialogOpen(false);
      setNewFolderName("");
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder");
    } finally {
      setIsLoading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Byte";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i];
  };

  // Handle item selection
  const handleSelectItem = (item: MediaItem) => {
    if (selectable && onSelect) {
      onSelect(item.url);
    } else {
      setSelectedItem(item);
    }
  };

  // Filter items by search term
  const filteredItems = mediaItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group items by type
  const imageItems = filteredItems.filter(item => 
    item.type?.startsWith("image/") || 
    item.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  );
  
  const documentItems = filteredItems.filter(item => 
    item.type?.startsWith("application/") || 
    item.name.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i)
  );
  
  const otherItems = filteredItems.filter(item => 
    !item.type?.startsWith("image/") && 
    !item.type?.startsWith("application/") &&
    !item.name.match(/\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold">Media Library</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              loadMediaItems();
              loadFolders();
            }}
            title="Refresh"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderPlus className="h-4 w-4 mr-2" /> New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Enter a name for the new folder.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="folder-name">Folder Name</Label>
                <Input
                  id="folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g., documents, videos"
                  className="mt-1"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleCreateFolder} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...
                    </>
                  ) : (
                    "Create Folder"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="h-4 w-4 mr-2" /> Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload File</DialogTitle>
                <DialogDescription>
                  Select a file to upload to the current folder.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  disabled={isUploading}
                />
                
                {isUploading && (
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-muted rounded overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300 ease-in-out" 
                        style={{ width: `${uploadProgress}%` }} 
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Folders</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  <Button
                    variant={currentFolder === "images" ? "default" : "ghost"}
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => setCurrentFolder("images")}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" /> Images
                  </Button>
                  <Button
                    variant={currentFolder === "documents" ? "default" : "ghost"}
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => setCurrentFolder("documents")}
                  >
                    <FileIcon className="h-4 w-4 mr-2" /> Documents
                  </Button>
                  
                  {folders.map((folder) => (
                    <Button
                      key={folder.id}
                      variant={currentFolder === folder.name ? "default" : "ghost"}
                      className="w-full justify-start"
                      size="sm"
                      onClick={() => setCurrentFolder(folder.name)}
                    >
                      {folder.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Files in {currentFolder}</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <div className="text-center">
                    <p>No files found in this folder.</p>
                    <p className="text-sm mt-1">Upload files using the button above.</p>
                  </div>
                </div>
              ) : (
                <Tabs defaultValue="images">
                  <TabsList>
                    <TabsTrigger value="images">Images ({imageItems.length})</TabsTrigger>
                    <TabsTrigger value="documents">Documents ({documentItems.length})</TabsTrigger>
                    <TabsTrigger value="others">Others ({otherItems.length})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="images">
                    <ScrollArea className="h-[400px]">
                      <div className="grid grid-cols-3 gap-4 p-2">
                        {imageItems.map((item) => (
                          <div 
                            key={item.id}
                            className={`relative group border rounded-md overflow-hidden cursor-pointer ${
                              selectedItem?.id === item.id ? 'ring-2 ring-primary' : ''
                            }`}
                            onClick={() => handleSelectItem(item)}
                          >
                            <img 
                              src={item.url} 
                              alt={item.name}
                              className="w-full h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              {selectable ? (
                                <Button variant="secondary" size="sm">
                                  Select
                                </Button>
                              ) : (
                                <Button 
                                  variant="destructive" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItem(item);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="p-2 bg-muted/50 text-xs truncate">
                              {item.name}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {imageItems.length === 0 && (
                        <div className="flex items-center justify-center h-60 text-muted-foreground">
                          No images found
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="documents">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2 p-2">
                        {documentItems.map((item) => (
                          <div 
                            key={item.id}
                            className={`flex items-center justify-between p-3 border rounded-md ${
                              selectedItem?.id === item.id ? 'bg-muted' : ''
                            }`}
                            onClick={() => handleSelectItem(item)}
                          >
                            <div className="flex items-center space-x-3">
                              <FileIcon className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(item.size)}
                                </p>
                              </div>
                            </div>
                            
                            {!selectable && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem(item);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        
                        {documentItems.length === 0 && (
                          <div className="flex items-center justify-center h-60 text-muted-foreground">
                            No documents found
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="others">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2 p-2">
                        {otherItems.map((item) => (
                          <div 
                            key={item.id}
                            className={`flex items-center justify-between p-3 border rounded-md ${
                              selectedItem?.id === item.id ? 'bg-muted' : ''
                            }`}
                            onClick={() => handleSelectItem(item)}
                          >
                            <div className="flex items-center space-x-3">
                              <FileIcon className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(item.size)}
                                </p>
                              </div>
                            </div>
                            
                            {!selectable && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem(item);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        
                        {otherItems.length === 0 && (
                          <div className="flex items-center justify-center h-60 text-muted-foreground">
                            No other files found
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedItem && (
              <Alert variant="destructive">
                <AlertDescription>
                  You are about to delete: <strong>{selectedItem.name}</strong>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteFile}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 