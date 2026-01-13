import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  type: string;
}

interface EventsCalendarProps {
  events: Event[];
  rsvps: any[];
  onRsvp: (eventId: string) => Promise<void>;
  onCancelRsvp: (eventId: string) => Promise<void>;
}

export function EventsCalendar({ events, rsvps, onRsvp, onCancelRsvp }: EventsCalendarProps) {
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const upcomingEvents = sortedEvents.filter(event => 
    new Date(event.date) >= new Date()
  );

  const pastEvents = sortedEvents.filter(event => 
    new Date(event.date) < new Date()
  );

  const isRsvped = (eventId: string) => {
    return rsvps.some(rsvp => rsvp.eventId === eventId);
  };

  const handleRsvpToggle = async (eventId: string) => {
    if (isRsvped(eventId)) {
      await onCancelRsvp(eventId);
    } else {
      await onRsvp(eventId);
    }
  };

  const EventCard = ({ event, isPast }: { event: Event; isPast: boolean }) => (
    <Card key={event.id} className={isPast ? 'opacity-60' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle>{event.title}</CardTitle>
              <Badge variant={event.type === 'workshop' ? 'default' : 'outline'}>
                {event.type}
              </Badge>
              {isPast && <Badge variant="secondary">Past</Badge>}
            </div>
            <CardDescription>{event.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{new Date(event.date).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{event.venue}</span>
            </div>
          </div>
          
          {!isPast && (
            <div className="pt-2">
              {isRsvped(event.id) ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleRsvpToggle(event.id)}
                  className="w-full"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Cancel RSVP
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  onClick={() => handleRsvpToggle(event.id)}
                  className="w-full"
                >
                  <Users className="w-4 h-4 mr-2" />
                  RSVP to Event
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Upcoming Events */}
      <div>
        <h2 className="text-2xl mb-4">Upcoming Events</h2>
        {upcomingEvents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No upcoming events scheduled
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} isPast={false} />
            ))}
          </div>
        )}
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-2xl mb-4">Past Events</h2>
          <div className="grid gap-4">
            {pastEvents.map(event => (
              <EventCard key={event.id} event={event} isPast={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
