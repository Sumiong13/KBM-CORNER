import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { QrCode, Download } from 'lucide-react';

interface QRCodeGeneratorProps {
  event: any;
  onClose: () => void;
}

export function QRCodeGenerator({ event, onClose }: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (!event?.sessionCode) return;

    // Generate QR code URL using API
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(event.sessionCode)}&color=dc2626&bgcolor=ffffff`;
    setQrCodeUrl(url);
  }, [event?.sessionCode]);

  const handleDownload = async () => {
    if (!qrCodeUrl || !event?.sessionCode) return;
    
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qr-code-${event.sessionCode}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Event QR Code
          </DialogTitle>
          <DialogDescription>
            Display this QR code for students to scan and check in
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{event?.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center bg-white p-6 rounded-lg border-2 border-gray-200">
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-[300px] h-[300px]"
                  />
                ) : (
                  <div className="w-[300px] h-[300px] flex items-center justify-center text-gray-400">
                    Generating QR Code...
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-2xl font-mono tracking-wider bg-red-50 text-red-600 py-3 px-4 rounded-lg">
                  {event?.sessionCode}
                </div>
                <p className="text-xs text-gray-500">
                  Students can scan the QR code or enter this code manually
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
