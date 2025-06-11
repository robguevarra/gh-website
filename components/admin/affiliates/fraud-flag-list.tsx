'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminFraudFlagListItem } from "@/types/admin/affiliate";
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { resolveFraudFlag } from '@/lib/actions/admin/fraud-actions';
import { toast } from 'sonner';

interface FraudFlagListProps {
  fraudFlags: AdminFraudFlagListItem[];
}

export function FraudFlagList({ fraudFlags }: FraudFlagListProps) {
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [flagForResolveModal, setFlagForResolveModal] = useState<AdminFraudFlagListItem | null>(null);
  const [resolverNotes, setResolverNotes] = useState('');

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [flagForDetailsModal, setFlagForDetailsModal] = useState<AdminFraudFlagListItem | null>(null);

  if (!fraudFlags || fraudFlags.length === 0) {
    return <p>No fraud flags found.</p>;
  }

  const handleOpenResolveModal = (flag: AdminFraudFlagListItem) => {
    setFlagForResolveModal(flag);
    setResolverNotes(''); 
    setIsResolveModalOpen(true);
  };

  const handleOpenDetailsModal = (flag: AdminFraudFlagListItem) => {
    setFlagForDetailsModal(flag);
    setIsDetailsModalOpen(true);
  };

  const handleResolveSubmit = async () => {
    if (!flagForResolveModal) return;

    if (!resolverNotes.trim()) {
        toast.error("Resolver notes cannot be empty.");
        return;
    }
    const toastId = toast.loading("Resolving fraud flag...");
    const result = await resolveFraudFlag(flagForResolveModal.id, resolverNotes);

    if (result.success) {
      toast.success('Fraud flag resolved successfully.', { id: toastId });
      setIsResolveModalOpen(false); 
      setFlagForResolveModal(null); 
    } else {
      toast.error(result.error || 'Failed to resolve fraud flag.', { id: toastId });
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Affiliate Name</TableHead>
            <TableHead>Affiliate Email</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Date Flagged</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fraudFlags.map((flag) => (
            <TableRow key={flag.id}>
              <TableCell>{flag.affiliate_name}</TableCell>
              <TableCell>{flag.affiliate_email}</TableCell>
              <TableCell className="max-w-xs truncate" title={flag.reason}>{flag.reason}</TableCell>
              <TableCell>{format(new Date(flag.created_at), 'PPpp')}</TableCell>
              <TableCell>
                <Badge variant={flag.resolved ? "secondary" : "destructive"}>
                  {flag.resolved ? "Resolved" : "Unresolved"}
                </Badge>
                {flag.resolved && flag.resolved_at && (
                   <span className="text-xs text-muted-foreground ml-2">
                     ({format(new Date(flag.resolved_at), 'PP')})
                   </span>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                {flag.details && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDetailsModal(flag)}
                  >
                    View Details
                  </Button>
                )}
                {!flag.resolved && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenResolveModal(flag)}
                  >
                    Resolve
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Resolve Modal */}
      {flagForResolveModal && (
        <Dialog open={isResolveModalOpen} onOpenChange={(isOpen) => {
            setIsResolveModalOpen(isOpen);
            if (!isOpen) setFlagForResolveModal(null);
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Resolve Fraud Flag</DialogTitle>
              <DialogDescription>
                Review the details and provide resolution notes for the fraud flag concerning:
                <br /><strong>Affiliate:</strong> {flagForResolveModal.affiliate_name} ({flagForResolveModal.affiliate_email})
                <br /><strong>Reason:</strong> {flagForResolveModal.reason}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid items-center gap-1.5">
                <Label htmlFor="resolver-notes">Resolution Notes</Label>
                <Textarea
                  id="resolver-notes"
                  value={resolverNotes}
                  onChange={(e) => setResolverNotes(e.target.value)}
                  placeholder="Enter your resolution notes here..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {setIsResolveModalOpen(false); setFlagForResolveModal(null);}}>Cancel</Button>
              <Button type="button" onClick={handleResolveSubmit}>Submit Resolution</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Details Modal */}
      {flagForDetailsModal && (
        <Dialog open={isDetailsModalOpen} onOpenChange={(isOpen) => {
            setIsDetailsModalOpen(isOpen);
            if (!isOpen) setFlagForDetailsModal(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Fraud Flag Details</DialogTitle>
              <DialogDescription>
                Additional details for the fraud flag concerning:
                <br /><strong>Affiliate:</strong> {flagForDetailsModal.affiliate_name} ({flagForDetailsModal.affiliate_email})
                <br /><strong>Reason:</strong> {flagForDetailsModal.reason}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              {flagForDetailsModal.details && typeof flagForDetailsModal.details === 'object' && 'description' in flagForDetailsModal.details && typeof flagForDetailsModal.details.description === 'string' ? (
                <div>
                  <h4 className="font-semibold text-sm">Description:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{flagForDetailsModal.details.description}</p>
                </div>
              ) : flagForDetailsModal.details ? (
                <div>
                  <h4 className="font-semibold text-sm">Additional Details:</h4>
                  <details className="text-sm mt-1">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:underline">View Raw JSON Details</summary>
                    <pre className="mt-2 p-2 bg-muted rounded-md text-sm overflow-x-auto">
                      {JSON.stringify(flagForDetailsModal.details, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No additional details provided.</p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
