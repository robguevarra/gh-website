'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, CheckCircle, Send, TestTube } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface MigrationResponse {
  message: string
  templateId: string
  batchSize: number
  successCount: number
  errorCount: number
  startFrom: number
  nextStartFrom: number
  hasMore: boolean
  errors?: string[]
}

export function TemplateMigration() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<MigrationResponse[]>([])
  const [totalProcessed, setTotalProcessed] = useState(0)
  const [totalSuccess, setTotalSuccess] = useState(0)
  const [totalErrors, setTotalErrors] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [isTestMode, setIsTestMode] = useState(false)
  const [testEmails, setTestEmails] = useState('')

  const runMigrationBatch = async (startFrom: number = 0): Promise<MigrationResponse> => {
    const requestBody: any = {
      templateId: '3b292bfd-bec2-42ac-aa2c-97d3edd3501d',
      batchSize: 50,
      startFrom
    }

    // If in test mode, add test emails
    if (isTestMode && testEmails.trim()) {
      const emailList = testEmails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)
      requestBody.testEmails = emailList
    }

    const response = await fetch('/api/admin/campaigns/send-template-migration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Migration failed')
    }

    return await response.json()
  }

  const handleStartMigration = async () => {
    setIsRunning(true)
    setResults([])
    setTotalProcessed(0)
    setTotalSuccess(0)
    setTotalErrors(0)
    setIsComplete(false)

    try {
      let startFrom = 0
      let hasMore = true
      const batchResults: MigrationResponse[] = []

      while (hasMore) {
        console.log(`🚀 Processing batch starting from ${startFrom}`)
        
        const batchResult = await runMigrationBatch(startFrom)
        batchResults.push(batchResult)
        setResults([...batchResults])

        // Update totals
        setTotalProcessed(prev => prev + batchResult.batchSize)
        setTotalSuccess(prev => prev + batchResult.successCount)
        setTotalErrors(prev => prev + batchResult.errorCount)

        // In test mode, we only run once
        if (isTestMode) {
          hasMore = false
        } else {
          hasMore = batchResult.hasMore
          startFrom = batchResult.nextStartFrom

          // Small delay between batches to avoid overwhelming the server
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      setIsComplete(true)
      console.log('✅ Migration completed successfully')

    } catch (error) {
      console.error('❌ Migration failed:', error)
      // Add error to results for display
      setResults(prev => [...prev, {
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        templateId: '3b292bfd-bec2-42ac-aa2c-97d3edd3501d',
        batchSize: 0,
        successCount: 0,
        errorCount: 1,
        startFrom: 0,
        nextStartFrom: 0,
        hasMore: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }])
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Template Migration Tool
        </CardTitle>
        <CardDescription>
          Send the "New Website Launch" template to all users with proper magic links.
          This is a one-time migration to fix the campaign magic link issue.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Test Mode Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="test-mode" 
                  checked={isTestMode}
                  onCheckedChange={setIsTestMode}
                />
                <Label htmlFor="test-mode" className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Test Mode (Send to specific emails only)
                </Label>
              </div>
              
              {isTestMode && (
                <div className="space-y-2">
                  <Label htmlFor="test-emails">Test Email Addresses</Label>
                  <Textarea
                    id="test-emails"
                    placeholder="Enter email addresses separated by commas&#10;Example: robneil@gmail.com, test@example.com"
                    value={testEmails}
                    onChange={(e) => setTestEmails(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Separate multiple email addresses with commas. Only users with these emails will receive the migration.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex gap-4">
          <Button 
            onClick={handleStartMigration} 
            disabled={isRunning || (isTestMode && !testEmails.trim())}
            className="min-w-[200px]"
          >
            {isRunning ? 
              (isTestMode ? 'Testing...' : 'Migration Running...') : 
              (isTestMode ? 'Start Test' : 'Start Migration')
            }
          </Button>
          
          {isComplete && (
            <div className="flex items-center text-green-600 gap-2">
              <CheckCircle className="h-5 w-5" />
              {isTestMode ? 'Test Complete' : 'Migration Complete'}
            </div>
          )}
        </div>

        {/* Progress Summary */}
        {totalProcessed > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{totalProcessed} users processed</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-green-600">
                    ✅ Successful: {totalSuccess}
                  </div>
                  <div className="text-red-600">
                    ❌ Errors: {totalErrors}
                  </div>
                </div>
                {!isComplete && isRunning && (
                  <div className="text-xs text-muted-foreground">
                    Processing in batches of 50 users...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Batch Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Batch Results</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                                         <div className="flex items-center justify-between">
                       <div>
                         <div className="font-medium">
                           Batch {index + 1}: Users {result.startFrom} - {result.startFrom + Math.max(0, result.batchSize - 1)}
                         </div>
                         <div className="text-sm text-muted-foreground">
                           ✅ {result.successCount} sent, ❌ {result.errorCount} failed
                         </div>
                       </div>
                       <div className="text-right text-sm">
                         {result.batchSize > 0 ? Math.round((result.successCount / result.batchSize) * 100) : 0}% success rate
                       </div>
                     </div>
                    
                    {result.errors && result.errors.length > 0 && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="text-sm">
                            <strong>Errors in this batch:</strong>
                            <ul className="list-disc list-inside mt-1">
                              {result.errors.slice(0, 3).map((error, i) => (
                                <li key={i} className="text-xs">{error}</li>
                              ))}
                              {result.errors.length > 3 && (
                                <li className="text-xs">... and {result.errors.length - 3} more errors</li>
                              )}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Template Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm space-y-1">
              <div><strong>Template:</strong> New Website Launch</div>
              <div><strong>Template ID:</strong> 3b292bfd-bec2-42ac-aa2c-97d3edd3501d</div>
              <div><strong>Target:</strong> All non-bounced users (~3,666 users)</div>
              <div><strong>Batch Size:</strong> 50 users per batch</div>
              <div><strong>Features:</strong> Magic link generation, customer classification, proper template substitution</div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
} 