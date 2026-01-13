import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Card, CardContent } from './ui/card';
import { CreditCard, Smartphone, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profile: any;
}

export function PaymentDialog({ open, onClose, onSuccess, profile }: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState('online-banking');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phoneNumber: '',
    referenceNumber: ''
  });

  const handlePayment = async () => {
    if (!formData.name || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Process payment through API
      try {
        await api.processPayment({
          userId: profile.id,
          amount: 50,
          paymentMethod,
          ...formData
        });

        setSuccess(true);
        
        // Wait a bit to show success message
        setTimeout(() => {
          onSuccess();
          onClose();
          resetForm();
        }, 2000);
      } catch (paymentError: any) {
        console.error('Payment API error:', paymentError);
        
        // If it's a user not found error, show a helpful message
        if (paymentError.message?.includes('User not found')) {
          alert('Your account profile needs to be set up. Please log out and log back in, then try again.');
        } else {
          alert(`Payment processing failed: ${paymentError.message || 'Please try again.'}`);
        }
        setProcessing(false);
      }
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment processing failed. Please try again.');
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('online-banking');
    setProcessing(false);
    setSuccess(false);
    setFormData({
      name: profile?.name || '',
      email: profile?.email || '',
      phoneNumber: '',
      referenceNumber: ''
    });
  };

  const handleClose = () => {
    if (!processing) {
      onClose();
      setTimeout(resetForm, 300);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
            <p className="text-gray-600 mb-4">
              Your membership has been activated for the current semester.
            </p>
            <p className="text-sm text-gray-500">
              You will be redirected shortly...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Membership Payment</DialogTitle>
          <DialogDescription>
            Complete your payment of RM50 to activate your membership
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Summary */}
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Membership Fee</p>
                  <p className="text-3xl font-bold text-red-700">RM 50.00</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-semibold">1 Semester (4 months)</p>
                </div>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>✓ Access to all club events and activities</p>
                <p>✓ Progress to Level {profile?.level ? profile.level + 1 : 2}</p>
                <p>✓ UTM certificate upon completion</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Select Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="online-banking" id="online-banking" />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Online Banking</p>
                      <p className="text-sm text-gray-500">FPX / Bank Transfer</p>
                    </div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="ewallet" id="ewallet" />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">E-Wallet</p>
                      <p className="text-sm text-gray-500">Touch 'n Go / GrabPay / Boost</p>
                    </div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="card" id="card" />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Credit/Debit Card</p>
                      <p className="text-sm text-gray-500">Visa / Mastercard</p>
                    </div>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Payment Details Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your full name"
                  disabled={processing}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  disabled={processing}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+60 12-345 6789"
                disabled={processing}
              />
            </div>

            {paymentMethod === 'online-banking' && (
              <div>
                <Label htmlFor="reference">Reference Number (Optional)</Label>
                <Input
                  id="reference"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="Transaction reference number"
                  disabled={processing}
                />
              </div>
            )}
          </div>

          {/* Important Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Note:</span> This is a prototype payment system. 
              In a production environment, this would integrate with a secure payment gateway 
              like Stripe, PayPal, or local providers like iPay88 or Senangpay.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={processing || !formData.name || !formData.email}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay RM 50.00
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
