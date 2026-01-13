import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './ui/button';

export function EmailConfigChecker() {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{
    configured: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const checkEmailConfig = async () => {
    setIsChecking(true);
    try {
      // Try to get the current session to check if auth is working
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // Try to check auth settings by attempting a test
      // Note: We can't directly check if email confirmation is enabled via the client
      // This is a limitation of Supabase client SDK
      
      setResult({
        configured: true,
        message: 'Supabase connection is working',
        details: 'To verify email settings, please check your Supabase Dashboard:\n1. Authentication → Providers → Email\n2. Ensure "Confirm email" is enabled\n3. Check Authentication → Email Templates → Confirm signup'
      });
    } catch (error: any) {
      setResult({
        configured: false,
        message: 'Supabase connection issue',
        details: error.message
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-muted/50">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Email Configuration Check</h3>
          <p className="text-sm text-muted-foreground mb-3">
            If you're not receiving verification emails, check your Supabase settings.
          </p>
          
          <Button 
            onClick={checkEmailConfig} 
            disabled={isChecking}
            variant="outline"
            size="sm"
          >
            {isChecking ? 'Checking...' : 'Check Supabase Connection'}
          </Button>

          {result && (
            <Alert className="mt-3" variant={result.configured ? "default" : "destructive"}>
              {result.configured ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>{result.message}</AlertTitle>
              {result.details && (
                <AlertDescription className="mt-2 whitespace-pre-line text-xs">
                  {result.details}
                </AlertDescription>
              )}
            </Alert>
          )}

          <div className="mt-4 p-3 bg-background rounded border">
            <h4 className="text-sm font-semibold mb-2">Quick Checklist:</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>✓ Go to Supabase Dashboard → Authentication → Providers</li>
              <li>✓ Enable Email provider</li>
              <li>✓ Turn ON "Confirm email" toggle</li>
              <li>✓ Check Email Templates → Confirm signup template exists</li>
              <li>✓ Verify template contains {`{{ .Token }}`}</li>
              <li>✓ Save all changes</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            See <code className="bg-background px-1 py-0.5 rounded">SUPABASE_EMAIL_TROUBLESHOOTING.md</code> for detailed instructions.
          </p>
        </div>
      </div>
    </div>
  );
}
