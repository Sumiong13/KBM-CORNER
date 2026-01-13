// Supabase-first data management with cross-device sync
// Always uses Supabase as source of truth

import { createClient } from '../utils/supabase/client';

const supabase = createClient();

// Check if Supabase tables are set up
let supabaseReady: boolean | null = null;

export function resetSupabaseCheck() {
  supabaseReady = null;
}

export async function checkSupabaseSetup(forceCheck: boolean = false): Promise<boolean> {
  if (!forceCheck && supabaseReady !== null) return supabaseReady;
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    // If there's any error (table not found, etc), database is not ready
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // Table doesn't exist - this is expected before setup
        supabaseReady = false;
      } else {
        console.log('Database error:', error.code, error.message);
        supabaseReady = false;
      }
      return false;
    }
    
    supabaseReady = true;
    return true;
  } catch (err) {
    console.error('Supabase check error:', err);
    supabaseReady = false;
    return false;
  }
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
  assignedClassId?: string;
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
  time: string;
  location: string;
  venue?: string;
  type?: 'event' | 'class';
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
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // Only include fields that are provided
  if (profile.email !== undefined) updateData.email = profile.email;
  if (profile.name !== undefined) updateData.name = profile.name;
  if (profile.role !== undefined) updateData.role = profile.role;
  if (profile.membershipLevel !== undefined) updateData.membership_level = profile.membershipLevel;
  if (profile.membershipExpiry !== undefined) updateData.membership_expiry = profile.membershipExpiry;
  if (profile.verified !== undefined) updateData.verified = profile.verified;
  if (profile.verificationStatus !== undefined) updateData.verification_status = profile.verificationStatus;
  if (profile.assignedClassId !== undefined) updateData.assigned_class_id = profile.assignedClassId;

  // Use UPDATE instead of UPSERT to avoid NOT NULL constraint issues
  // This assumes the profile already exists (which it should)
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Admin-specific function to update user profiles (bypasses RLS using PostgreSQL function)
export const adminUpdateUserProfile = async (
  targetUserId: string, 
  membershipLevel: number, 
  membershipExpiry: string
) => {
  // Get current user (admin)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Call the PostgreSQL function that bypasses RLS
  const { data, error } = await supabase.rpc('admin_update_user_profile', {
    target_user_id: targetUserId,
    new_membership_level: membershipLevel,
    new_membership_expiry: membershipExpiry,
    caller_id: user.id
  });

  if (error) throw error;
  return data;
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  if (!data) return null;

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
    assignedClassId: data.assigned_class_id,
  };
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
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
    assignedClassId: user.assigned_class_id,
  }));
};

export const deleteUser = async (userId: string) => {
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  if (error) throw error;
};

// ============================================================================
// Payment Management
// ============================================================================

export const savePayment = async (userId: string, payment: Payment) => {
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
  return data;
};

export const getPayments = async (userId: string): Promise<Payment[]> => {
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
};

export const getAllPayments = async (): Promise<Payment[]> => {
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
};

// ============================================================================
// Event Management
// ============================================================================

export const saveEvent = async (event: Event) => {
  const { data, error } = await supabase
    .from('events')
    .insert({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      venue: event.location,
      type: event.type,
      session_code: event.sessionCode,
      created_by: event.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateEvent = async (eventId: string, updates: Partial<Event>) => {
  const updateData: any = {};
  
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.time !== undefined) updateData.time = updates.time;
  if (updates.location !== undefined) {
    updateData.location = updates.location;
    updateData.venue = updates.location;
  }
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.sessionCode !== undefined) updateData.session_code = updates.sessionCode;

  const { data, error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteEvent = async (eventId: string) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
};

export const getAllEvents = async (): Promise<Event[]> => {
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
    time: event.time,
    location: event.location || event.venue,
    venue: event.venue || event.location,
    type: event.type || 'event',
    sessionCode: event.session_code,
    createdBy: event.created_by,
    createdAt: event.created_at,
  }));
};

export const getEvent = async (eventId: string): Promise<Event | null> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    date: data.date,
    time: data.time,
    location: data.location || data.venue,
    venue: data.venue || data.location,
    type: data.type || 'event',
    sessionCode: data.session_code,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
};

// ============================================================================
// Attendance Management
// ============================================================================

export const saveAttendance = async (attendance: Attendance) => {
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
  return data;
};

export const getUserAttendance = async (userId: string): Promise<Attendance[]> => {
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
};

export const getAllAttendance = async (): Promise<Attendance[]> => {
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
};

export const getEventAttendance = async (eventId: string): Promise<Attendance[]> => {
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
};

// ============================================================================
// RSVP Management
// ============================================================================

export const saveRSVP = async (rsvp: RSVP) => {
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
  return data;
};

export const deleteRSVP = async (userId: string, eventId: string) => {
  const { error } = await supabase
    .from('rsvps')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', eventId);

  if (error) throw error;
};

export const getUserRSVPs = async (userId: string): Promise<RSVP[]> => {
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
};

export const getEventRSVPs = async (eventId: string): Promise<RSVP[]> => {
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
};

export const getAllRSVPs = async (): Promise<RSVP[]> => {
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
};

export const isUserRSVPed = async (userId: string, eventId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('rsvps')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return false;
    throw error;
  }

  return !!data;
};

// ============================================================================
// Class Management
// ============================================================================

export interface ClassData {
  id: string;
  className: string;
  level: number;
  description: string;
  schedule: string;
  venue: string;
  capacity: number;
  tutorId?: string;
  tutorName?: string;
  createdAt: string;
}

export const saveClass = async (classData: Omit<ClassData, 'id' | 'createdAt'>) => {
  const { data, error } = await supabase
    .from('classes')
    .insert({
      class_name: classData.className,
      level: classData.level,
      description: classData.description,
      venue: classData.venue,
      tutor_id: classData.tutorId,
      tutor_name: classData.tutorName,
      max_students: classData.capacity,
      schedule: classData.schedule,
    })
    .select()
    .single();

  if (error) throw error;

  // If a tutor was assigned during creation, update their profile
  if (data && classData.tutorId) {
    await supabase
      .from('user_profiles')
      .update({ assigned_class_id: data.id })
      .eq('id', classData.tutorId);
  }

  return data;
};

export const updateClass = async (classId: string, updates: Partial<ClassData>) => {
  console.log('[updateClass] Called with classId:', classId, 'updates:', updates);
  
  // If tutor assignment is changing, get the old tutor BEFORE updating
  let oldTutorId: string | null = null;
  if (updates.tutorId !== undefined) {
    const { data: currentClass } = await supabase
      .from('classes')
      .select('tutor_id')
      .eq('id', classId)
      .single();
    
    oldTutorId = currentClass?.tutor_id || null;
    console.log('[updateClass] Old tutor ID:', oldTutorId);
  }

  const updateData: any = {};
  
  if (updates.className !== undefined) updateData.class_name = updates.className;
  if (updates.level !== undefined) updateData.level = updates.level;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.venue !== undefined) updateData.venue = updates.venue;
  if (updates.tutorId !== undefined) updateData.tutor_id = updates.tutorId || null;
  if (updates.tutorName !== undefined) updateData.tutor_name = updates.tutorName || null;
  if (updates.capacity !== undefined) updateData.max_students = updates.capacity;
  if (updates.schedule !== undefined) updateData.schedule = updates.schedule;

  console.log('[updateClass] Update data for classes table:', updateData);

  const { data, error } = await supabase
    .from('classes')
    .update(updateData)
    .eq('id', classId)
    .select()
    .single();

  if (error) {
    console.error('[updateClass] Error updating class:', error);
    throw error;
  }

  console.log('[updateClass] Class updated successfully:', data);

  // If tutor assignment changed, update the tutor profiles
  if (updates.tutorId !== undefined) {
    // Unassign old tutor if there was one and it's different from the new one
    if (oldTutorId && oldTutorId !== updates.tutorId) {
      console.log('[updateClass] Unassigning old tutor:', oldTutorId);
      const { error: unassignError } = await supabase
        .from('user_profiles')
        .update({ assigned_class_id: null })
        .eq('id', oldTutorId);
      
      if (unassignError) {
        console.error('[updateClass] Error unassigning old tutor:', unassignError);
      } else {
        console.log('[updateClass] Old tutor unassigned successfully');
      }
    }

    // Assign new tutor
    if (updates.tutorId) {
      console.log('[updateClass] Assigning new tutor:', updates.tutorId, 'to class:', classId);
      const { error: assignError } = await supabase
        .from('user_profiles')
        .update({ assigned_class_id: classId })
        .eq('id', updates.tutorId);
      
      if (assignError) {
        console.error('[updateClass] Error assigning new tutor:', assignError);
        throw assignError;
      } else {
        console.log('[updateClass] New tutor assigned successfully');
        
        // Verify the update
        const { data: verifyData } = await supabase
          .from('user_profiles')
          .select('id, email, name, assigned_class_id')
          .eq('id', updates.tutorId)
          .single();
        
        console.log('[updateClass] Verification - Tutor profile after update:', verifyData);
      }
    }
  }
};

export const deleteClass = async (classId: string) => {
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classId);

  if (error) throw error;
};

export const getAllClasses = async (): Promise<ClassData[]> => {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((cls: any) => ({
    id: cls.id,
    className: cls.class_name,
    level: cls.level,
    description: cls.description,
    schedule: cls.schedule || '',
    venue: cls.venue,
    capacity: cls.max_students || 30,
    tutorId: cls.tutor_id,
    tutorName: cls.tutor_name,
    createdAt: cls.created_at,
  }));
};

export const getClass = async (classId: string): Promise<ClassData | null> => {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    className: data.class_name,
    level: data.level,
    description: data.description,
    schedule: data.schedule || '',
    venue: data.venue,
    capacity: data.max_students || 30,
    tutorId: data.tutor_id,
    tutorName: data.tutor_name,
    createdAt: data.created_at,
  };
};

// ============================================================================
// Utility Functions
// ============================================================================

export const generateId = (): string => {
  // Generate a proper UUID v4
  return crypto.randomUUID();
};

// ============================================================================
// Grades Management
// ============================================================================

export interface Grade {
  id: string;
  studentId: string;
  tutorId: string;
  level: number;
  assessmentType: string;
  grade: number;
  comments?: string;
  gradedAt: string;
}

export const saveGrade = async (grade: Omit<Grade, 'id' | 'gradedAt'>) => {
  const { data, error } = await supabase
    .from('grades')
    .insert({
      student_id: grade.studentId,
      tutor_id: grade.tutorId,
      level: grade.level,
      assessment_type: grade.assessmentType,
      grade: grade.grade,
      comments: grade.comments,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getStudentGrades = async (studentId: string): Promise<Grade[]> => {
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .eq('student_id', studentId)
    .order('graded_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((grade: any) => ({
    id: grade.id,
    studentId: grade.student_id,
    tutorId: grade.tutor_id,
    level: grade.level,
    assessmentType: grade.assessment_type,
    grade: grade.grade,
    comments: grade.comments,
    gradedAt: grade.graded_at,
  }));
};

export const getAllGrades = async (): Promise<Grade[]> => {
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .order('graded_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((grade: any) => ({
    id: grade.id,
    studentId: grade.student_id,
    tutorId: grade.tutor_id,
    level: grade.level,
    assessmentType: grade.assessment_type,
    grade: grade.grade,
    comments: grade.comments,
    gradedAt: grade.graded_at,
  }));
};

export const getTutorGrades = async (tutorId: string): Promise<Grade[]> => {
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .eq('tutor_id', tutorId)
    .order('graded_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((grade: any) => ({
    id: grade.id,
    studentId: grade.student_id,
    tutorId: grade.tutor_id,
    level: grade.level,
    assessmentType: grade.assessment_type,
    grade: grade.grade,
    comments: grade.comments,
    gradedAt: grade.graded_at,
  }));
};

// ============================================================================
// Utility Functions
// ============================================================================

export const clearAllData = async () => {
  if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    alert('Please use Supabase dashboard to manage database data for safety.');
  }
};