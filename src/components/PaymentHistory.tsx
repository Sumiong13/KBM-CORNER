import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CreditCard, Calendar, CheckCircle2, Download } from 'lucide-react';
import { Button } from './ui/button';
import { createClient } from '../utils/supabase/client';

interface PaymentHistoryProps {
  userId: string;
}

export function PaymentHistory({ userId }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadPayments();
    }
  }, [userId]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('PaymentHistory: Loading payments for user:', userId);
      
      // Try to load from localStorage first
      const storedPayments = localStorage.getItem(`payments_${userId}`);
      if (storedPayments) {
        const payments = JSON.parse(storedPayments);
        console.log('PaymentHistory: Loaded from localStorage:', payments);
        setPayments(payments);
        setLoading(false);
        return;
      }
      
      // If no localStorage data, try Supabase
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('paid_at', { ascending: false });
      
      if (queryError) {
        // If table doesn't exist, just show empty state
        if (queryError.code === 'PGRST205') {
          console.log('PaymentHistory: Payments table not found, using empty state');
          setPayments([]);
          setLoading(false);
          return;
        }
        throw queryError;
      }
      
      console.log('PaymentHistory: Received data:', data);
      setPayments(data || []);
    } catch (error: any) {
      console.error('PaymentHistory: Failed to load payments:', error);
      
      // Don't show error for missing table, just empty state
      if (error.code === 'PGRST205') {
        setPayments([]);
      } else {
        setError(error.message || 'Failed to load payment history.');
        setPayments([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodDisplay = (method: string) => {
    const methods: Record<string, string> = {
      'online-banking': 'Online Banking',
      'ewallet': 'E-Wallet',
      'card': 'Credit/Debit Card'
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Loading payment history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment History
        </CardTitle>
        <CardDescription>
          Your membership payment transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600 mb-2">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPayments}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        ) : payments.length > 0 ? (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <p className="font-medium">RM {payment.amount}.00</p>
                      <Badge variant="outline" className="text-xs">
                        Level {payment.level}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {formatDate(payment.paid_at || payment.paidAt)}
                      </p>
                      <p>
                        <span className="text-gray-500">Method:</span>{' '}
                        {getPaymentMethodDisplay(payment.payment_method || payment.paymentMethod)}
                      </p>
                      {(payment.reference_number || payment.referenceNumber) && (
                        <p className="text-xs text-gray-500">
                          Ref: {payment.reference_number || payment.referenceNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {payment.status === 'completed' ? 'Paid' : payment.status}
                  </Badge>
                </div>

                {/* Optional: Add download receipt button */}
                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      // In production, this would generate a PDF receipt
                      alert('Receipt download would be available in production');
                    }}
                  >
                    <Download className="w-3 h-3 mr-2" />
                    Download Receipt
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600 mb-1">No payment history</p>
            <p className="text-sm text-gray-500">
              Your payment transactions will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}