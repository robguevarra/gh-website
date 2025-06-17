'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  TrendingUp,
  DollarSign,
  Target,
  FileBarChart,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { exportAnalyticsReport } from '@/lib/actions/admin/analytics-actions';

interface ReportType {
  id: 'performance' | 'financial' | 'conversions';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
}

export default function ReportGenerator() {
  const [loadingReports, setLoadingReports] = useState<Set<string>>(new Set());

  const reportTypes: ReportType[] = [
    {
      id: "performance",
      title: "Affiliate Performance Report",
      description: "Comprehensive affiliate performance metrics and KPIs including top performers and conversion rates",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "from-[#b08ba5] to-[#f1b5bc]",
      available: true
    },
    {
      id: "financial",
      title: "Financial Analysis Report", 
      description: "Revenue, commissions, financial health indicators, and ROI analysis across all affiliates",
      icon: <DollarSign className="h-5 w-5" />,
      color: "from-[#f1b5bc] to-[#9ac5d9]",
      available: true
    },
    {
      id: "conversions",
      title: "Conversion Analytics Report",
      description: "Detailed conversion tracking, optimization insights, and affiliate performance analysis", 
      icon: <Target className="h-5 w-5" />,
      color: "from-[#9ac5d9] to-[#b08ba5]",
      available: true
    }
  ];

  /**
   * Handle report generation and download
   */
  const handleGenerateReport = async (reportType: ReportType['id'], format: 'csv' | 'json' = 'csv') => {
    const reportKey = `${reportType}-${format}`;
    
    // Prevent multiple simultaneous downloads
    if (loadingReports.has(reportKey)) {
      return;
    }

    setLoadingReports(prev => new Set(prev).add(reportKey));

    try {
      // Show loading toast
      toast.loading(`Generating ${reportType} report...`, {
        id: reportKey,
        description: 'This may take a moment while we compile your data'
      });

      // Generate the report
      const result = await exportAnalyticsReport({
        reportType,
        format
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Create download
      const blob = new Blob([result.data!], { 
        type: result.contentType 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Success toast
      toast.success(`Report generated successfully!`, {
        id: reportKey,
        description: `Downloaded as ${result.filename}`
      });

    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report', {
        id: reportKey,
        description: error instanceof Error ? error.message : 'Please try again later'
      });
    } finally {
      setLoadingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportKey);
        return newSet;
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reportTypes.map((report) => {
        const isLoadingCSV = loadingReports.has(`${report.id}-csv`);
        const isLoadingJSON = loadingReports.has(`${report.id}-json`);
        const isLoading = isLoadingCSV || isLoadingJSON;

        return (
          <Card key={report.id} className="border-[#e9e0d8] bg-white shadow-sm hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="pb-4">
              <div className={`h-12 w-12 bg-gradient-to-br ${report.color} rounded-xl flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform duration-300`}>
                {report.icon}
              </div>
              <CardTitle className="text-lg font-medium text-[#5d4037] flex items-center justify-between">
                {report.title}
                {report.available ? (
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-500 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Soon
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-[#6f5c51] leading-relaxed">
                {report.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.available ? (
                <div className="space-y-2">
                  {/* CSV Download Button */}
                  <Button 
                    className="w-full bg-gradient-to-r from-[#b08ba5] to-[#f1b5bc] hover:from-[#b08ba5]/90 hover:to-[#f1b5bc]/90 text-white transition-all duration-200"
                    disabled={isLoading}
                    onClick={() => handleGenerateReport(report.id, 'csv')}
                  >
                    {isLoadingCSV ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {isLoadingCSV ? 'Generating CSV...' : 'Download CSV'}
                  </Button>

                  {/* JSON Download Button */}
                  <Button 
                    variant="outline"
                    className="w-full border-[#b08ba5] text-[#b08ba5] hover:bg-[#b08ba5] hover:text-white transition-all duration-200"
                    disabled={isLoading}
                    onClick={() => handleGenerateReport(report.id, 'json')}
                  >
                    {isLoadingJSON ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileBarChart className="h-4 w-4 mr-2" />
                    )}
                    {isLoadingJSON ? 'Generating JSON...' : 'Download JSON'}
                  </Button>
                </div>
              ) : (
                <Button 
                  className="w-full bg-gray-100 text-gray-400 cursor-not-allowed transition-all duration-200"
                  disabled
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Coming Soon
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Additional Info Card */}
      <Card className="border-[#e9e0d8] bg-gradient-to-br from-[#f9f6f2] to-white shadow-sm md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-[#5d4037] flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-[#b08ba5]" />
            Report Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-[#5d4037]">📊 CSV Reports</h4>
              <p className="text-[#6f5c51] leading-relaxed">
                Perfect for spreadsheet analysis, data manipulation, and sharing with stakeholders. 
                Includes formatted tables with headers and calculated metrics.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-[#5d4037]">🔧 JSON Reports</h4>
              <p className="text-[#6f5c51] leading-relaxed">
                Structured data format ideal for developers, API integrations, and custom analysis tools. 
                Contains complete metadata and nested data structures.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-[#5d4037]">⚡ Real-Time Data</h4>
              <p className="text-[#6f5c51] leading-relaxed">
                All reports are generated with the latest data from your affiliate program, 
                ensuring accuracy and up-to-date insights for decision making.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 