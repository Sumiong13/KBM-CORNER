import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Mail, AlertCircle, Info } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';

interface EmailVerificationDialogProps {
  open: boolean;
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onCancel: () => void;
}

export function EmailVerificationDialog({
  open,
  email,
  onVerify,
  onResend,
  onCancel,
}: EmailVerificationDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showDevBypass, setShowDevBypass] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter a complete 6-digit code');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await onVerify(code);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your code and try again.');
      
      // After 2 failed attempts, show development bypass option
      if (err.message?.includes('expired') || err.message?.includes('invalid')) {
        setShowDevBypass(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResendSuccess(false);
    setResendLoading(true);
    setShowDevBypass(false); // Hide bypass when resending
    try {
      await onResend();
      setResendSuccess(true);
      setCode('');
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleDevBypass = () => {
    // For development: skip email verification
    console.log('═══════════════════════════════════════════════════════════');
    console.log('⚠️ DEVELOPMENT BYPASS USED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Email verification skipped for development purposes.');
    console.log('In production, ensure Supabase email is properly configured.');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Close dialog and call cancel (user will need to try another method)
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <DialogTitle className="text-center">Verify Your Email</DialogTitle>
          <DialogDescription className="text-center">
            We've sent a 6-digit verification code to
            <br />
            <span className="font-medium text-gray-900">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="verification-code" className="text-center block">
              Enter Verification Code
            </Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  setError('');
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {resendSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                Verification code resent successfully! Please check your email.
              </AlertDescription>
            </Alert>
          )}

          {showDevBypass && (
            <Alert className="border-orange-200 bg-orange-50">
              <Info className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <p className="font-semibold mb-2">Email Verification Issue</p>
                <p className="text-sm mb-2">
                  Supabase email may not be configured. To use email verification in production:
                </p>
                <ol className="text-sm list-decimal list-inside space-y-1">
                  <li>Go to Supabase Dashboard → Authentication → Email Templates</li>
                  <li>Configure SMTP settings for email delivery</li>
                  <li>OR disable email confirmation for development</li>
                </ol>
                <p className="text-xs mt-2 text-gray-600">
                  See SUPABASE_EMAIL_TROUBLESHOOTING.md for help
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleVerify}
              className="w-full"
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
              <Button
                variant="outline"
                onClick={handleResend}
                className="w-full"
                disabled={resendLoading}
              >
                {resendLoading ? 'Resending...' : 'Resend Code'}
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={onCancel}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>

        <div className="text-xs text-center text-gray-500 border-t pt-4">
          <p className="font-semibold text-gray-700 mb-2">Email not arriving?</p>
          <p>• Check spam/junk folder</p>
          <p>• Wait 1-2 minutes for delivery</p>
          <p>• Ensure Supabase email is configured</p>
          <p className="mt-2">• Go to Supabase → Project Settings → Auth</p>
          <p className="mt-3 text-gray-400">Code expires in 60 minutes</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}