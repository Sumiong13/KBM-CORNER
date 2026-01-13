import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { api } from '../lib/api';
import { UserCheck, X } from 'lucide-react';

interface EventRsvpListProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onClose: () => void;
}

export function EventRsvpList({ eventId, eventTitle, open, onClose }: EventRsvpListProps) {
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && eventId) {
      loadRsvps();
    }
  }, [open, eventId]);

  const loadRsvps = async () => {
    try {
      setLoading(true);
      const { rsvps: eventRsvps } = await api.getEventRsvps(eventId);
      setRsvps(eventRsvps);
    } catch (error) {
      console.error('Failed to load RSVPs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-600" />
            Event RSVPs
          </DialogTitle>
          <DialogDescription>
            People who have RSVP'd for: <span className="font-semibold">{eventTitle}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading RSVPs...</div>
        ) : rsvps.length === 0 ? (
          <div className="text-center py-8">
            <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No RSVPs yet for this event</p>
            <p className="text-sm text-gray-400 mt-1">Waiting for participants to sign up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Total RSVPs: <span className="font-semibold">{rsvps.length}</span>
            </p>
            <div className="space-y-2">
              {rsvps.map((rsvp) => (
                <div
                  key={rsvp.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-medium">{rsvp.userName}</p>
                    <p className="text-sm text-gray-600">{rsvp.userEmail}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      RSVP'd on {new Date(rsvp.rsvpedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Level {rsvp.userLevel}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
