// LocalStorage-based data management
// This allows the app to work without Supabase database tables

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin' | 'committee' | 'tutor';
  membershipLevel: number;
  verified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  membershipExpiry?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  level: number;
  paymentMethod: string;
  referenceNumber?: string;
  status: string;
  paidAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  sessionCode?: string;
  createdBy: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  eventId?: string;
  sessionCode?: string;
  className?: string;
  checkedInAt: string;
}

// User Profile Management
export const saveUserProfile = (userId: string, profile: Partial<UserProfile>) => {
  const key = `user_profile_${userId}`;
  const existing = getUserProfile(userId);
  const updated = { ...existing, ...profile, id: userId };
  localStorage.setItem(key, JSON.stringify(updated));
  
  // Also save individual fields for backward compatibility
  if (profile.role) localStorage.setItem(`user_role_${userId}`, profile.role);
  if (profile.name) localStorage.setItem(`user_name_${userId}`, profile.name);
  if (profile.verified !== undefined) localStorage.setItem(`user_verified_${userId}`, String(profile.verified));
  if (profile.membershipLevel) localStorage.setItem(`user_membership_level_${userId}`, String(profile.membershipLevel));
};

export const getUserProfile = (userId: string): UserProfile | null => {
  const key = `user_profile_${userId}`;
  const data = localStorage.getItem(key);
  if (data) {
    return JSON.parse(data);
  }
  
  // Try to reconstruct from individual fields
  const role = localStorage.getItem(`user_role_${userId}`) as any;
  const name = localStorage.getItem(`user_name_${userId}`);
  const verified = localStorage.getItem(`user_verified_${userId}`) === 'true';
  const level = parseInt(localStorage.getItem(`user_membership_level_${userId}`) || '1');
  
  if (role) {
    return {
      id: userId,
      email: '',
      name: name || 'User',
      role: role,
      membershipLevel: level,
      verified: verified,
      verificationStatus: verified ? 'approved' : 'pending',
      createdAt: new Date().toISOString()
    };
  }
  
  return null;
};

export const getAllUsers = (): UserProfile[] => {
  const users: UserProfile[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('user_profile_')) {
      const data = localStorage.getItem(key);
      if (data) {
        users.push(JSON.parse(data));
      }
    }
  }
  return users;
};

export const deleteUser = (userId: string) => {
  // Remove user profile
  localStorage.removeItem(`user_profile_${userId}`);
  
  // Remove individual user fields
  localStorage.removeItem(`user_role_${userId}`);
  localStorage.removeItem(`user_name_${userId}`);
  localStorage.removeItem(`user_verified_${userId}`);
  localStorage.removeItem(`user_membership_level_${userId}`);
  localStorage.removeItem(`user_email_verified_${userId}`);
  localStorage.removeItem(`user_verification_status_${userId}`);
  
  // Remove user payments
  localStorage.removeItem(`payments_${userId}`);
  
  // Remove user RSVPs
  const rsvps = getAllRSVPs().filter(r => r.userId !== userId);
  localStorage.setItem('rsvps', JSON.stringify(rsvps));
  
  // Remove user attendance
  const attendance = getAllAttendance().filter(a => a.userId !== userId);
  localStorage.setItem('attendance', JSON.stringify(attendance));
};

// Payment Management
export const savePayment = (userId: string, payment: Payment) => {
  const payments = getPayments(userId);
  payments.push(payment);
  localStorage.setItem(`payments_${userId}`, JSON.stringify(payments));
};

export const getPayments = (userId: string): Payment[] => {
  const data = localStorage.getItem(`payments_${userId}`);
  return data ? JSON.parse(data) : [];
};

export const getAllPayments = (): Payment[] => {
  const payments: Payment[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('payments_')) {
      const data = localStorage.getItem(key);
      if (data) {
        payments.push(...JSON.parse(data));
      }
    }
  }
  return payments;
};

// Event Management
export const saveEvent = (event: Event) => {
  const events = getAllEvents();
  events.push(event);
  localStorage.setItem('events', JSON.stringify(events));
};

export const updateEvent = (eventId: string, updates: Partial<Event>) => {
  const events = getAllEvents();
  const index = events.findIndex(e => e.id === eventId);
  if (index >= 0) {
    events[index] = { ...events[index], ...updates };
    localStorage.setItem('events', JSON.stringify(events));
  }
};

export const deleteEvent = (eventId: string) => {
  const events = getAllEvents().filter(e => e.id !== eventId);
  localStorage.setItem('events', JSON.stringify(events));
};

export const getAllEvents = (): Event[] => {
  const data = localStorage.getItem('events');
  return data ? JSON.parse(data) : [];
};

export const getEvent = (eventId: string): Event | null => {
  const events = getAllEvents();
  return events.find(e => e.id === eventId) || null;
};

// Attendance Management
export const saveAttendance = (attendance: Attendance) => {
  const records = getAllAttendance();
  records.push(attendance);
  localStorage.setItem('attendance', JSON.stringify(records));
};

export const getUserAttendance = (userId: string): Attendance[] => {
  return getAllAttendance().filter(a => a.userId === userId);
};

export const getAllAttendance = (): Attendance[] => {
  const data = localStorage.getItem('attendance');
  return data ? JSON.parse(data) : [];
};

export const getEventAttendance = (eventId: string): Attendance[] => {
  return getAllAttendance().filter(a => a.eventId === eventId);
};

// RSVP Management
export interface RSVP {
  id: string;
  userId: string;
  eventId: string;
  rsvpedAt: string;
}

export const saveRSVP = (rsvp: RSVP) => {
  const rsvps = getAllRSVPs();
  rsvps.push(rsvp);
  localStorage.setItem('rsvps', JSON.stringify(rsvps));
};

export const deleteRSVP = (userId: string, eventId: string) => {
  const rsvps = getAllRSVPs().filter(r => !(r.userId === userId && r.eventId === eventId));
  localStorage.setItem('rsvps', JSON.stringify(rsvps));
};

export const getUserRSVPs = (userId: string): RSVP[] => {
  return getAllRSVPs().filter(r => r.userId === userId);
};

export const getEventRSVPs = (eventId: string): RSVP[] => {
  return getAllRSVPs().filter(r => r.eventId === eventId);
};

export const getAllRSVPs = (): RSVP[] => {
  const data = localStorage.getItem('rsvps');
  return data ? JSON.parse(data) : [];
};

export const isUserRSVPed = (userId: string, eventId: string): boolean => {
  return getAllRSVPs().some(r => r.userId === userId && r.eventId === eventId);
};

// Utility functions
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const clearAllData = () => {
  if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    localStorage.clear();
    window.location.reload();
  }
};