import { CreditCard } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface PaymentButtonProps {
  profile: any;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'compact' | 'card';
  showStatus?: boolean;
  className?: string;
}

export function PaymentButton({ 
  profile, 
  onClick, 
  variant = 'default',
  showStatus = false,
  className = ''
}: PaymentButtonProps) {
  if (!profile) return null;

  // Debug: Log profile data
  console.log('PaymentButton - Profile:', profile);
  console.log('PaymentButton - membershipExpiry:', profile.membershipExpiry);
  
  // Handle missing or invalid membershipExpiry
  const membershipExpiry = profile.membershipExpiry || profile.membership_expiry;
  if (!membershipExpiry) {
    // If no expiry date, treat as expired
    console.log('PaymentButton - No expiry date found, treating as expired');
  }
  
  const expiryDate = membershipExpiry ? new Date(membershipExpiry) : new Date(Date.now() - 1); // Default to expired
  const isExpired = expiryDate < new Date();
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  console.log('PaymentButton - isExpired:', isExpired, 'daysUntilExpiry:', daysUntilExpiry, 'variant:', variant);

  // Compact variant (for headers)
  if (variant === 'compact') {
    if (isExpired || daysUntilExpiry <= 30) {
      return (
        <Button 
          size="sm" 
          onClick={onClick}
          className={`${isExpired ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-yellow-600 hover:bg-yellow-700'} ${className}`}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {isExpired ? 'Activate' : 'Renew'} (RM50)
        </Button>
      );
    }
    return null;
  }

  // Card variant (for prominent display)
  if (variant === 'card') {
    const showPaymentPrompt = isExpired || daysUntilExpiry <= 30 || profile.level < 5;
    if (!showPaymentPrompt) return null;

    return (
      <div className={`
        border-2 rounded-lg p-6
        ${isExpired 
          ? 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50' 
          : daysUntilExpiry <= 30
          ? 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-amber-50'
          : 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50'
        }
        ${className}
      `}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              isExpired 
                ? 'bg-red-500' 
                : daysUntilExpiry <= 30
                ? 'bg-yellow-500'
                : 'bg-blue-500'
            }`}>
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">
                {isExpired 
                  ? '🔴 Membership Expired - Activate Now' 
                  : daysUntilExpiry <= 30
                  ? '⚠️ Membership Expiring Soon'
                  : '🎓 Ready to Advance Your Level'}
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                {isExpired 
                  ? 'Your membership has expired. Reactivate now to continue attending events and accessing club benefits.' 
                  : daysUntilExpiry <= 30
                  ? `Your membership expires in ${daysUntilExpiry} days. Renew now to maintain your access and advance to Level ${profile.level + 1}.`
                  : `Advance to Level ${profile.level + 1} by paying RM50 and extend your membership for another semester.`}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  ✓ 4 months membership extension
                </span>
                {profile.level < 5 && (
                  <span className="flex items-center gap-1">
                    ✓ Advance to Level {profile.level + 1}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  ✓ Access to all events
                </span>
                <span className="flex items-center gap-1">
                  ✓ UTM certificate eligibility
                </span>
              </div>
            </div>
          </div>
          <Button 
            size="lg"
            onClick={onClick}
            className={`flex-shrink-0 ${
              isExpired 
                ? 'bg-red-600 hover:bg-red-700' 
                : daysUntilExpiry <= 30
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Pay RM 50.00
          </Button>
        </div>
      </div>
    );
  }

  // Default/Outline/Ghost variants
  const needsPayment = isExpired || daysUntilExpiry <= 30;
  
  if (!needsPayment && !showStatus) return null;

  const getButtonText = () => {
    if (isExpired) return 'Activate Membership (RM50)';
    if (daysUntilExpiry <= 30) return 'Renew Membership (RM50)';
    return 'Pay RM50 - Advance Level';
  };

  const getButtonClass = () => {
    if (isExpired) return 'bg-red-600 hover:bg-red-700';
    if (daysUntilExpiry <= 30) return 'bg-yellow-600 hover:bg-yellow-700';
    return 'bg-blue-600 hover:bg-blue-700';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {showStatus && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Membership Status:</span>
          <Badge variant={isExpired ? 'destructive' : daysUntilExpiry <= 30 ? 'outline' : 'default'}>
            {isExpired ? 'Expired' : daysUntilExpiry <= 30 ? `${daysUntilExpiry} days left` : 'Active'}
          </Badge>
        </div>
      )}
      <Button
        onClick={onClick}
        variant={variant === 'outline' ? 'outline' : variant === 'ghost' ? 'ghost' : 'default'}
        className={variant === 'default' ? getButtonClass() : ''}
        size="lg"
      >
        <CreditCard className="w-5 h-5 mr-2" />
        {getButtonText()}
      </Button>
    </div>
  );
}