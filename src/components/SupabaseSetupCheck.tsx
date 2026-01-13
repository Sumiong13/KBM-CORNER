import { useState, useEffect } from 'react';
import { checkSupabaseSetup } from '../lib/supabaseStorage';
import { Database, AlertTriangle, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function SupabaseSetupCheck({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      // Force a fresh check (don't use cached result)
      const ready = await checkSupabaseSetup(true);
      setIsReady(ready);
      setIsChecking(false);
      
      if (!ready) {
        console.log('🔧 Supabase database setup required');
        console.log('📖 Follow the instructions shown on screen to enable cross-device sync');
      } else {
        console.log('✅ Supabase connected - all data syncs across devices!');
      }
    } catch (err: any) {
      console.error('Setup check error:', err);
      setError(err.message || 'Failed to check database setup');
      setIsChecking(false);
      setIsReady(false);
    }
  };

  const copySQL = async () => {
    const message = 'Open /supabase_schema.sql in your project and copy all the SQL code from that file.';
    
    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(message);
      alert('Tip copied! Now open /supabase_schema.sql in your project and copy the SQL code.');
    } catch (err) {
      // Fallback for browsers/contexts where clipboard API is blocked
      console.log('Clipboard API blocked, using fallback');
      
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = message;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      
      try {
        textarea.select();
        document.execCommand('copy');
        alert('Tip copied! Now open /supabase_schema.sql in your project and copy the SQL code.');
      } catch (fallbackErr) {
        // If even fallback fails, just show the message
        alert('Note: Open /supabase_schema.sql in your project and copy all the SQL code from that file.');
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <Database className="h-16 w-16 mx-auto mb-4 text-red-600 animate-pulse" />
          <p className="text-gray-600">Checking database connection...</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="max-w-2xl w-full border-red-200 shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Database Setup Required</CardTitle>
            <CardDescription>
              Welcome to UTM Mandarin Club! To enable cross-device data sync, please set up Supabase database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!showInstructions ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Why is this needed?
                  </h3>
                  <p className="text-blue-800 text-sm">
                    Supabase database allows your data (events, attendance, users) to sync across all devices. 
                    Without it, data only exists on this browser.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600">This is a one-time setup that takes about 5 minutes.</p>
                  <Button 
                    onClick={() => setShowInstructions(true)}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Show Setup Instructions
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold text-gray-900">Quick Setup (3 Steps)</h3>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-semibold">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Open Supabase SQL Editor</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Go to your Supabase Dashboard → SQL Editor
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Supabase Dashboard
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-semibold">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Run the SQL Schema</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Copy all SQL from <code className="bg-gray-100 px-1 rounded">/supabase_schema.sql</code> and paste it in the SQL Editor, then click "Run"
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={copySQL}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Instructions
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-semibold">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Refresh This Page</p>
                        <p className="text-sm text-gray-600 mt-1">
                          After running the SQL, refresh this page to verify the setup
                        </p>
                        <Button
                          variant="default"
                          size="sm"
                          className="mt-2 bg-green-600 hover:bg-green-700"
                          onClick={() => window.location.reload()}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          I've Run the SQL - Refresh Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Need help?</strong> Check <code className="bg-yellow-100 px-1 rounded">/SETUP_SUPABASE.md</code> for detailed step-by-step instructions with screenshots.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Supabase is ready - render the app
  return <>{children}</>;
}