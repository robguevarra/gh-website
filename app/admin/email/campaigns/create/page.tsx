'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CampaignForm } from '../components/campaign-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/admin/email-templates');
        
        if (!response.ok) {
          throw new Error('Failed to fetch email templates');
        }
        
        const data = await response.json();
        setTemplates(data.templates || []);
      } catch (error: any) {
        setError(error.message || 'An error occurred while fetching templates');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTemplates();
  }, []);
  
  const handleSuccess = (campaignId: string) => {
    router.push(`/admin/email/campaigns/${campaignId}`);
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/admin/email/campaigns')}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
          <p className="text-muted-foreground">
            Create a new email marketing campaign
          </p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-destructive">
          {error}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            No email templates found. You need to create at least one template before creating a campaign.
          </p>
          <Button onClick={() => router.push('/admin/email/templates/create')}>
            Create Template
          </Button>
        </div>
      ) : (
        <CampaignForm 
          templates={templates} 
          onSuccess={handleSuccess} 
        />
      )}
    </div>
  );
}
