import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Award, Calendar, CreditCard, CheckCircle2, Clock } from 'lucide-react';

interface MembershipCardProps {
  profile: any;
  certificates: any[];
  onPaymentClick?: () => void;
}

export function MembershipCard({ profile, certificates, onPaymentClick }: MembershipCardProps) {
  if (!profile) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Loading membership information...</p>
        </CardContent>
      </Card>
    );
  }

  const isExpired = new Date(profile.membershipExpiry) < new Date();
  const daysUntilExpiry = Math.ceil(
    (new Date(profile.membershipExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const levelProgress = ((profile.level - 1) / 4) * 100; // Progress through 5 levels
  const certificateList = certificates || [];

  return (
    <div className="space-y-4">
      {/* Main Membership Card */}
      <Card className={isExpired ? 'border-red-300' : 'border-green-300'}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                Membership Status
              </CardTitle>
              <CardDescription>
                UTM Mandarin Club - Level {profile.level} of 5
              </CardDescription>
            </div>
            <Badge variant={isExpired ? 'destructive' : 'default'}>
              {isExpired ? 'Expired' : 'Active'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Course Progress</span>
              <span className="font-medium">Level {profile.level}/5</span>
            </div>
            <Progress value={levelProgress} className="h-2" />
            <p className="text-xs text-gray-500">
              {profile.level === 5 
                ? 'Congratulations! You\'ve completed all levels!' 
                : `${5 - profile.level} level(s) remaining to graduate`}
            </p>
          </div>

          {/* Expiry Info */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Expires:</span>
            <span className="font-medium">
              {new Date(profile.membershipExpiry).toLocaleDateString()}
            </span>
            {!isExpired && daysUntilExpiry <= 30 && (
              <Badge variant="outline" className="ml-2">
                {daysUntilExpiry} days left
              </Badge>
            )}
          </div>

          {/* Renewal Notice */}
          {(isExpired || daysUntilExpiry <= 30) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">
                    {isExpired ? 'Membership Expired' : 'Renewal Reminder'}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Pay RM50 to {isExpired ? 'reactivate' : 'continue'} your membership for the next semester
                    {profile.level < 5 && ` and advance to Level ${profile.level + 1}`}
                  </p>
                </div>
              </div>
              {onPaymentClick && (
                <Button size="sm" className="w-full" onClick={onPaymentClick}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay RM50 - {isExpired ? 'Activate' : 'Renew'} Membership
                </Button>
              )}
            </div>
          )}

          {/* Initial Payment Button for Active but wants to advance */}
          {!isExpired && daysUntilExpiry > 30 && profile.level < 5 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Award className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Advance to Next Level
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Complete your current level assessments or pay RM50 to extend your membership and advance to Level {profile.level + 1}
                  </p>
                </div>
              </div>
              {onPaymentClick && (
                <Button size="sm" variant="outline" className="w-full border-blue-300 hover:bg-blue-100" onClick={onPaymentClick}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay RM50 - Advance Level
                </Button>
              )}
            </div>
          )}

          {/* Certificates Earned */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Certificates Earned</span>
              <Badge variant="outline">{certificateList.length}</Badge>
            </div>
            {certificateList.length > 0 ? (
              <div className="space-y-1">
                {certificateList.map((cert: any) => (
                  <div key={cert.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Level {cert.level} Certificate</span>
                    <span className="text-xs text-gray-400">
                      ({new Date(cert.issuedAt).toLocaleDateString()})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Complete Level {profile.level} to earn your first certificate
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
