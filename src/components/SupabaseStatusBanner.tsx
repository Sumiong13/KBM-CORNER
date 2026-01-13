import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Database, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { createClient } from '../utils/supabase/client';

const supabase = createClient();

export function SupabaseStatusBanner() {
  const [isChecking, setIsChecking] = useState(true);
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    checkSupabaseStatus();
    
    // Check if user previously dismissed the banner
    const dismissed = localStorage.getItem('supabase_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const checkSupabaseStatus = async () => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      setIsSupabaseReady(!error || error.code !== 'PGRST205');
    } catch (err) {
      setIsSupabaseReady(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('supabase_banner_dismissed', 'true');
  };

  if (isChecking || isDismissed) return null;

  if (isSupabaseReady) {
    return (
      <Alert className="border-green-200 bg-green-50 mb-4">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">✅ Cross-Device Sync Enabled</AlertTitle>
        <AlertDescription className="text-green-700">
          Your data is now syncing across all devices via Supabase database.
        </AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    );
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50 mb-4">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">⚠️ Using Local Storage Only</AlertTitle>
      <AlertDescription className="text-yellow-700 space-y-2">
        <p>Your data is currently stored locally on this device only. To enable cross-device sync:</p>
        <ol className="list-decimal list-inside text-sm space-y-1 mt-2">
          <li>Open your Supabase Dashboard</li>
          <li>Go to SQL Editor</li>
          <li>Run the SQL from <code className="bg-yellow-100 px-1 rounded">/supabase_schema.sql</code></li>
          <li>Refresh this page</li>
        </ol>
        <p className="text-xs mt-2">
          See <code className="bg-yellow-100 px-1 rounded">/SUPABASE_MIGRATION_GUIDE.md</code> for details.
        </p>
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
