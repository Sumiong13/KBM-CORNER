// Hybrid Storage: Uses Supabase when available, falls back to localStorage
// This allows the app to work before Supabase tables are created

import { createClient } from '../utils/supabase/client';
import * as localStorage from './storage';

const supabase = createClient();

// Check if Supabase tables exist
let supabaseAvailable = false;
let checkingSupabase = false;

async function checkSupabaseAvailability() {
  if (checkingSupabase) return supabaseAvailable;
  
  checkingSupabase = true;
  try {
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    supabaseAvailable = !error || error.code !== 'PGRST205';
    
    if (!supabaseAvailable) {
      console.log('ℹ️ Using localStorage mode (device-only storage)');
      console.log('💡 To enable cross-device sync, run the SQL schema in Supabase');
      console.log('📖 See QUICK_START.md for instructions');
    } else {
      console.log('✅ Supabase connected - cross-device sync enabled');
    }
  } catch (err) {
    console.log('ℹ️ Using localStorage mode (device-only storage)');
    supabaseAvailable = false;
  }
  
  return supabaseAvailable;
}

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
  venue?: string;
  sessionCode?: string;
  createdBy: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  eventId?: string;
  eventTitle?: string;
  sessionCode?: string;
  className?: string;
  type?: 'event' | 'class';
  checkedInAt: string;
}

export interface RSVP {
  id: string;
  userId: string;
  eventId: string;
  rsvpedAt: string;
}

// ============================================================================
// User Profile Management
// ============================================================================

export const saveUserProfile = async (userId: string, profile: Partial<UserProfile>) => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          membership_level: profile.membershipLevel,
          membership_expiry: profile.membershipExpiry,
          verified: profile.verified,
          verification_status: profile.verificationStatus,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (error) throw error;
      
      // Also save to localStorage as backup
      localStorage.saveUserProfile(userId, profile);
      
      return data;
    } catch (error) {
      console.error('Error saving to Supabase, using localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  localStorage.saveUserProfile(userId, profile);
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found in Supabase, try localStorage
          return localStorage.getUserProfile(userId);
        }
        throw error;
      }

      if (!data) return localStorage.getUserProfile(userId);

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        membershipLevel: data.membership_level,
        membershipExpiry: data.membership_expiry,
        verified: data.verified,
        verificationStatus: data.verification_status,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error getting from Supabase, using localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getUserProfile(userId);
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        membershipLevel: user.membership_level,
        membershipExpiry: user.membership_expiry,
        verified: user.verified,
        verificationStatus: user.verification_status,
        createdAt: user.created_at,
      }));
    } catch (error) {
      console.error('Error getting all users from Supabase, using localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getAllUsers();
};

export const deleteUser = async (userId: string) => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting from Supabase:', error);
    }
  }
  
  // Also delete from localStorage
  localStorage.deleteUser(userId);
};

// ============================================================================
// Payment Management
// ============================================================================

export const savePayment = async (userId: string, payment: Payment) => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          id: payment.id,
          user_id: userId,
          amount: payment.amount,
          level: payment.level,
          payment_method: payment.paymentMethod,
          reference_number: payment.referenceNumber,
          status: payment.status,
          paid_at: payment.paidAt,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Also save to localStorage
      localStorage.savePayment(userId, payment);
      
      return data;
    } catch (error) {
      console.error('Error saving payment to Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  localStorage.savePayment(userId, payment);
};

export const getPayments = async (userId: string): Promise<Payment[]> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('paid_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((payment: any) => ({
        id: payment.id,
        userId: payment.user_id,
        amount: payment.amount,
        level: payment.level,
        paymentMethod: payment.payment_method,
        referenceNumber: payment.reference_number,
        status: payment.status,
        paidAt: payment.paid_at,
      }));
    } catch (error) {
      console.error('Error getting payments from Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getPayments(userId);
};

export const getAllPayments = async (): Promise<Payment[]> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('paid_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((payment: any) => ({
        id: payment.id,
        userId: payment.user_id,
        amount: payment.amount,
        level: payment.level,
        paymentMethod: payment.payment_method,
        referenceNumber: payment.reference_number,
        status: payment.status,
        paidAt: payment.paid_at,
      }));
    } catch (error) {
      console.error('Error getting all payments from Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getAllPayments();
};

// ============================================================================
// Event Management
// ============================================================================

export const saveEvent = async (event: Event) => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          location: event.location,
          venue: event.location,
          session_code: event.sessionCode,
          created_by: event.createdBy,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Also save to localStorage
      localStorage.saveEvent(event);
      
      return data;
    } catch (error) {
      console.error('Error saving event to Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  localStorage.saveEvent(event);
};

export const updateEvent = async (eventId: string, updates: Partial<Event>) => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({
          title: updates.title,
          description: updates.description,
          date: updates.date,
          location: updates.location,
          venue: updates.location,
          session_code: updates.sessionCode,
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      
      // Also update localStorage
      localStorage.updateEvent(eventId, updates);
      
      return data;
    } catch (error) {
      console.error('Error updating event in Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  localStorage.updateEvent(eventId, updates);
};

export const deleteEvent = async (eventId: string) => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting event from Supabase:', error);
    }
  }
  
  // Also delete from localStorage
  localStorage.deleteEvent(eventId);
};

export const getAllEvents = async (): Promise<Event[]> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      return (data || []).map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location || event.venue,
        venue: event.venue || event.location,
        sessionCode: event.session_code,
        createdBy: event.created_by,
        createdAt: event.created_at,
      }));
    } catch (error) {
      console.error('Error getting events from Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getAllEvents();
};

export const getEvent = async (eventId: string): Promise<Event | null> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return localStorage.getEvent(eventId);
        }
        throw error;
      }

      if (!data) return localStorage.getEvent(eventId);

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        date: data.date,
        location: data.location || data.venue,
        venue: data.venue || data.location,
        sessionCode: data.session_code,
        createdBy: data.created_by,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error getting event from Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getEvent(eventId);
};

// ============================================================================
// Attendance Management
// ============================================================================

export const saveAttendance = async (attendance: Attendance) => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          id: attendance.id,
          user_id: attendance.userId,
          event_id: attendance.eventId,
          event_title: attendance.eventTitle,
          session_code: attendance.sessionCode,
          class_name: attendance.className,
          type: attendance.type,
          checked_in_at: attendance.checkedInAt,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Also save to localStorage
      localStorage.saveAttendance(attendance);
      
      return data;
    } catch (error) {
      console.error('Error saving attendance to Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  localStorage.saveAttendance(attendance);
};

export const getUserAttendance = async (userId: string): Promise<Attendance[]> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .order('checked_in_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((record: any) => ({
        id: record.id,
        userId: record.user_id,
        eventId: record.event_id,
        eventTitle: record.event_title,
        sessionCode: record.session_code,
        className: record.class_name,
        type: record.type,
        checkedInAt: record.checked_in_at,
      }));
    } catch (error) {
      console.error('Error getting attendance from Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getUserAttendance(userId);
};

export const getAllAttendance = async (): Promise<Attendance[]> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('checked_in_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((record: any) => ({
        id: record.id,
        userId: record.user_id,
        eventId: record.event_id,
        eventTitle: record.event_title,
        sessionCode: record.session_code,
        className: record.class_name,
        type: record.type,
        checkedInAt: record.checked_in_at,
      }));
    } catch (error) {
      console.error('Error getting all attendance from Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getAllAttendance();
};

export const getEventAttendance = async (eventId: string): Promise<Attendance[]> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('event_id', eventId)
        .order('checked_in_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((record: any) => ({
        id: record.id,
        userId: record.user_id,
        eventId: record.event_id,
        eventTitle: record.event_title,
        sessionCode: record.session_code,
        className: record.class_name,
        type: record.type,
        checkedInAt: record.checked_in_at,
      }));
    } catch (error) {
      console.error('Error getting event attendance from Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getEventAttendance(eventId);
};

// ============================================================================
// RSVP Management
// ============================================================================

export const saveRSVP = async (rsvp: RSVP) => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .insert({
          id: rsvp.id,
          user_id: rsvp.userId,
          event_id: rsvp.eventId,
          rsvped_at: rsvp.rsvpedAt,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Also save to localStorage
      localStorage.saveRSVP(rsvp);
      
      return data;
    } catch (error) {
      console.error('Error saving RSVP to Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  localStorage.saveRSVP(rsvp);
};

export const deleteRSVP = async (userId: string, eventId: string) => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { error } = await supabase
        .from('rsvps')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting RSVP from Supabase:', error);
    }
  }
  
  // Also delete from localStorage
  localStorage.deleteRSVP(userId, eventId);
};

export const getUserRSVPs = async (userId: string): Promise<RSVP[]> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .select('*')
        .eq('user_id', userId)
        .order('rsvped_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((rsvp: any) => ({
        id: rsvp.id,
        userId: rsvp.user_id,
        eventId: rsvp.event_id,
        rsvpedAt: rsvp.rsvped_at,
      }));
    } catch (error) {
      console.error('Error getting RSVPs from Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getUserRSVPs(userId);
};

export const getEventRSVPs = async (eventId: string): Promise<RSVP[]> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .select('*')
        .eq('event_id', eventId)
        .order('rsvped_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((rsvp: any) => ({
        id: rsvp.id,
        userId: rsvp.user_id,
        eventId: rsvp.event_id,
        rsvpedAt: rsvp.rsvped_at,
      }));
    } catch (error) {
      console.error('Error getting event RSVPs from Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getEventRSVPs(eventId);
};

export const getAllRSVPs = async (): Promise<RSVP[]> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .select('*')
        .order('rsvped_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((rsvp: any) => ({
        id: rsvp.id,
        userId: rsvp.user_id,
        eventId: rsvp.event_id,
        rsvpedAt: rsvp.rsvped_at,
      }));
    } catch (error) {
      console.error('Error getting all RSVPs from Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getAllRSVPs();
};

export const isUserRSVPed = async (userId: string, eventId: string): Promise<boolean> => {
  const useSupabase = await checkSupabaseAvailability();
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return localStorage.isUserRSVPed(userId, eventId);
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking RSVP in Supabase:', error);
    }
  }
  
  // Fallback to localStorage
  return localStorage.isUserRSVPed(userId, eventId);
};

// ============================================================================
// Utility Functions
// ============================================================================

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const clearAllData = async () => {
  localStorage.clearAllData();
};