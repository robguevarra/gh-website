'use client';

import { DashboardLayout } from '@/components/affiliate/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  BookOpen,
  Video,
  Image,
  File,
  Presentation,
  Sheet,
  AlertCircle,
  PlayCircle,
  CheckCircle,
  ArrowRight,
  Target,
  Users,
  TrendingUp,
  Share2,
  Shield
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { GoogleDriveViewer } from '@/components/dashboard/google-drive-viewer';

interface AffiliateResource {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  size: string | null;
  description: string | null;
  createdTime: string | null;
  fileType: string;
  previewUrl: string;
  downloadUrl: string;
}

interface ResourcesResponse {
  success: boolean;
  resources: AffiliateResource[];
  total: number;
  error?: string;
  details?: string;
}

// Tutorial steps data - Updated with Papers to Profits specific content
const tutorialSteps = [
  {
    id: 1,
    title: "Understanding Your Papers to Profits Affiliate Link",
    icon: <Share2 className="h-6 w-6" />,
    content: [
      "Your unique affiliate link tracks all Papers to Profits course enrollments back to you",
      "Share this link when discussing homeschooling resources, paper crafting, or mom entrepreneurship",
      "Every ₱1,000 course enrollment through your link earns you commission",
      "You can customize your link slug in the Settings tab to make it more memorable (e.g., /grace-paper-course)",
      "Test your link regularly to ensure it's working and tracking properly"
    ]
  },
  {
    id: 2,
    title: "Finding Your Target Audience for Papers to Profits",
    icon: <Target className="h-6 w-6" />,
    content: [
      "Focus on homeschooling moms who are looking for ways to contribute financially to their families",
      "Target parents interested in DIY projects, crafting, or creating educational materials",
      "Join Facebook groups like 'Homeschooling Philippines', 'Homeschool Moms Support Group', and crafting communities",
      "Look for moms who share about wanting to start a side business or feeling creative but stuck",
      "Connect with parents who post about organizing their homeschool materials or wanting custom planners"
    ]
  },
  {
    id: 3,
    title: "Building Trust & Sharing Your Papers to Profits Story",
    icon: <Users className="h-6 w-6" />,
    content: [
      "Share your own homeschooling journey and why you believe in Grace's teaching approach",
      "Post photos of paper products you've created or would love to create using the course methods",
      "Be authentic about how Papers to Profits could help other moms balance family and financial goals",
      "Share Grace's story - homeschooling mom of 3 who built a ₱100k+ business from paper crafting",
      "Engage genuinely with your community before introducing the course opportunity"
    ]
  },
      {
      id: 4,
      title: "Ethical Promotion Guidelines - Do's and Don'ts",
      icon: <Shield className="h-6 w-6" />,
      content: [
        "✅ DO: Always disclose your affiliate relationship transparently ('I earn a commission if you enroll')",
        "✅ DO: Share genuine experiences and honest opinions about the course value",
        "✅ DO: Focus on helping others achieve their goals rather than just making sales",
        "✅ DO: Respect Facebook group rules and post valuable content, not just promotions",
        "❌ DON'T: Spam Facebook groups with repetitive promotional posts",
        "❌ DON'T: Send unsolicited direct messages to strangers about the course",
        "❌ DON'T: Make false income claims or unrealistic promises about success",
        "❌ DON'T: Copy-paste the same promotional message across multiple groups",
        "❌ DON'T: Pressure people or use manipulative sales tactics",
        "❌ DON'T: Hide the fact that you're promoting an affiliate product"
      ]
    },
    {
      id: 5,
      title: "Maximizing Your Papers to Profits Affiliate Earnings",
      icon: <TrendingUp className="h-6 w-6" />,
      content: [
        "Highlight the course's lifetime access and ₱5,000+ bonus templates in your promotions",
        "Emphasize the 30-day money-back guarantee to reduce purchase hesitation",
        "Share specific modules that would appeal to your audience (design, binding, business fundamentals)",
        "Create content around 'homeschool mom entrepreneur' themes and paper organization tips",
        "Track which social media posts and messages generate the most clicks in your Performance tab",
        "Follow up personally with interested prospects who click but don't enroll immediately"
      ]
    }
];

export default function ResourcesPage() {
  const [resources, setResources] = useState<AffiliateResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<AffiliateResource | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);

  // Load resources from Google Drive
  const loadResources = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Loading affiliate resources...');
      const response = await fetch('/api/affiliate/resources', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: forceRefresh ? 'no-cache' : 'default'
      });
      
      const data: ResourcesResponse = await response.json();
      
      if (data.success) {
        setResources(data.resources);
        console.log(`✅ Loaded ${data.total} affiliate resources`);
      } else {
        setError(data.error || 'Failed to load resources');
        console.error('❌ Failed to load resources:', data.details);
      }
    } catch (err: any) {
      setError('Failed to connect to resources service');
      console.error('❌ Error loading resources:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load resources on component mount
  useEffect(() => {
    loadResources();
  }, []);

  // Get icon for file type
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'document': return <FileText className="h-5 w-5" />;
      case 'spreadsheet': return <Sheet className="h-5 w-5" />;
      case 'presentation': return <Presentation className="h-5 w-5" />;
      case 'pdf': return <FileText className="h-5 w-5" />;
      case 'image': return <Image className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  // Get badge color for file type using brand colors
  const getFileTypeBadge = (fileType: string) => {
    const colors = {
      'document': 'bg-blue-100 text-blue-800',
      'spreadsheet': 'bg-green-100 text-green-800', 
      'presentation': 'bg-orange-100 text-orange-800',
      'pdf': 'bg-red-100 text-red-800',
      'image': 'bg-purple-100 text-purple-800',
      'video': 'bg-pink-100 text-pink-800',
      'file': 'bg-gray-100 text-gray-800'
    };
    return colors[fileType as keyof typeof colors] || colors['file'];
  };

  // Format file size
  const formatFileSize = (sizeString: string | null) => {
    if (!sizeString) return 'Unknown size';
    const size = parseInt(sizeString);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle preview
  const handlePreview = (resource: AffiliateResource) => {
    setSelectedResource(resource);
    setShowPreview(true);
  };

  // Handle download
  const handleDownload = (resource: AffiliateResource) => {
    window.open(resource.downloadUrl, '_blank');
  };

  // Tutorial navigation
  const nextTutorialStep = () => {
    if (currentTutorialStep < tutorialSteps.length - 1) {
      setCurrentTutorialStep(currentTutorialStep + 1);
    }
  };

  const prevTutorialStep = () => {
    if (currentTutorialStep > 0) {
      setCurrentTutorialStep(currentTutorialStep - 1);
    }
  };

  const resetTutorial = () => {
    setCurrentTutorialStep(0);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Affiliate Resources</h1>
            <p className="text-muted-foreground">
              Access training materials, guides, and promotional resources to boost your affiliate success
            </p>
          </div>
          <Button 
            onClick={() => loadResources(true)} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {/* Tutorial Section - Updated with brand colors */}
        <Card className="border-[#9ac5d9] bg-gradient-to-r from-[#9ac5d9]/10 to-[#b08ba5]/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-[#b08ba5]/20 rounded-full p-2">
                <PlayCircle className="h-5 w-5 text-[#b08ba5]" />
              </div>
              <div>
                <CardTitle className="text-[#b08ba5]">Papers to Profits Affiliate Tutorial</CardTitle>
                <CardDescription className="text-gray-700">
                  Learn how to effectively promote the Papers to Profits course and maximize your affiliate earnings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                New to promoting Papers to Profits? This tutorial will teach you specific strategies for connecting 
                with homeschooling moms and sharing Grace's transformative course effectively.
              </p>
              <div className="flex flex-wrap gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-[#b08ba5] hover:bg-[#b08ba5]/90 text-white"
                      onClick={resetTutorial}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Start Tutorial
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-[#b08ba5] flex items-center gap-2">
                        {tutorialSteps[currentTutorialStep].icon}
                        {tutorialSteps[currentTutorialStep].title}
                      </DialogTitle>
                      <DialogDescription>
                        Step {currentTutorialStep + 1} of {tutorialSteps.length}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-[#b08ba5] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((currentTutorialStep + 1) / tutorialSteps.length) * 100}%` }}
                        />
                      </div>

                      {/* Tutorial content */}
                      <div className="space-y-4">
                        <div className="bg-[#f1b5bc]/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="bg-[#b08ba5]/20 rounded-full p-2">
                              {tutorialSteps[currentTutorialStep].icon}
                            </div>
                            <h3 className="font-semibold text-[#b08ba5]">
                              {tutorialSteps[currentTutorialStep].title}
                            </h3>
                          </div>
                          <ul className="space-y-2">
                            {tutorialSteps[currentTutorialStep].content.map((item, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-[#9ac5d9] mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Navigation buttons */}
                      <div className="flex justify-between items-center pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={prevTutorialStep}
                          disabled={currentTutorialStep === 0}
                          className="border-[#b08ba5] text-[#b08ba5] hover:bg-[#b08ba5]/10"
                        >
                          Previous
                        </Button>
                        
                        <div className="flex gap-2">
                          {tutorialSteps.map((_, index) => (
                            <div
                              key={index}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                index === currentTutorialStep ? 'bg-[#b08ba5]' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>

                        {currentTutorialStep < tutorialSteps.length - 1 ? (
                          <Button
                            onClick={nextTutorialStep}
                            className="bg-[#b08ba5] hover:bg-[#b08ba5]/90 text-white"
                          >
                            Next
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        ) : (
                          <Button
                            onClick={resetTutorial}
                            variant="outline"
                            className="border-[#9ac5d9] text-[#9ac5d9] hover:bg-[#9ac5d9]/10"
                          >
                            Start Over
                          </Button>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-[#9ac5d9] text-[#9ac5d9] hover:bg-[#9ac5d9]/10"
                  disabled
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video Guide (Coming Soon)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Resources Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <Card key={resource.id} className="hover:shadow-lg transition-shadow border-[#f1b5bc]/30 hover:border-[#b08ba5]/50">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* File Header */}
                    <div className="flex items-start gap-3">
                      <div className="bg-[#b08ba5]/10 rounded-lg p-2 flex-shrink-0">
                        {getFileIcon(resource.fileType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight mb-1 truncate" title={resource.name}>
                          {resource.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getFileTypeBadge(resource.fileType)}`}>
                            {resource.fileType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(resource.size)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {resource.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {resource.description}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="text-xs text-muted-foreground">
                      Updated {formatDate(resource.modifiedTime)}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handlePreview(resource)}
                        className="flex-1 bg-[#b08ba5] hover:bg-[#b08ba5]/90 text-white"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownload(resource)}
                        className="border-[#9ac5d9] text-[#9ac5d9] hover:bg-[#9ac5d9]/10"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && resources.length === 0 && (
          <Card className="border-[#f1b5bc]/30">
            <CardContent className="py-16 text-center">
              <BookOpen className="h-12 w-12 text-[#b08ba5] mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Resources Available</h3>
              <p className="text-muted-foreground mb-4">
                We're working on adding helpful resources for our affiliates. Check back soon!
              </p>
              <Button 
                onClick={() => loadResources(true)} 
                variant="outline"
                className="border-[#b08ba5] text-[#b08ba5] hover:bg-[#b08ba5]/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Preview Modal */}
        {showPreview && selectedResource && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">{selectedResource.name}</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPreview(false)}
                  className="border-[#b08ba5] text-[#b08ba5] hover:bg-[#b08ba5]/10"
                >
                  Close
                </Button>
              </div>
              <div className="p-4">
                <GoogleDriveViewer
                  fileId={selectedResource.id}
                  fileName={selectedResource.name}
                  fileType={selectedResource.fileType}
                  height="500px"
                  onDownloadClick={() => handleDownload(selectedResource)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 