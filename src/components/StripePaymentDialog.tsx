import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { CreditCard, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe with the provided publishable key
const stripePromise = loadStripe('pk_live_51SfKw9RhRCvX7WF9KIZ6tSuxZc5GrcFBgSAxW24qJyLZmie29SPWXvPuQ5Ow3oVCtHvBOdnSMIP0bDBSLmgmMAmC00PXm94b1A');

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profile: any;
}

interface PaymentFormProps {
  onSuccess: () => void;
  onClose: () => void;
  profile: any;
}

// Card styling for Stripe CardElement
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
  hidePostalCode: true,
};

function PaymentForm({ onSuccess, onClose, profile }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phoneNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!formData.name || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create payment method
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: formData.name,
          email: formData.email,
          phone: formData.phoneNumber || undefined,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // In a real application, you would send paymentMethod.id to your backend
      // which would then create a payment intent and process the payment
      // For this demo, we'll simulate a successful payment after a short delay
      
      console.log('Payment Method Created:', paymentMethod);
      
      // Simulate server processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Process payment through API
      await api.processPayment({
        userId: profile.id,
        amount: 50,
        paymentMethod: 'card',
        paymentMethodId: paymentMethod.id,
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        referenceNumber: paymentMethod.id,
      });

      // Success!
      onSuccess();
    } catch (err: any) {
      console.error('Payment failed:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
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
            <p>✓ Valid for 4 months (1 semester)</p>
            <p>✓ UTM certificate upon level completion</p>
            <p className="text-orange-600 font-medium mt-2">💡 Pass assessments (60%+) to level up!</p>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
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
              required
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
              required
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
      </div>

      {/* Card Details */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Card Details</Label>
        <div className="border rounded-lg p-4 bg-white">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Your card details are encrypted and secure. We use Stripe for payment processing.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Payment Error</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={processing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={processing || !stripe || !formData.name || !formData.email}
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
    </form>
  );
}

export function StripePaymentDialog({ open, onClose, onSuccess, profile }: PaymentDialogProps) {
  const [success, setSuccess] = useState(false);

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      onSuccess();
      onClose();
      // Reset success state after closing
      setTimeout(() => setSuccess(false), 300);
    }, 2000);
  };

  const handleClose = () => {
    if (!success) {
      onClose();
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

        <Elements stripe={stripePromise}>
          <PaymentForm onSuccess={handleSuccess} onClose={handleClose} profile={profile} />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}