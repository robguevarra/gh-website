'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner'; // Assuming you use sonner for toasts
import { formatDistanceToNow } from 'date-fns';

// Define the shape of a template object based on fetched data
interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    updated_at: string;
}

interface EmailTemplateListProps {
    initialTemplates: EmailTemplate[];
}

export default function EmailTemplateList({ initialTemplates }: EmailTemplateListProps) {
    const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
    const [isLoading, setIsLoading] = useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [newName, setNewName] = useState('');

    const handleDelete = async (templateId: string) => {
        if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/email-templates/${templateId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete template');
            }
            setTemplates(templates.filter(t => t.id !== templateId));
            toast.success('Template deleted successfully');
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error(`Error deleting template: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDuplicate = async (templateId: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/email-templates/${templateId}/duplicate`, {
                method: 'POST',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to duplicate template');
            }
            const { newTemplate } = await response.json();
            // Add the new template to the top of the list
            setTemplates([newTemplate, ...templates]); 
            toast.success('Template duplicated successfully');
        } catch (error: any) {
            console.error('Duplicate error:', error);
            toast.error(`Error duplicating template: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const openRenameDialog = (template: EmailTemplate) => {
        setSelectedTemplate(template);
        setNewName(template.name); // Pre-fill with current name
        setIsRenameDialogOpen(true);
    };

    const handleRename = async () => {
        if (!selectedTemplate || !newName.trim()) {
            toast.error('New name cannot be empty');
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/email-templates/${selectedTemplate.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to rename template');
            }
            // Update the template name in the local state
            setTemplates(templates.map(t => 
                t.id === selectedTemplate.id ? { ...t, name: newName.trim(), updated_at: new Date().toISOString() } : t
            ));
            toast.success('Template renamed successfully');
            setIsRenameDialogOpen(false);
            setSelectedTemplate(null);
        } catch (error: any) {
            console.error('Rename error:', error);
            toast.error(`Error renaming template: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {templates.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">No email templates found.</TableCell>
                        </TableRow>
                    ) : (
                        templates.map((template) => (
                            <TableRow key={template.id}>
                                <TableCell className="font-medium">{template.name}</TableCell>
                                <TableCell>{template.subject}</TableCell>
                                <TableCell>
                                    {formatDistanceToNow(new Date(template.updated_at), { addSuffix: true })}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    {/* TODO: Add Edit button to navigate to Unlayer editor */} 
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => openRenameDialog(template)}
                                        disabled={isLoading}
                                    >
                                        Rename
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleDuplicate(template.id)}
                                        disabled={isLoading}
                                    >
                                        Duplicate
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => handleDelete(template.id)}
                                        disabled={isLoading}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Rename Dialog */} 
            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Template</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Enter new template name"
                        />
                    </div>
                    <DialogFooter>
                         <DialogClose asChild>
                             <Button variant="outline" disabled={isLoading}>Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleRename} disabled={isLoading || !newName.trim()}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
} 