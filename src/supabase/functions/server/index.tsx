import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

// Track if admin has been initialized
let adminInitialized = false;

// Initialize admin on first request
app.use('*', async (c, next) => {
  if (!adminInitialized) {
    await ensureAdminExists();
    adminInitialized = true;
  }
  await next();
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to verify auth
async function verifyAuth(request: Request) {
  const authHeader = request.headers.get('Authorization');
  console.log('Auth header present:', !!authHeader);
  
  const accessToken = authHeader?.split(' ')[1];
  console.log('Access token extracted:', accessToken ? `${accessToken.substring(0, 20)}...` : 'none');
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (!user || error) {
    console.log('Auth verification failed:', error?.message || 'No user found');
    return null;
  }
  console.log('Auth verified for user:', user.id);
  return user;
}

// Helper function to check if user is admin
async function isAdmin(userId: string): Promise<boolean> {
  const userData = await kv.get(`user:${userId}`);
  return userData?.role === 'admin';
}

// Helper function to check if user is tutor
async function isTutor(userId: string): Promise<boolean> {
  const userData = await kv.get(`user:${userId}`);
  return userData?.role === 'tutor' || userData?.role === 'admin';
}

// Helper function to check if user is committee
async function isCommittee(userId: string): Promise<boolean> {
  const userData = await kv.get(`user:${userId}`);
  return userData?.role === 'committee' || userData?.role === 'admin';
}

// ==================== HEALTH CHECK ====================

app.get('/make-server-12e720fa/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    adminInitialized 
  });
});

// ==================== AUTH ROUTES ====================

// Initialize admin account if it doesn't exist
async function ensureAdminExists() {
  try {
    const adminEmail = 'utmmandarinclub@gmail.com';
    const adminPassword = 'admin123';
    
    // First check KV store to see if admin exists there
    const existingAdmins = await kv.getByPrefix('user:');
    const adminInKv = existingAdmins?.find((u: any) => u.email === adminEmail && u.role === 'admin');
    
    if (adminInKv) {
      console.log('Admin account already exists in KV store');
      return;
    }
    
    // Check if admin already exists in auth
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.log(`Error listing users: ${listError.message}`);
      return;
    }
    
    const adminUser = users?.users?.find((u: any) => u.email === adminEmail);
    
    if (!adminUser) {
      console.log('Creating admin account...');
      const { data, error } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        user_metadata: { name: 'Admin' },
        email_confirm: true
      });
      
      if (error) {
        console.log(`Admin creation error: ${error.message}`);
        return;
      }
      
      // Store admin data
      await kv.set(`user:${data.user.id}`, {
        id: data.user.id,
        email: adminEmail,
        name: 'Admin',
        role: 'admin',
        level: 5,
        membershipActive: true,
        membershipExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        verified: true
      });
      
      console.log('Admin account created successfully');
    } else {
      console.log('Admin exists in auth, adding to KV store...');
      // Admin exists in auth but not in KV, add to KV
      await kv.set(`user:${adminUser.id}`, {
        id: adminUser.id,
        email: adminEmail,
        name: 'Admin',
        role: 'admin',
        level: 5,
        membershipActive: true,
        membershipExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        verified: true
      });
      console.log('Admin added to KV store');
    }
  } catch (error) {
    console.log(`Ensure admin exists error: ${error}`);
  }
}

// Sign up with email verification
app.post('/make-server-12e720fa/signup', async (c) => {
  try {
    console.log('Signup request received');
    const body = await c.req.json();
    console.log('Signup body:', { email: body.email, name: body.name, role: body.role });
    
    const { email, password, name, role } = body;
    
    // Validate role - student, committee, and tutor are allowed
    const requestedRole = role || 'student';
    if (!['student', 'committee', 'tutor'].includes(requestedRole)) {
      console.log(`Invalid role requested: ${requestedRole}`);
      return c.json({ error: 'Invalid role. Only student, committee, or tutor roles are allowed.' }, 400);
    }
    
    console.log(`Creating user with role: ${requestedRole}`);
    
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true // Auto-confirm since email server not configured
    });

    if (error) {
      console.log(`Supabase auth error during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    console.log(`User created in auth: ${data.user.id}`);

    // Students start with expired membership - they need to pay RM50 to activate
    // Committee members and tutors need admin verification first
    const expiryDate = new Date();
    if (requestedRole === 'student') {
      // Set expiry to past date - requires payment to activate
      expiryDate.setMonth(expiryDate.getMonth() - 1);
    } else {
      // Committee members and tutors get 4 months after verification
      expiryDate.setMonth(expiryDate.getMonth() + 4);
    }

    // Store user data in KV store with pending verification for committee and tutors
    const userData = {
      id: data.user.id,
      email,
      name,
      role: requestedRole,
      level: 1,
      membershipActive: false, // Students, committee, and tutors start inactive
      membershipExpiry: expiryDate.toISOString(),
      createdAt: new Date().toISOString(),
      verified: requestedRole === 'student' ? true : false, // Committee and tutors need verification
      verificationStatus: (requestedRole === 'committee' || requestedRole === 'tutor') ? 'pending' : 'approved'
    };
    
    console.log(`Storing user data in KV for user: ${data.user.id}`);
    await kv.set(`user:${data.user.id}`, userData);
    console.log('User data stored successfully');

    return c.json({ 
      success: true, 
      user: data.user,
      requiresVerification: (requestedRole === 'committee' || requestedRole === 'tutor')
    });
  } catch (error: any) {
    console.log(`Signup error (caught): ${error.message || error}`);
    console.error('Full error:', error);
    return c.json({ error: error.message || 'Signup failed' }, 500);
  }
});

// Create or update user profile (after email verification)
app.post('/make-server-12e720fa/users', async (c) => {
  try {
    console.log('Create user profile request received');
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      console.log('User not authenticated');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await c.req.json();
    console.log('User data to create:', { id: userData.id, email: userData.email, role: userData.role });
    
    // Verify user is creating/updating their own profile
    if (user.id !== userData.id) {
      console.log(`User ID mismatch: ${user.id} !== ${userData.id}`);
      return c.json({ error: 'Unauthorized - Can only manage own profile' }, 401);
    }

    // Store user data in KV store
    console.log(`Storing user data for: ${userData.id}`);
    await kv.set(`user:${userData.id}`, userData);
    console.log('User data stored successfully in KV');

    return c.json({ 
      success: true,
      message: 'User profile created/updated successfully'
    });
  } catch (error: any) {
    console.log(`Create user error: ${error.message || error}`);
    console.error('Full create user error:', error);
    return c.json({ error: error.message || 'Failed to create user' }, 500);
  }
});

// ==================== EVENT ROUTES ====================

// Get all events
app.get('/make-server-12e720fa/events', async (c) => {
  try {
    const events = await kv.getByPrefix('event:');
    return c.json({ events: events || [] });
  } catch (error) {
    console.log(`Get events error: ${error}`);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

// Create event (admin and committee members can create)
app.post('/make-server-12e720fa/events', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    const hasPermission = await isAdmin(user?.id) || await isCommittee(user?.id);
    if (!user || !hasPermission) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { title, description, date, time, venue, type } = await c.req.json();
    const eventId = `event:${Date.now()}`;
    
    const event = {
      id: eventId,
      title,
      description,
      date,
      time,
      venue,
      type, // 'meeting', 'workshop', 'event'
      createdAt: new Date().toISOString(),
      sessionCode: Math.random().toString(36).substring(2, 8).toUpperCase()
    };

    await kv.set(eventId, event);
    return c.json({ success: true, event });
  } catch (error) {
    console.log(`Create event error: ${error}`);
    return c.json({ error: 'Failed to create event' }, 500);
  }
});

// Update event (admin and committee members can update)
app.put('/make-server-12e720fa/events/:id', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    const hasPermission = await isAdmin(user?.id) || await isCommittee(user?.id);
    if (!user || !hasPermission) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const eventId = c.req.param('id');
    const updates = await c.req.json();
    
    const existingEvent = await kv.get(eventId);
    if (!existingEvent) {
      return c.json({ error: 'Event not found' }, 404);
    }

    const updatedEvent = { ...existingEvent, ...updates };
    await kv.set(eventId, updatedEvent);
    
    return c.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.log(`Update event error: ${error}`);
    return c.json({ error: 'Failed to update event' }, 500);
  }
});

// Delete event (admin and committee members can delete)
app.delete('/make-server-12e720fa/events/:id', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    const hasPermission = await isAdmin(user?.id) || await isCommittee(user?.id);
    if (!user || !hasPermission) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const eventId = c.req.param('id');
    await kv.del(eventId);
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete event error: ${error}`);
    return c.json({ error: 'Failed to delete event' }, 500);
  }
});

// ==================== ATTENDANCE ROUTES ====================

// Check-in via session code or QR code
app.post('/make-server-12e720fa/checkin', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { sessionCode, eventId } = await c.req.json();
    
    // Find event by session code or event ID
    let event;
    if (eventId) {
      event = await kv.get(eventId);
    } else if (sessionCode) {
      const events = await kv.getByPrefix('event:');
      event = events.find((e: any) => e.sessionCode === sessionCode);
    }

    if (!event) {
      return c.json({ error: 'Invalid session code or event not found' }, 404);
    }

    // Record attendance
    const attendanceId = `attendance:${user.id}:${event.id}`;
    const attendance = {
      id: attendanceId,
      userId: user.id,
      eventId: event.id,
      eventTitle: event.title,
      checkedInAt: new Date().toISOString()
    };

    await kv.set(attendanceId, attendance);
    
    return c.json({ success: true, event, attendance });
  } catch (error) {
    console.log(`Check-in error: ${error}`);
    return c.json({ error: 'Check-in failed' }, 500);
  }
});

// Get user's attendance history
app.get('/make-server-12e720fa/attendance/:userId', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    
    // Users can only view their own attendance unless they're admin
    if (user.id !== userId && !(await isAdmin(user.id))) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const attendanceRecords = await kv.getByPrefix(`attendance:${userId}:`);
    return c.json({ attendance: attendanceRecords || [] });
  } catch (error) {
    console.log(`Get attendance error: ${error}`);
    return c.json({ error: 'Failed to fetch attendance' }, 500);
  }
});

// ==================== RSVP ROUTES ====================

// RSVP to event
app.post('/make-server-12e720fa/rsvp', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { eventId } = await c.req.json();
    const rsvpId = `rsvp:${user.id}:${eventId}`;
    
    const rsvp = {
      id: rsvpId,
      userId: user.id,
      eventId,
      createdAt: new Date().toISOString()
    };

    await kv.set(rsvpId, rsvp);
    return c.json({ success: true, rsvp });
  } catch (error) {
    console.log(`RSVP error: ${error}`);
    return c.json({ error: 'RSVP failed' }, 500);
  }
});

// Cancel RSVP
app.delete('/make-server-12e720fa/rsvp/:eventId', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const eventId = c.req.param('eventId');
    const rsvpId = `rsvp:${user.id}:${eventId}`;
    
    await kv.del(rsvpId);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Cancel RSVP error: ${error}`);
    return c.json({ error: 'Failed to cancel RSVP' }, 500);
  }
});

// Get user's RSVPs
app.get('/make-server-12e720fa/rsvp/:userId', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    
    // Users can only view their own RSVPs unless they're admin
    if (user.id !== userId && !(await isAdmin(user.id))) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const rsvps = await kv.getByPrefix(`rsvp:${userId}:`);
    return c.json({ rsvps: rsvps || [] });
  } catch (error) {
    console.log(`Get RSVPs error: ${error}`);
    return c.json({ error: 'Failed to fetch RSVPs' }, 500);
  }
});

// ==================== ADMIN DASHBOARD ROUTES ====================

// Get admin statistics
app.get('/make-server-12e720fa/admin/stats', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || !(await isAdmin(user.id))) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const users = await kv.getByPrefix('user:');
    const events = await kv.getByPrefix('event:');
    const attendance = await kv.getByPrefix('attendance:');
    const rsvps = await kv.getByPrefix('rsvp:');

    // Only count students for membership stats
    const students = users?.filter(u => u.role === 'student') || [];
    const committee = users?.filter(u => u.role === 'committee') || [];
    
    // Count active memberships (only students with valid membership)
    const now = new Date();
    const activeStudents = students.filter(u => 
      u.membershipActive === true || new Date(u.membershipExpiry) > now
    );

    const stats = {
      totalStudents: students.length,
      totalCommittee: committee.length,
      activeMemberships: activeStudents.length,
      totalEvents: events?.length || 0,
      totalAttendance: attendance?.length || 0,
      totalRSVPs: rsvps?.length || 0,
      recentAttendance: attendance?.slice(-10).reverse() || []
    };

    return c.json({ stats });
  } catch (error) {
    console.log(`Get stats error: ${error}`);
    return c.json({ error: 'Failed to fetch statistics' }, 500);
  }
});

// Get all users (admin, committee, and tutor can access)
app.get('/make-server-12e720fa/admin/users', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    const hasPermission = await isAdmin(user?.id) || await isCommittee(user?.id) || await isTutor(user?.id);
    if (!user || !hasPermission) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const users = await kv.getByPrefix('user:');
    return c.json({ users: users || [] });
  } catch (error) {
    console.log(`Get users error: ${error}`);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Update user role (admin only)
app.put('/make-server-12e720fa/admin/users/:userId', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || !(await isAdmin(user.id))) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    const { role } = await c.req.json();
    
    const userData = await kv.get(`user:${userId}`);
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    userData.role = role;
    await kv.set(`user:${userId}`, userData);
    
    return c.json({ success: true, user: userData });
  } catch (error) {
    console.log(`Update user role error: ${error}`);
    return c.json({ error: 'Failed to update user role' }, 500);
  }
});

// Approve committee student (admin only)
app.post('/make-server-12e720fa/admin/verify/:userId', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || !(await isAdmin(user.id))) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    const { approved } = await c.req.json();
    
    const userData = await kv.get(`user:${userId}`);
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (approved) {
      userData.verified = true;
      userData.verificationStatus = 'approved';
      userData.membershipActive = true;
    } else {
      userData.verificationStatus = 'rejected';
    }
    
    await kv.set(`user:${userId}`, userData);
    
    return c.json({ success: true, user: userData });
  } catch (error) {
    console.log(`Verify user error: ${error}`);
    return c.json({ error: 'Failed to verify user' }, 500);
  }
});

// Get pending verifications (admin only)
app.get('/make-server-12e720fa/admin/pending-verifications', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || !(await isAdmin(user.id))) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const allUsers = await kv.getByPrefix('user:');
    const pendingUsers = allUsers.filter((u: any) => u.verificationStatus === 'pending');
    
    return c.json({ users: pendingUsers || [] });
  } catch (error) {
    console.log(`Get pending verifications error: ${error}`);
    return c.json({ error: 'Failed to fetch pending verifications' }, 500);
  }
});

// ==================== CHATBOT ROUTES ====================

// Simple FAQ chatbot
app.post('/make-server-12e720fa/chatbot', async (c) => {
  try {
    const { question } = await c.req.json();
    
    const faqs = {
      'when': 'Our club meets every Wednesday at 7:00 PM in the Student Center.',
      'where': 'All sessions are held at the Student Center, Room 201.',
      'how to join': 'You can join by registering on this app! Just create an account and you\'re all set.',
      'attendance': 'You can check-in using the QR code shown at each session or by entering the session code.',
      'contact': 'You can reach us at mandarinclub@utm.edu or through our WhatsApp group.',
      'membership fee': 'Membership is free for all UTM students!',
      'activities': 'We organize language workshops, cultural events, movie nights, and conversation practice sessions.',
      'rsvp': 'You can RSVP to special events through the Events page in this app.'
    };
    
    const lowerQuestion = question.toLowerCase();
    let answer = 'I\'m not sure about that. Please contact our club admins at mandarinclub@utm.edu for more information.';
    
    for (const [keyword, response] of Object.entries(faqs)) {
      if (lowerQuestion.includes(keyword)) {
        answer = response;
        break;
      }
    }
    
    return c.json({ answer });
  } catch (error) {
    console.log(`Chatbot error: ${error}`);
    return c.json({ error: 'Chatbot error' }, 500);
  }
});

// ==================== USER PROFILE ROUTES ====================

// Get user profile
app.get('/make-server-12e720fa/profile/:userId', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    
    // Users can only view their own profile unless they're admin
    if (user.id !== userId && !(await isAdmin(user.id))) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    let profile = await kv.get(`user:${userId}`);
    
    // If profile doesn't exist, auto-create it
    if (!profile) {
      console.log(`Profile not found for user ${userId}, auto-creating...`);
      
      // Get user data from Supabase Auth
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      
      if (authUser?.user) {
        const role = authUser.user.user_metadata?.role || 'student';
        const name = authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User';
        
        // Create default profile
        const expiryDate = new Date();
        if (role === 'student') {
          expiryDate.setMonth(expiryDate.getMonth() - 1); // Expired for students
        } else {
          expiryDate.setMonth(expiryDate.getMonth() + 4);
        }
        
        profile = {
          id: userId,
          email: authUser.user.email,
          name: name,
          role: role,
          level: 1,
          membershipActive: false,
          membershipExpiry: expiryDate.toISOString(),
          createdAt: new Date().toISOString(),
          verified: role === 'student' ? true : false,
          verificationStatus: (role === 'committee' || role === 'tutor') ? 'pending' : 'approved'
        };
        
        // Save the auto-created profile
        await kv.set(`user:${userId}`, profile);
        console.log(`Auto-created profile for user ${userId}`);
      } else {
        console.log(`Could not fetch auth user ${userId}`);
        return c.json({ error: 'User not found' }, 404);
      }
    }
    
    return c.json({ profile });
  } catch (error) {
    console.log(`Get profile error: ${error}`);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

// ==================== MEMBERSHIP & PAYMENT ROUTES ====================

// Record payment and extend membership
app.post('/make-server-12e720fa/payment', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || !(await isAdmin(user.id))) {
      return c.json({ error: 'Unauthorized - Admin only' }, 401);
    }

    const { userId, amount, semester } = await c.req.json();
    
    // Get user data
    const userData = await kv.get(`user:${userId}`);
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Record payment
    const paymentId = `payment:${userId}:${Date.now()}`;
    await kv.set(paymentId, {
      id: paymentId,
      userId,
      amount,
      semester,
      level: userData.level,
      paidAt: new Date().toISOString()
    });

    // Extend membership by 4 months
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 4);
    
    userData.membershipActive = true;
    userData.membershipExpiry = expiryDate.toISOString();
    await kv.set(`user:${userId}`, userData);

    return c.json({ success: true, payment: paymentId, expiry: expiryDate });
  } catch (error) {
    console.log(`Payment error: ${error}`);
    return c.json({ error: 'Payment processing failed' }, 500);
  }
});

// Process payment (student self-service)
app.post('/make-server-12e720fa/payment/process', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const paymentData = await c.req.json();
    const userId = paymentData.userId;

    // Verify user is processing their own payment
    if (user.id !== userId) {
      return c.json({ error: 'Unauthorized - Can only process own payment' }, 401);
    }
    
    // Get user data
    const userData = await kv.get(`user:${userId}`);
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Only students need to pay registration fee
    if (userData.role !== 'student') {
      return c.json({ error: 'Payment is only required for students. Other roles get membership through admin approval.' }, 400);
    }

    // Record payment
    const paymentId = `payment:${userId}:${Date.now()}`;
    const paymentRecord = {
      id: paymentId,
      userId,
      amount: paymentData.amount || 50,
      paymentMethod: paymentData.paymentMethod,
      name: paymentData.name,
      email: paymentData.email,
      phoneNumber: paymentData.phoneNumber || '',
      referenceNumber: paymentData.referenceNumber || '',
      level: userData.level,
      paidAt: new Date().toISOString(),
      status: 'completed'
    };
    
    await kv.set(paymentId, paymentRecord);

    // Extend membership by 4 months (1 semester)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 4);
    
    // Update user profile
    userData.membershipActive = true;
    userData.membershipExpiry = expiryDate.toISOString();
    
    // Optionally advance level after payment
    if (userData.level < 5) {
      userData.level = userData.level + 1;
    }
    
    await kv.set(`user:${userId}`, userData);

    console.log(`Payment processed successfully for user ${userId}. New level: ${userData.level}, Expiry: ${expiryDate.toISOString()}`);

    return c.json({ 
      success: true, 
      payment: paymentRecord,
      expiry: expiryDate.toISOString(),
      newLevel: userData.level
    });
  } catch (error) {
    console.error(`Payment processing error: ${error}`);
    return c.json({ error: 'Payment processing failed' }, 500);
  }
});

// Get payment history
app.get('/make-server-12e720fa/payments/:userId', async (c) => {
  try {
    console.log('GET /payments/:userId - Request received');
    const user = await verifyAuth(c.req.raw);
    console.log('GET /payments/:userId - User verified:', user ? user.id : 'null');
    
    if (!user) {
      console.log('GET /payments/:userId - Unauthorized: no user');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    console.log('GET /payments/:userId - Requested userId:', userId);
    console.log('GET /payments/:userId - Authenticated userId:', user.id);
    console.log('GET /payments/:userId - User IDs match:', user.id === userId);
    
    // Users can only view their own payments unless they're admin
    const isAdminUser = await isAdmin(user.id);
    console.log('GET /payments/:userId - Is admin:', isAdminUser);
    
    if (user.id !== userId && !isAdminUser) {
      console.log('GET /payments/:userId - Unauthorized: user mismatch');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('GET /payments/:userId - Fetching payments with prefix: payment:${userId}:');
    const payments = await kv.getByPrefix(`payment:${userId}:`);
    console.log('GET /payments/:userId - Found payments:', payments?.length || 0);
    return c.json({ payments: payments || [] });
  } catch (error) {
    console.log(`Get payments error: ${error}`);
    console.error('Get payments detailed error:', error);
    return c.json({ error: 'Failed to fetch payments' }, 500);
  }
});

// ==================== ASSESSMENT ROUTES ====================

// Create assessment (quiz or exam) - Admin only
app.post('/make-server-12e720fa/assessments', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || !(await isAdmin(user.id))) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { title, type, level, passingScore, questions, dueDate } = await c.req.json();
    const assessmentId = `assessment:${Date.now()}`;
    
    const assessment = {
      id: assessmentId,
      title,
      type, // 'quiz' or 'exam'
      level, // Which level this assessment is for (1-5)
      passingScore,
      questions, // Array of questions
      dueDate,
      createdAt: new Date().toISOString()
    };

    await kv.set(assessmentId, assessment);
    return c.json({ success: true, assessment });
  } catch (error) {
    console.log(`Create assessment error: ${error}`);
    return c.json({ error: 'Failed to create assessment' }, 500);
  }
});

// Get assessments
app.get('/make-server-12e720fa/assessments', async (c) => {
  try {
    const assessments = await kv.getByPrefix('assessment:');
    return c.json({ assessments: assessments || [] });
  } catch (error) {
    console.log(`Get assessments error: ${error}`);
    return c.json({ error: 'Failed to fetch assessments' }, 500);
  }
});

// Submit assessment
app.post('/make-server-12e720fa/assessments/submit', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { assessmentId, answers, score } = await c.req.json();
    
    const assessment = await kv.get(assessmentId);
    if (!assessment) {
      return c.json({ error: 'Assessment not found' }, 404);
    }

    const submissionId = `submission:${user.id}:${assessmentId}`;
    const passed = score >= assessment.passingScore;
    
    const submission = {
      id: submissionId,
      userId: user.id,
      assessmentId,
      answers,
      score,
      passed,
      submittedAt: new Date().toISOString()
    };

    await kv.set(submissionId, submission);

    // If exam passed and it's for their current level, check if they can level up
    if (passed && assessment.type === 'exam') {
      const userData = await kv.get(`user:${user.id}`);
      if (userData && assessment.level === userData.level) {
        // Check if all quizzes for this level are also passed
        const allSubmissions = await kv.getByPrefix(`submission:${user.id}:`);
        const levelAssessments = await kv.getByPrefix('assessment:');
        
        const levelQuizzes = levelAssessments.filter((a: any) => 
          a.type === 'quiz' && a.level === userData.level
        );
        
        const passedQuizzes = levelQuizzes.filter((quiz: any) => {
          const quizSubmission = allSubmissions.find((s: any) => 
            s.assessmentId === quiz.id && s.passed
          );
          return !!quizSubmission;
        });

        // If all quizzes passed and exam passed, level up
        if (passedQuizzes.length === levelQuizzes.length && userData.level < 5) {
          userData.level += 1;
          await kv.set(`user:${user.id}`, userData);
          
          // Create certificate
          const certId = `certificate:${user.id}:${userData.level - 1}`;
          await kv.set(certId, {
            id: certId,
            userId: user.id,
            level: userData.level - 1,
            issuedAt: new Date().toISOString(),
            studentName: userData.name
          });
        }
      }
    }

    return c.json({ success: true, submission, passed });
  } catch (error) {
    console.log(`Submit assessment error: ${error}`);
    return c.json({ error: 'Failed to submit assessment' }, 500);
  }
});

// Get user submissions
app.get('/make-server-12e720fa/submissions/:userId', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    
    if (user.id !== userId && !(await isAdmin(user.id))) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const submissions = await kv.getByPrefix(`submission:${userId}:`);
    return c.json({ submissions: submissions || [] });
  } catch (error) {
    console.log(`Get submissions error: ${error}`);
    return c.json({ error: 'Failed to fetch submissions' }, 500);
  }
});

// Get user certificates
app.get('/make-server-12e720fa/certificates/:userId', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    
    if (user.id !== userId && !(await isAdmin(user.id))) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const certificates = await kv.getByPrefix(`certificate:${userId}:`);
    return c.json({ certificates: certificates || [] });
  } catch (error) {
    console.log(`Get certificates error: ${error}`);
    return c.json({ error: 'Failed to fetch certificates' }, 500);
  }
});

// ==================== GRADING ROUTES (Tutor only) ====================

// Submit grade for student (Tutor only)
app.post('/make-server-12e720fa/grades', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || !(await isTutor(user.id))) {
      return c.json({ error: 'Unauthorized - Tutor access required' }, 401);
    }

    const { studentId, assessmentType, grade, level } = await c.req.json();
    
    // Validate grade
    if (grade < 0 || grade > 100) {
      return c.json({ error: 'Grade must be between 0 and 100' }, 400);
    }

    // Validate assessment type
    const validTypes = ['assignment', 'quiz', 'project', 'exam'];
    if (!validTypes.includes(assessmentType)) {
      return c.json({ error: 'Invalid assessment type' }, 400);
    }

    // Create grade record
    const gradeId = `grade:${studentId}:${assessmentType}:${Date.now()}`;
    const gradeRecord = {
      id: gradeId,
      studentId,
      tutorId: user.id,
      assessmentType,
      grade,
      level,
      gradedAt: new Date().toISOString()
    };

    await kv.set(gradeId, gradeRecord);

    return c.json({ success: true, grade: gradeRecord });
  } catch (error) {
    console.log(`Submit grade error: ${error}`);
    return c.json({ error: 'Failed to submit grade' }, 500);
  }
});

// Get grades for a student
app.get('/make-server-12e720fa/grades/:studentId', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const studentId = c.req.param('studentId');
    
    // Students can view their own grades, tutors and admins can view all
    const hasPermission = user.id === studentId || await isTutor(user.id) || await isAdmin(user.id);
    if (!hasPermission) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const grades = await kv.getByPrefix(`grade:${studentId}:`);
    return c.json({ grades: grades || [] });
  } catch (error) {
    console.log(`Get grades error: ${error}`);
    return c.json({ error: 'Failed to fetch grades' }, 500);
  }
});

// ==================== TUTOR CLASS ASSIGNMENT ROUTES ====================

// Assign tutor to a class (Admin and Committee can assign)
app.post('/make-server-12e720fa/admin/assign-class', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    const hasPermission = await isAdmin(user?.id) || await isCommittee(user?.id);
    if (!user || !hasPermission) {
      return c.json({ error: 'Unauthorized - Admin or Committee only' }, 401);
    }

    const { tutorId, className, level } = await c.req.json();

    // Validate class name format (HYB01-HYB05)
    const validClasses = ['HYB01', 'HYB02', 'HYB03', 'HYB04', 'HYB05'];
    if (!validClasses.includes(className)) {
      return c.json({ error: 'Invalid class name. Must be HYB01-HYB05' }, 400);
    }

    // Verify tutor exists and is a tutor
    const tutorData = await kv.get(`user:${tutorId}`);
    if (!tutorData || tutorData.role !== 'tutor') {
      return c.json({ error: 'User is not a tutor' }, 400);
    }

    // Update tutor data with assigned class
    tutorData.assignedClass = className;
    tutorData.assignedLevel = level;
    await kv.set(`user:${tutorId}`, tutorData);

    // Also create a class record for easy lookup
    const classId = `class:${className}`;
    const classData = {
      id: classId,
      className,
      level,
      tutorId,
      tutorName: tutorData.name,
      createdAt: new Date().toISOString()
    };
    await kv.set(classId, classData);

    return c.json({ success: true, class: classData });
  } catch (error) {
    console.log(`Assign class error: ${error}`);
    return c.json({ error: 'Failed to assign class' }, 500);
  }
});

// Get all classes
app.get('/make-server-12e720fa/classes', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const classes = await kv.getByPrefix('class:');
    return c.json({ classes: classes || [] });
  } catch (error) {
    console.log(`Get classes error: ${error}`);
    return c.json({ error: 'Failed to fetch classes' }, 500);
  }
});

// Get tutor's assigned class
app.get('/make-server-12e720fa/tutor/my-class', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || !(await isTutor(user.id))) {
      return c.json({ error: 'Unauthorized - Tutor only' }, 401);
    }

    const tutorData = await kv.get(`user:${user.id}`);
    if (!tutorData?.assignedClass) {
      return c.json({ class: null, students: [] });
    }

    // Get students in this level
    const allUsers = await kv.getByPrefix('user:');
    const students = allUsers.filter((u: any) => 
      u.role === 'student' && u.level === tutorData.assignedLevel
    );

    // Get attendance for this class
    const attendanceRecords = await kv.getByPrefix('attendance:');
    const classAttendance = attendanceRecords.filter((a: any) => 
      a.className === tutorData.assignedClass
    );

    return c.json({ 
      class: {
        className: tutorData.assignedClass,
        level: tutorData.assignedLevel
      },
      students,
      attendance: classAttendance
    });
  } catch (error) {
    console.log(`Get tutor class error: ${error}`);
    return c.json({ error: 'Failed to fetch tutor class' }, 500);
  }
});

// Record class attendance (update check-in to include class info)
app.post('/make-server-12e720fa/checkin/class', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { sessionCode, className } = await c.req.json();

    // Verify session code exists
    const events = await kv.getByPrefix('event:');
    const event = events.find((e: any) => e.sessionCode === sessionCode);
    
    if (!event) {
      return c.json({ error: 'Invalid session code' }, 404);
    }

    // Record attendance with class info
    const attendanceId = `attendance:${user.id}:${event.id}:${Date.now()}`;
    const attendance = {
      id: attendanceId,
      userId: user.id,
      eventId: event.id,
      eventTitle: event.title,
      className: className || null,
      checkedInAt: new Date().toISOString()
    };

    await kv.set(attendanceId, attendance);

    return c.json({ success: true, attendance, event });
  } catch (error) {
    console.log(`Check-in error: ${error}`);
    return c.json({ error: 'Check-in failed' }, 500);
  }
});

// ==================== ADMIN UTILITY ROUTES ====================

// Reset all student/committee memberships to expired (Admin only - one-time migration)
app.post('/make-server-12e720fa/admin/reset-memberships', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || !(await isAdmin(user.id))) {
      return c.json({ error: 'Unauthorized - Admin only' }, 401);
    }

    // Get all users
    const allUsers = await kv.getByPrefix('user:');
    let resetCount = 0;
    const expiredDate = new Date();
    expiredDate.setMonth(expiredDate.getMonth() - 1); // 1 month ago

    for (const userData of allUsers) {
      // Skip admins - they keep their active membership
      if (userData.role === 'admin') {
        continue;
      }

      // Reset students and committee members to expired membership
      if (userData.role === 'student' || userData.role === 'committee') {
        userData.membershipActive = false;
        userData.membershipExpiry = expiredDate.toISOString();
        await kv.set(`user:${userData.id}`, userData);
        resetCount++;
      }
    }

    console.log(`Reset ${resetCount} memberships to expired status`);
    return c.json({ 
      success: true, 
      message: `Successfully reset ${resetCount} memberships`,
      resetCount 
    });
  } catch (error) {
    console.log(`Reset memberships error: ${error}`);
    return c.json({ error: 'Failed to reset memberships' }, 500);
  }
});

// Catch-all route for debugging
app.all('*', (c) => {
  console.log(`Unmatched route: ${c.req.method} ${c.req.url}`);
  return c.json({ 
    error: 'Route not found',
    method: c.req.method,
    url: c.req.url,
    path: new URL(c.req.url).pathname
  }, 404);
});

Deno.serve(app.fetch);