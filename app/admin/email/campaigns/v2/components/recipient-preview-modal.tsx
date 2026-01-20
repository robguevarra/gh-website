'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface RecipientPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
}

interface Recipient {
  id: string;
  user: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
  };
}

export function RecipientPreviewModal({ isOpen, onClose, campaignId }: RecipientPreviewModalProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && campaignId) {
      fetchRecipients();
    }
  }, [isOpen, campaignId]);

  const fetchRecipients = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch a sample of users from segments associated with this campaign
      const response = await fetch(`/api/admin/campaigns/${campaignId}/preview-recipients?limit=20`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recipients: ${response.status}`);
      }
      
      const { data, count, message } = await response.json();
      setRecipients(data || []);
      setTotalCount(count || 0);
      
      // If we got a message but no data, it's not an error but a note (e.g., "No segments selected")
      if (message && (!data || data.length === 0)) {
        setError(message);
      }
    } catch (err: any) {
      console.error('Error fetching recipients:', err);
      setError(err.message || 'Failed to load recipients');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recipient Preview</DialogTitle>
          <DialogDescription>
            Showing a sample of {recipients.length} recipients {totalCount !== null && `(out of ${totalCount.toLocaleString()} total)`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-4 text-destructive">
              {error}
            </div>
          ) : recipients.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No recipients found for this campaign.
            </div>
          ) : (
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-4">
                {recipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-start space-x-4 py-2">
                    <div className="bg-muted rounded-full p-2">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {recipient.user.first_name && recipient.user.last_name
                          ? `${recipient.user.first_name} ${recipient.user.last_name}`
                          : 'Unnamed User'}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {recipient.user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        
        <DialogFooter className="sm:justify-between">
          <div>
            {totalCount !== null && recipients.length > 0 && (
              <Badge variant="outline">
                Showing {recipients.length} of {totalCount.toLocaleString()} recipients
              </Badge>
            )}
          </div>
          <DialogClose asChild>
            <Button type="button">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
