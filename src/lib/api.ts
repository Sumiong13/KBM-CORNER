// Supabase-based API client for cross-device sync
import { 
  getAllUsers, 
  saveUserProfile, 
  getUserProfile,
  getAllEvents,
  saveEvent,
  updateEvent,
  deleteEvent as deleteEventFromStorage,
  saveAttendance,
  getUserAttendance,
  getAllAttendance,
  saveRSVP,
  deleteRSVP,
  getUserRSVPs,
  isUserRSVPed,
  savePayment,
  getPayments,
  generateId
} from './supabaseStorage';
import { aiService } from './aiService';

export class ApiClient {
  private accessToken: string | null = null;
  private currentUserId: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  setCurrentUser(userId: string | null) {
    this.currentUserId = userId;
  }

  // Events
  async getEvents() {
    const events = await getAllEvents();
    return { events };
  }

  async createEvent(event: any) {
    const newEvent = {
      id: generateId(), // Generate proper UUID
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.venue || event.location || '',
      venue: event.venue || event.location || '',
      sessionCode: this.generateSessionCode(),
      type: event.type || 'event',
      createdBy: this.currentUserId || 'system',
      createdAt: new Date().toISOString(),
    };

    await saveEvent(newEvent);
    return { success: true, event: newEvent };
  }

  async updateEvent(eventId: string, updates: any) {
    const eventUpdates: any = {};
    
    if (updates.title) eventUpdates.title = updates.title;
    if (updates.description) eventUpdates.description = updates.description;
    if (updates.date) eventUpdates.date = updates.date;
    if (updates.time !== undefined) eventUpdates.time = updates.time;
    if (updates.venue || updates.location) {
      eventUpdates.location = updates.venue || updates.location;
    }
    if (updates.type) eventUpdates.type = updates.type;
    if (updates.sessionCode) eventUpdates.sessionCode = updates.sessionCode;

    await updateEvent(eventId, eventUpdates);
    return { success: true };
  }

  async deleteEvent(eventId: string) {
    await deleteEventFromStorage(eventId);
    return { success: true };
  }

  // Attendance
  async checkIn(sessionCode?: string, eventId?: string) {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    // Validate session code
    if (!sessionCode) {
      throw new Error('Session code is required');
    }

    // Check if it's an event or class session code
    const events = await getAllEvents();
    const event = events.find(e => e.sessionCode === sessionCode.toUpperCase());
    
    if (!event) {
      // Try to find it as a class code
      const classes = JSON.parse(localStorage.getItem('classes') || '[]');
      const classMatch = classes.find((c: any) => c.className === sessionCode.toUpperCase());
      
      if (!classMatch) {
        throw new Error('Invalid session code. Please check and try again.');
      }
      
      // Record class attendance
      return this.recordClassAttendance(sessionCode.toUpperCase(), classMatch.className);
    }

    // Check for duplicate attendance
    const existingAttendance = await getUserAttendance(this.currentUserId);
    const alreadyCheckedIn = existingAttendance.some((a: any) => 
      a.eventId === event.id || (a.sessionCode && a.sessionCode === sessionCode.toUpperCase())
    );
    
    if (alreadyCheckedIn) {
      throw new Error('You have already checked in for this event.');
    }

    // Record event attendance
    const attendance = {
      id: generateId(),
      userId: this.currentUserId,
      eventId: event.id,
      eventTitle: event.title,
      sessionCode: sessionCode.toUpperCase(),
      type: 'event' as const,
      checkedInAt: new Date().toISOString(),
    };

    await saveAttendance(attendance);
    return { success: true, attendance };
  }

  async getAttendance(userId: string) {
    const attendance = await getUserAttendance(userId);
    return { attendance };
  }

  async recordClassAttendance(sessionCode: string, className: string) {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    // Check for duplicate attendance for this class session today
    const existingAttendance = await getUserAttendance(this.currentUserId);
    const today = new Date().toDateString();
    const alreadyCheckedInToday = existingAttendance.some((a: any) => {
      const attendanceDate = new Date(a.checkedInAt).toDateString();
      return (
        (a.className === className || a.sessionCode === sessionCode) && 
        attendanceDate === today
      );
    });
    
    if (alreadyCheckedInToday) {
      throw new Error('You have already checked in for this class today.');
    }

    const attendance = {
      id: generateId(),
      userId: this.currentUserId,
      sessionCode,
      className,
      type: 'class' as const,
      checkedInAt: new Date().toISOString(),
    };

    await saveAttendance(attendance);
    return { success: true, attendance };
  }

  // RSVP
  async rsvpEvent(eventId: string) {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    const rsvp = {
      id: generateId(),
      userId: this.currentUserId,
      eventId,
      rsvpedAt: new Date().toISOString(),
    };

    await saveRSVP(rsvp);
    return { success: true, rsvp };
  }

  async cancelRsvp(eventId: string) {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    await deleteRSVP(this.currentUserId, eventId);
    return { success: true };
  }

  async getUserRsvps(userId: string) {
    const rsvps = await getUserRSVPs(userId);
    return { rsvps };
  }

  // Admin
  async getAdminStats() {
    const users = await getAllUsers();
    const events = await getAllEvents();
    const attendance = await getAllAttendance();

    const stats = {
      totalUsers: users.length,
      totalStudents: users.filter(u => u.role === 'student').length,
      totalEvents: events.length,
      totalAttendance: attendance.length,
    };

    return { stats };
  }

  async getAllUsers() {
    const users = await getAllUsers();
    return { users };
  }

  async updateUserRole(userId: string, role: string) {
    const profile = await getUserProfile(userId);
    if (profile) {
      await saveUserProfile(userId, { ...profile, role: role as any });
    }
    return { success: true };
  }

  async updateUserProfile(userId: string, updates: any) {
    const profile = await getUserProfile(userId);
    if (profile) {
      await saveUserProfile(userId, { ...profile, ...updates });
    }
    return { success: true };
  }

  async deleteUser(userId: string) {
    // Note: In Supabase, we might want to soft delete or just remove from profiles
    // For now, we'll use the storage deleteUser if available
    const profile = await getUserProfile(userId);
    if (profile) {
      // Mark as deleted instead of actually deleting
      await saveUserProfile(userId, { ...profile, deleted: true });
    }
    return { success: true };
  }

  async verifyUser(userId: string, approved: boolean) {
    const profile = await getUserProfile(userId);
    if (profile) {
      await saveUserProfile(userId, {
        ...profile,
        verified: approved,
        verificationStatus: approved ? 'approved' : 'rejected',
      });
    }
    return { success: true };
  }

  async getPendingVerifications() {
    const allUsers = await getAllUsers();
    const users = allUsers.filter(
      u => (u.role === 'committee' || u.role === 'tutor') && !u.verified
    );
    return { users };
  }

  async recordPayment(userId: string, amount: number, paymentType: string) {
    console.log('[recordPayment] Starting payment recording for user:', userId);
    
    // Admin function to record offline payments (cash/bank transfer)
    const profile = await getUserProfile(userId);
    console.log('[recordPayment] User profile fetched:', profile);
    
    if (!profile) {
      throw new Error('User profile not found');
    }

    // Create payment record
    const payment = {
      id: generateId(),
      userId: userId,
      amount: amount,
      level: profile.membershipLevel || 1,
      paymentMethod: 'offline',
      paymentType: paymentType,
      referenceNumber: `OFFLINE-${Date.now()}`,
      status: 'completed',
      paidAt: new Date().toISOString(),
    };

    console.log('[recordPayment] Saving payment record:', payment);
    await savePayment(userId, payment);
    console.log('[recordPayment] Payment record saved successfully');

    // Calculate new expiry date (4 months from now or extend existing)
    let expiryDate = new Date();
    const currentExpiry = profile.membershipExpiry ? new Date(profile.membershipExpiry) : null;
    
    // If membership is still active, extend from current expiry, otherwise from today
    if (currentExpiry && currentExpiry > new Date()) {
      expiryDate = currentExpiry;
    }
    
    expiryDate.setMonth(expiryDate.getMonth() + 4); // Add 4 months
    console.log('[recordPayment] Calculated new expiry date:', expiryDate.toISOString());

    // Update user profile with new expiry date
    const updatedProfile = {
      ...profile,
      membershipExpiry: expiryDate.toISOString(),
    };
    
    console.log('[recordPayment] Updating user profile in Supabase with:', updatedProfile);
    await saveUserProfile(userId, updatedProfile);
    console.log('[recordPayment] User profile updated successfully in Supabase!');

    return { success: true, payment, expiryDate: expiryDate.toISOString() };
  }

  async resetAllMemberships() {
    // Admin utility to reset all memberships to expired
    const allUsers = await getAllUsers();
    let resetCount = 0;

    for (const user of allUsers) {
      // Skip admins
      if (user.role === 'admin') continue;

      // Set membership to expired (1 day ago)
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      await saveUserProfile(user.id, {
        ...user,
        membershipExpiry: expiredDate.toISOString(),
      });

      resetCount++;
    }

    return { success: true, resetCount };
  }

  // Chatbot
  async askChatbot(question: string) {
    // Try AI first if configured
    if (aiService.isConfigured()) {
      try {
        const aiResponse = await aiService.ask(question, this.currentUserId || 'default');
        return { answer: aiResponse.answer, provider: aiResponse.provider };
      } catch (aiError: any) {
        // Silently fall back to pattern matching - no console logs to avoid confusion
        // This is expected behavior when no API key is configured
      }
    }
    
    // Fallback: Intelligent FAQ response system with pattern matching
    const lowerQuestion = question.toLowerCase();
    
    // Enhanced pattern matching with multiple categories
    const patterns = {
      // Membership & Registration
      membership: {
        keywords: ['membership', 'join', 'sign up', 'register', 'fee', 'price', 'cost', 'how much', 'pay', 'payment'],
        responses: [
          {
            match: ['fee', 'cost', 'price', 'how much', 'payment amount'],
            answer: "💰 **Membership Fees:**\n\n• **Students:** RM50 per semester\n• **Committee Members:** FREE (after admin verification)\n• **Tutors:** FREE (after admin verification)\n\nThe RM50 fee for students covers one full semester (4 months) and gives you access to all club activities, classes, and events!"
          },
          {
            match: ['how to join', 'sign up', 'register', 'become member'],
            answer: "📝 **How to Join UTM Mandarin Club:**\n\n1. Click 'Sign Up' on the login page\n2. Select your role (Student/Committee/Tutor)\n3. Fill in your details and create an account\n4. Verify your email with the code sent to you\n5. For students: Pay RM50 membership fee to get full access\n6. For committee/tutors: Wait for admin verification\n\nOnce approved, you can access all club features!"
          },
          {
            match: ['payment method', 'how to pay', 'pay membership'],
            answer: "💳 **Payment Methods:**\n\n• **Bank Transfer:** Direct transfer to club account\n• **Credit/Debit Card:** Secure online payment\n\nAfter payment, your membership activates immediately and you'll get full access to attend classes, take assessments, and join events!"
          }
        ]
      },
      
      // Level System
      levels: {
        keywords: ['level', 'proficiency', 'assessment', 'test', 'exam', 'progress', 'advance', 'upgrade'],
        responses: [
          {
            match: ['how many level', 'what level', 'level system'],
            answer: "📊 **5-Level Proficiency System:**\n\n• **Level 1:** Beginner - Basic greetings and introductions\n• **Level 2:** Elementary - Simple conversations\n• **Level 3:** Intermediate - Daily communication\n• **Level 4:** Advanced - Complex discussions\n• **Level 5:** Expert - Fluent proficiency\n\nYou start at Level 1 and advance by passing assessments!"
          },
          {
            match: ['how to advance', 'level up', 'next level', 'progress', 'upgrade level'],
            answer: "🎯 **How to Advance Levels:**\n\n1. Complete your current level's coursework\n2. Attend classes regularly (tracked via QR check-in)\n3. Take the assessment test when ready\n4. Score 70% or higher to pass\n5. Your tutor will review and approve your advancement\n\n⚠️ Note: Payment does NOT increase your level - only passing assessments does!"
          },
          {
            match: ['assessment', 'test', 'exam', 'quiz'],
            answer: "📝 **Assessments & Tests:**\n\nAssessments test your Mandarin proficiency at each level. To take an assessment:\n\n1. Go to 'Assessments' tab in your dashboard\n2. Complete the test for your current level\n3. Submit your answers\n4. Your assigned tutor will grade it\n5. Pass with 70%+ to advance to the next level\n\nYou can view your scores and progress in the Assessments section!"
          }
        ]
      },
      
      // Events & Activities
      events: {
        keywords: ['event', 'activity', 'activities', 'calendar', 'what do', 'program', 'schedule'],
        responses: [
          {
            match: ['what event', 'what activities', 'what do you do'],
            answer: "🎉 **UTM Mandarin Club Activities:**\n\n• **Cultural Workshops:** Calligraphy, tea ceremony, etc.\n• **Language Classes:** Regular Mandarin lessons\n• **Festival Celebrations:** Chinese New Year, Mid-Autumn, etc.\n• **Social Events:** Gatherings and networking\n• **Competitions:** Speech contests, talent shows\n\nCheck the Events Calendar to see upcoming activities and RSVP!"
          },
          {
            match: ['rsvp', 'join event', 'attend event', 'register event'],
            answer: "✅ **How to RSVP for Events:**\n\n1. Go to 'Events' tab in your dashboard\n2. Browse upcoming events\n3. Click on an event to view details\n4. Click 'RSVP' button to register\n5. You'll receive notifications about venue changes and reminders\n\nYou can manage your RSVPs in the Events Calendar!"
          }
        ]
      },
      
      // Attendance & Check-in
      attendance: {
        keywords: ['attendance', 'check in', 'checkin', 'qr code', 'scan', 'session code', 'present'],
        responses: [
          {
            match: ['how to check in', 'attendance', 'mark present'],
            answer: "📱 **Check-in Methods:**\n\n**Method 1: QR Code**\n• Scan the QR code displayed at the event/class\n• Automatic check-in confirmation\n\n**Method 2: Session Code**\n• Enter the 6-digit code provided by your tutor\n• Click 'Check In' to confirm attendance\n\nYour attendance is tracked and visible in your dashboard!"
          },
          {
            match: ['qr code', 'scan code'],
            answer: "🔲 **QR Code Check-in:**\n\n1. Open your camera app or QR scanner\n2. Point at the QR code displayed at the venue\n3. Tap the notification to open the link\n4. You'll be automatically checked in\n\nQR codes are generated by tutors for classes and committee members for events!"
          },
          {
            match: ['session code', 'code not work', 'invalid code'],
            answer: "🔢 **Session Code Info:**\n\nSession codes are 6-character codes (letters/numbers) provided by your tutor or displayed at events.\n\n**If code doesn't work:**\n• Check for typos (codes are case-insensitive)\n• Make sure you're using the current code\n• Ask your tutor/event organizer for the correct code\n• Ensure you haven't already checked in\n\nEach code can only be used once per person!"
          }
        ]
      },
      
      // Classes & Tutors
      classes: {
        keywords: ['class', 'tutor', 'teacher', 'lesson', 'when meet', 'time', 'schedule', 'where'],
        responses: [
          {
            match: ['when meet', 'class time', 'schedule', 'when class'],
            answer: "🕐 **Class Schedule:**\n\nClass schedules vary by level and tutor. To find your class schedule:\n\n1. Check your assigned class in the dashboard\n2. Contact your assigned tutor for specific times\n3. Look at the Events Calendar for class sessions\n\nTypically, classes run weekly during the semester. Check in regularly for updates!"
          },
          {
            match: ['where', 'location', 'venue', 'place'],
            answer: "📍 **Class Locations:**\n\nClasses are held at various locations on UTM campus. Common venues include:\n\n• Language Learning Center\n• Student Activity Center\n• Designated classrooms\n\nSpecific venues are announced in the Events Calendar and by your tutor. You'll receive notifications about any venue changes!"
          },
          {
            match: ['tutor', 'teacher', 'who teach', 'instructor'],
            answer: "👨‍🏫 **Our Tutors:**\n\nAll tutors are verified by club admins and are experienced in teaching Mandarin.\n\n• Tutors are assigned to specific classes\n• They grade assessments and track progress\n• They generate QR codes for attendance\n• They provide learning support\n\nYou'll be assigned a tutor when you join a class!"
          }
        ]
      },
      
      // Committee & Roles
      committee: {
        keywords: ['committee', 'role', 'admin', 'organizer', 'volunteer'],
        responses: [
          {
            match: ['committee', 'become committee', 'join committee'],
            answer: "🤝 **Committee Members:**\n\nCommittee members help organize and manage club activities!\n\n**Benefits:**\n• FREE membership (no RM50 fee)\n• Create and manage events\n• Generate event QR codes\n• Help shape club activities\n\n**To Join:**\n1. Sign up as 'Committee' during registration\n2. Wait for admin verification\n3. Once approved, access committee dashboard\n\nWe're always looking for enthusiastic volunteers!"
          },
          {
            match: ['tutor role', 'become tutor', 'teach'],
            answer: "👩‍🏫 **Becoming a Tutor:**\n\nTutors play a vital role in teaching Mandarin!\n\n**Benefits:**\n• FREE membership\n• Teach and mentor students\n• Grade assessments\n• Manage class attendance\n\n**Requirements:**\n1. Sign up as 'Tutor' during registration\n2. Wait for admin verification\n3. Demonstrate Mandarin proficiency\n4. Once approved, get assigned to classes\n\nHelp others learn while practicing your skills!"
          }
        ]
      },
      
      // Technical Help
      technical: {
        keywords: ['problem', 'error', 'not work', 'cannot', 'bug', 'issue', 'help', 'support'],
        responses: [
          {
            match: ['cannot login', 'login problem', 'password'],
            answer: "🔐 **Login Issues:**\n\n**Forgot Password?**\n• Click 'Forgot Password?' on login page\n• Enter your email\n• Check email for reset link\n\n**Account Not Verified?**\n• Check email for verification code\n• Committee/Tutor: Wait for admin approval\n\n**Still having issues?**\nContact: utmmandarinclub@gmail.com"
          },
          {
            match: ['not work', 'error', 'bug', 'problem', 'issue'],
            answer: "⚠️ **Technical Support:**\n\nIf you're experiencing technical issues:\n\n1. Try refreshing the page\n2. Clear your browser cache\n3. Try a different browser\n4. Check your internet connection\n5. Log out and log back in\n\nIf problems persist, contact our admin team at:\n📧 utmmandarinclub@gmail.com\n\nPlease describe the issue in detail!"
          }
        ]
      },
      
      // General Info
      general: {
        keywords: ['about', 'what is', 'who are', 'mission', 'goal', 'contact', 'email'],
        responses: [
          {
            match: ['about', 'what is utm mandarin', 'who are you'],
            answer: "🏫 **About UTM Mandarin Club:**\n\nWe're a student organization dedicated to promoting Mandarin language and Chinese culture at UTM!\n\n**Our Mission:**\n• Provide quality Mandarin education\n• Celebrate Chinese culture\n• Build a supportive learning community\n• Organize cultural events and activities\n\nJoin us to learn, practice, and enjoy Mandarin together! 🇨🇳"
          },
          {
            match: ['contact', 'email', 'reach', 'get in touch'],
            answer: "📞 **Contact Us:**\n\n📧 Email: utmmandarinclub@gmail.com\n🏫 Location: UTM Campus\n\n**For specific inquiries:**\n• Membership: Check 'Membership' tab\n• Events: Check Events Calendar\n• Technical: Email our admin team\n• General: Ask me here!\n\nWe typically respond within 1-2 business days."
          }
        ]
      }
    };
    
    // Find the best matching response
    let bestMatch: { answer: string; confidence: number } | null = null;
    
    for (const [category, data] of Object.entries(patterns)) {
      // Check if question contains category keywords
      const hasCategoryKeyword = data.keywords.some(keyword => 
        lowerQuestion.includes(keyword)
      );
      
      if (hasCategoryKeyword) {
        // Check specific responses within the category
        for (const response of data.responses) {
          const matchCount = response.match.filter(pattern => 
            lowerQuestion.includes(pattern)
          ).length;
          
          if (matchCount > 0) {
            const confidence = matchCount / response.match.length;
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = { answer: response.answer, confidence };
            }
          }
        }
      }
    }
    
    // If we found a good match, return it
    if (bestMatch && bestMatch.confidence > 0) {
      return { answer: bestMatch.answer };
    }
    
    // Fallback responses for common greetings
    if (lowerQuestion.match(/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))/)) {
      return { 
        answer: "👋 Hello! I'm the UTM Mandarin Club Assistant. I'm here to help you with:\n\n• Membership & registration\n• Level system & assessments\n• Events & activities\n• Attendance & check-in\n• Classes & schedules\n• Payment information\n\nWhat would you like to know?" 
      };
    }
    
    if (lowerQuestion.match(/^(thanks|thank you|appreciate)/)) {
      return { 
        answer: "You're welcome! 😊 If you have any other questions about UTM Mandarin Club, feel free to ask. Happy learning! 🎓" 
      };
    }
    
    if (lowerQuestion.match(/^(bye|goodbye|see you|farewell)/)) {
      return { 
        answer: "再见 (Zàijiàn)! See you around the club! 👋 Feel free to come back anytime you have questions. Happy learning! 🎓" 
      };
    }
    
    // Default response with helpful suggestions
    return { 
      answer: "🤔 I'm not quite sure about that, but I'm here to help with:\n\n📚 **Popular Topics:**\n• \"How much is membership?\" - Fees & payment\n• \"How to join?\" - Registration process\n• \"What are the levels?\" - Proficiency system\n• \"How to check in?\" - Attendance tracking\n• \"What events do you have?\" - Activities & calendar\n• \"How to advance levels?\" - Assessment process\n• \"When do you meet?\" - Class schedules\n• \"How to RSVP?\" - Event registration\n\n💡 Try asking in a different way, or pick one of the topics above!\n\n📧 For specific questions, contact: utmmandarinclub@gmail.com"
    };
  }

  // Profile
  async getProfile(userId: string) {
    const profile = await getUserProfile(userId);
    return { profile };
  }

  async createUser(userData: any) {
    const userId = generateId();
    const profile = {
      id: userId,
      ...userData,
      createdAt: new Date().toISOString(),
    };
    await saveUserProfile(userId, profile);
    return { user: profile };
  }

  // Payment
  async processPayment(paymentData: any) {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    // Get current profile
    const currentProfile = await getUserProfile(this.currentUserId);
    if (!currentProfile) {
      throw new Error('User profile not found. Please log out and log back in.');
    }

    // For new users or users without a level, set to Level 1
    // Payment does NOT increase level - only passing assessments does
    const currentLevel = currentProfile.membershipLevel || 1;

    const payment = {
      id: generateId(),
      userId: this.currentUserId,
      amount: paymentData.amount,
      level: currentLevel, // Keep current level, don't increment
      paymentMethod: paymentData.paymentMethod,
      referenceNumber: paymentData.referenceNumber,
      status: 'completed',
      paidAt: new Date().toISOString(),
    };

    await savePayment(this.currentUserId, payment);

    // Update user membership - activate for 4 months but keep the same level
    const profile = await getUserProfile(this.currentUserId);
    if (profile) {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 4); // 4 months validity (1 semester)
      
      await saveUserProfile(this.currentUserId, {
        ...profile,
        membershipLevel: currentLevel, // Keep current level
        membershipExpiry: expiryDate.toISOString(),
      });

      // Also update individual localStorage keys for backward compatibility
      localStorage.setItem(`user_membership_level_${this.currentUserId}`, String(currentLevel));
      localStorage.setItem(`user_membership_expiry_${this.currentUserId}`, expiryDate.toISOString());
    }

    return { success: true, payment };
  }

  async getPayments(userId: string) {
    const payments = await getPayments(userId);
    return { payments };
  }

  // Assessments (stored in localStorage)
  async getAssessments() {
    const data = localStorage.getItem('assessments');
    const assessments = data ? JSON.parse(data) : [];
    return { assessments };
  }

  async createAssessment(assessment: any) {
    const assessments = (await this.getAssessments()).assessments;
    const newAssessment = {
      id: generateId(),
      ...assessment,
      createdAt: new Date().toISOString(),
    };
    assessments.push(newAssessment);
    localStorage.setItem('assessments', JSON.stringify(assessments));
    return { assessment: newAssessment };
  }

  async submitAssessment(assessmentId: string, answers: any[], score: number) {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    const submissions = this.getSubmissionsSync(this.currentUserId);
    const submission = {
      id: generateId(),
      userId: this.currentUserId,
      assessmentId,
      answers,
      score,
      submittedAt: new Date().toISOString(),
    };
    
    submissions.push(submission);
    localStorage.setItem(`submissions_${this.currentUserId}`, JSON.stringify(submissions));

    return { success: true, submission };
  }

  private getSubmissionsSync(userId: string) {
    const data = localStorage.getItem(`submissions_${userId}`);
    return data ? JSON.parse(data) : [];
  }

  async getSubmissions(userId: string) {
    const submissions = this.getSubmissionsSync(userId);
    return { submissions };
  }

  async getCertificates(userId: string) {
    const data = localStorage.getItem(`certificates_${userId}`);
    const certificates = data ? JSON.parse(data) : [];
    return { certificates };
  }

  // Grading (Tutor)
  async submitGrade(gradeData: { studentId: string; assessmentType: string; grade: number; level: number }) {
    const grades = this.getGradesSync(gradeData.studentId);
    const grade = {
      id: generateId(),
      ...gradeData,
      gradedAt: new Date().toISOString(),
      gradedBy: this.currentUserId,
    };
    
    grades.push(grade);
    localStorage.setItem(`grades_${gradeData.studentId}`, JSON.stringify(grades));

    // NOTE: Level up is now MANUAL only - tutors must verify at end of semester
    // Grades are recorded but do not automatically level up students
    // Tutors will review overall semester performance and approve level-up manually

    return { success: true, grade };
  }

  // Manual Level Up (Tutor only - End of Semester)
  async verifyLevelUp(studentId: string, approved: boolean, tutorNotes?: string) {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    const profile = await getUserProfile(studentId);
    if (!profile) {
      throw new Error('Student not found');
    }

    const currentLevel = profile.membershipLevel || 1;

    if (approved && currentLevel < 5) {
      const nextLevel = currentLevel + 1;
      
      // Level up the student
      await saveUserProfile(studentId, {
        ...profile,
        membershipLevel: nextLevel,
      });
      localStorage.setItem(`user_membership_level_${studentId}`, String(nextLevel));
      
      // Award certificate for completing the level
      this.awardCertificate(studentId, currentLevel);
      
      // Record the level verification
      this.recordLevelVerification(studentId, currentLevel, nextLevel, approved, tutorNotes);
      
      return { success: true, newLevel: nextLevel, message: `Student promoted to Level ${nextLevel}` };
    } else if (!approved) {
      // Record that student did not pass level
      this.recordLevelVerification(studentId, currentLevel, currentLevel, approved, tutorNotes);
      
      return { success: true, newLevel: currentLevel, message: 'Student remains at current level' };
    } else {
      return { success: false, message: 'Student is already at maximum level' };
    }
  }

  private recordLevelVerification(studentId: string, fromLevel: number, toLevel: number, approved: boolean, notes?: string) {
    const verifications = this.getLevelVerificationsSync(studentId);
    const verification = {
      id: generateId(),
      studentId,
      fromLevel,
      toLevel,
      approved,
      tutorId: this.currentUserId,
      tutorNotes: notes || '',
      verifiedAt: new Date().toISOString(),
    };
    
    verifications.push(verification);
    localStorage.setItem(`level_verifications_${studentId}`, JSON.stringify(verifications));
  }

  private getLevelVerificationsSync(studentId: string) {
    const data = localStorage.getItem(`level_verifications_${studentId}`);
    return data ? JSON.parse(data) : [];
  }

  async getLevelVerifications(studentId: string) {
    const verifications = this.getLevelVerificationsSync(studentId);
    return { verifications };
  }

  private awardCertificate(studentId: string, completedLevel: number) {
    const certificates = this.getCertificatesSync(studentId);
    const certificate = {
      id: generateId(),
      studentId,
      level: completedLevel,
      awardedAt: new Date().toISOString(),
      title: `Level ${completedLevel} Certification`,
      description: `Successfully completed Level ${completedLevel} - Verified by tutor`,
    };
    
    certificates.push(certificate);
    localStorage.setItem(`certificates_${studentId}`, JSON.stringify(certificates));
  }

  private getCertificatesSync(studentId: string) {
    const data = localStorage.getItem(`certificates_${studentId}`);
    return data ? JSON.parse(data) : [];
  }

  private getGradesSync(studentId: string) {
    const data = localStorage.getItem(`grades_${studentId}`);
    return data ? JSON.parse(data) : [];
  }

  async getGrades(studentId: string) {
    const grades = this.getGradesSync(studentId);
    return { grades };
  }

  // Class assignment (Admin)
  async assignClassToTutor(tutorId: string, classId: string) {
    console.log('[assignClassToTutor] Assigning class', classId, 'to tutor', tutorId);
    
    // Get the class details
    const { getClass, updateClass } = await import('./supabaseStorage');
    const classData = await getClass(classId);
    
    if (!classData) {
      throw new Error('Class not found');
    }

    console.log('[assignClassToTutor] Class data:', classData);

    // Update the class to assign the tutor
    await updateClass(classId, {
      tutorId: tutorId,
      tutorName: (await getUserProfile(tutorId))?.name || 'Unknown'
    });

    console.log('[assignClassToTutor] Successfully assigned tutor to class');
    
    return { success: true };
  }

  async getAllClasses() {
    const { getAllClasses } = await import('./supabaseStorage');
    const classes = await getAllClasses();
    return { classes };
  }

  async getClasses() {
    const { getAllClasses } = await import('./supabaseStorage');
    const classes = await getAllClasses();
    return { classes };
  }

  async getTutorClass() {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    console.log('[getTutorClass] Loading class for tutor:', this.currentUserId);

    const profile = await getUserProfile(this.currentUserId);
    console.log('[getTutorClass] Tutor profile:', profile);
    console.log('[getTutorClass] Tutor assignedClassId:', profile?.assignedClassId);
    
    if (!profile || !profile.assignedClassId) {
      console.log('[getTutorClass] No class assigned to this tutor');
      return { class: null, students: [], attendance: [] };
    }

    console.log('[getTutorClass] Fetching class with ID:', profile.assignedClassId);

    // Get the full class details from Supabase
    const { getClass } = await import('./supabaseStorage');
    const classData = await getClass(profile.assignedClassId);
    
    console.log('[getTutorClass] Class data fetched:', classData);
    
    if (!classData) {
      console.log('[getTutorClass] Class not found in database');
      return { class: null, students: [], attendance: [] };
    }

    // Get all users and filter students
    const allUsers = await getAllUsers();
    const students = allUsers.filter(u => u.role === 'student');

    // Get all attendance records for this class
    const allAttendance = await getAllAttendance();
    const classAttendance = allAttendance.filter(a => 
      a.className === classData.className || a.sessionCode === classData.className
    );

    console.log('[getTutorClass] Returning class data with', students.length, 'students and', classAttendance.length, 'attendance records');

    return {
      class: {
        id: classData.id,
        className: classData.className,
        level: classData.level,
        description: classData.description,
        schedule: classData.schedule,
        venue: classData.venue,
        capacity: classData.capacity,
      },
      students: students,
      attendance: classAttendance,
    };
  }

  // Get RSVPs for a specific event with user details
  async getEventRsvps(eventId: string) {
    const { getAllRSVPs } = await import('./supabaseStorage');
    const allRsvps = await getAllRSVPs();
    const eventRsvps = allRsvps.filter(rsvp => rsvp.eventId === eventId);
    
    // Get user details for each RSVP
    const rsvpsWithUsers = await Promise.all(
      eventRsvps.map(async (rsvp) => {
        const userProfile = await getUserProfile(rsvp.userId);
        return {
          ...rsvp,
          userName: userProfile?.name || 'Unknown',
          userEmail: userProfile?.email || '',
          userLevel: userProfile?.membershipLevel || 1,
        };
      })
    );
    
    return { rsvps: rsvpsWithUsers };
  }

  // Get all RSVPs with event and user details (for committee/admin)
  async getAllRsvpsWithDetails() {
    const { getAllRSVPs } = await import('./supabaseStorage');
    const allRsvps = await getAllRSVPs();
    const events = await getAllEvents();
    
    const rsvpsWithDetails = await Promise.all(
      allRsvps.map(async (rsvp) => {
        const userProfile = await getUserProfile(rsvp.userId);
        const event = events.find(e => e.id === rsvp.eventId);
        return {
          ...rsvp,
          userName: userProfile?.name || 'Unknown',
          userEmail: userProfile?.email || '',
          eventTitle: event?.title || 'Unknown Event',
          eventDate: event?.date || '',
        };
      })
    );
    
    return { rsvps: rsvpsWithDetails };
  }

  // Tutor grading functions
  async gradeStudent(studentId: string, gradeData: {
    assessmentType: string;
    grade: number;
    level: number;
    comments?: string;
  }) {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    const grade = {
      id: generateId(),
      studentId,
      tutorId: this.currentUserId,
      assessmentType: gradeData.assessmentType,
      grade: gradeData.grade,
      level: gradeData.level,
      comments: gradeData.comments || '',
      gradedAt: new Date().toISOString(),
    };

    // Save to Supabase
    const { supabase } = await import('../utils/supabase/client');
    const { createClient } = await import('../utils/supabase/client');
    const supabaseClient = createClient();
    
    const { error } = await supabaseClient
      .from('grades')
      .insert({
        id: grade.id,
        student_id: grade.studentId,
        tutor_id: grade.tutorId,
        assessment_type: grade.assessmentType,
        grade: grade.grade,
        level: grade.level,
        comments: grade.comments,
        graded_at: grade.gradedAt,
      });

    if (error) throw error;

    return { success: true, grade };
  }

  async getStudentGrades(studentId: string) {
    const { createClient } = await import('../utils/supabase/client');
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('student_id', studentId)
      .order('graded_at', { ascending: false });

    if (error) throw error;

    const grades = (data || []).map((g: any) => ({
      id: g.id,
      studentId: g.student_id,
      tutorId: g.tutor_id,
      assessmentType: g.assessment_type,
      grade: g.grade,
      level: g.level,
      comments: g.comments,
      gradedAt: g.graded_at,
    }));

    return { grades };
  }

  // Get students in tutor's assigned class
  async getMyStudents() {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    // Get tutor profile to find assigned class
    const tutorProfile = await getUserProfile(this.currentUserId);
    if (!tutorProfile?.assignedClassId) {
      return { students: [] };
    }

    // Get all students
    const allUsers = await getAllUsers();
    
    // For now, return all students (in a real system, you'd filter by class enrollment)
    const students = allUsers.filter(u => u.role === 'student');
    
    return { students };
  }

  // Helper function to generate a unique session code
  private generateSessionCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }
    return code;
  }
}

export const api = new ApiClient();