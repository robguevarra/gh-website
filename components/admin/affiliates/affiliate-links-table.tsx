'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CopyIcon, ExternalLink, Link as LinkIcon, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface AffiliateLink {
  id: string;
  name: string;
  slug: string;
  url: string;
  created_at: string;
  click_count?: number;
  conversion_count?: number;
  is_default?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface AffiliateLinksTableProps {
  links: AffiliateLink[];
  className?: string;
}

export function AffiliateLinksTable({ links = [], className }: AffiliateLinksTableProps) {
  const [showFullUrls, setShowFullUrls] = useState(false);
  
  const copyToClipboard = (text: string, linkName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`Link "${linkName}" copied to clipboard`);
    }).catch(err => {
      toast.error('Failed to copy link');
      console.error('Failed to copy: ', err);
    });
  };
  
  const truncateUrl = (url: string) => {
    if (showFullUrls) return url;
    
    // Simple truncation logic
    if (url.length <= 40) return url;
    
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname;
    
    // Show domain + first part of path + ...
    const truncatedPath = path.length > 25 
      ? path.substring(0, 15) + '...' + path.substring(path.length - 10) 
      : path;
      
    return `${domain}${truncatedPath}${urlObj.search ? '?...' : ''}`;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Affiliate Links</CardTitle>
            <CardDescription>
              {links.length} {links.length === 1 ? 'link' : 'links'} used for referrals
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFullUrls(!showFullUrls)}
            className="flex items-center gap-1"
          >
            {showFullUrls ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showFullUrls ? 'Hide Full URLs' : 'Show Full URLs'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {links.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-1.5">
                          <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {link.name}
                          {link.is_default && (
                            <Badge variant="outline" className="ml-1 text-[10px]">Default</Badge>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5">/{link.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[240px] truncate">
                      {truncateUrl(link.url)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(link.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>
                          <span className="font-medium">{link.click_count || 0}</span>
                          <span className="text-muted-foreground"> clicks</span>
                        </span>
                        <span>
                          <span className="font-medium">{link.conversion_count || 0}</span>
                          <span className="text-muted-foreground"> conversions</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => copyToClipboard(link.url, link.name)}
                        >
                          <CopyIcon className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          asChild
                        >
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <LinkIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No referral links found</h3>
            <p className="text-muted-foreground mt-1">
              This affiliate has not created any referral links yet
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
