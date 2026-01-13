import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { QrCode, Camera, X } from 'lucide-react';

interface CheckInDialogProps {
  onClose: () => void;
  onCheckIn: (code: string) => Promise<void>;
}

export function CheckInDialog({ onClose, onCheckIn }: CheckInDialogProps) {
  const [sessionCode, setSessionCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmitWithCode = async (code: string) => {
    setError('');
    setLoading(true);
    
    try {
      await onCheckIn(code);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmitWithCode(sessionCode.toUpperCase());
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Check-In
          </DialogTitle>
          <DialogDescription>
            Scan the QR code or enter the session code displayed by your tutor/committee
          </DialogDescription>
        </DialogHeader>
        
        {success ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl mb-2">Check-in Successful!</h3>
            <p className="text-gray-600">Your attendance has been recorded</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-code">Session Code</Label>
              <Input
                id="session-code"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                placeholder="Enter 6-character code"
                maxLength={6}
                className="text-center uppercase text-lg tracking-wider"
                required
              />
              <p className="text-xs text-gray-500">
                Enter the 6-character code displayed by the tutor/committee
              </p>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded text-sm">
                {error}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || sessionCode.length !== 6} className="flex-1">
                {loading ? 'Checking in...' : 'Check-In'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
