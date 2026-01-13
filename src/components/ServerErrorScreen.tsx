import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, RefreshCw, Server, ExternalLink } from 'lucide-react';
import clubLogo from 'figma:asset/ade13b6fb51eb9b3ff7200cf4269cebe703dd1ea.png';

interface ServerErrorScreenProps {
  onRetry: () => void;
}

export function ServerErrorScreen({ onRetry }: ServerErrorScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Logo and Title */}
        <div className="text-center">
          <img src={clubLogo} alt="UTM Mandarin Club" className="w-20 h-20 object-contain mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">UTM Mandarin Club</h1>
          <p className="text-gray-600">Application Management System</p>
        </div>

        {/* Error Alert */}
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg">Backend Server Not Responding</AlertTitle>
          <AlertDescription className="mt-2">
            The application backend is currently unavailable. This usually means the Supabase Edge Function hasn't been deployed yet.
          </AlertDescription>
        </Alert>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Deployment Required
            </CardTitle>
            <CardDescription>
              Follow these steps to get the application running
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium">Deploy the Supabase Edge Function</p>
                  <p className="text-sm text-gray-600">
                    The backend server needs to be deployed to your Supabase project
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium">Use Supabase CLI or Dashboard</p>
                  <p className="text-sm text-gray-600">
                    Deploy via <code className="bg-gray-100 px-1 rounded">supabase functions deploy</code> or the Supabase Dashboard
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium">Refresh the page</p>
                  <p className="text-sm text-gray-600">
                    Once deployed, click the retry button below or refresh your browser
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Quick Links:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://supabase.com/docs/guides/functions', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Supabase Docs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://supabase.com/dashboard/project/nyujnmbcdgfiifkkpbze/functions`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Supabase Dashboard
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-1">📘 Deployment Guide</p>
              <p className="text-sm text-blue-700">
                Check the <code className="bg-blue-100 px-1 rounded">DEPLOYMENT_GUIDE.md</code> file in your project for detailed instructions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Retry Button */}
        <div className="flex justify-center">
          <Button onClick={onRetry} size="lg" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </Button>
        </div>

        {/* Technical Details */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-sm">Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs font-mono text-gray-600">
            <p><span className="text-gray-500">Endpoint:</span> https://nyujnmbcdgfiifkkpbze.supabase.co/functions/v1/make-server-12e720fa</p>
            <p><span className="text-gray-500">Function:</span> make-server-12e720fa</p>
            <p><span className="text-gray-500">Status:</span> <span className="text-red-600">Not Deployed</span></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
