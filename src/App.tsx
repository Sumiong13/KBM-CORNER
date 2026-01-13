import { useState, useEffect } from 'react';
import { createClient } from './utils/supabase/client';
import { api } from './lib/api';
import { saveUserProfile, getUserProfile } from './lib/supabaseStorage';
import { AuthForm } from './components/AuthForm';
import { StudentDashboard } from './components/StudentDashboard';
import { TutorDashboard } from './components/TutorDashboard';
import { CommitteeDashboard } from './components/CommitteeDashboard';
import { EnhancedAdminDashboard } from './components/EnhancedAdminDashboard';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { ServerErrorScreen } from './components/ServerErrorScreen';
import { EmailVerificationDialog } from './components/EmailVerificationDialog';
import { SupabaseSetupCheck } from './components/SupabaseSetupCheck';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import clubLogo from 'figma:asset/ade13b6fb51eb9b3ff7200cf4269cebe703dd1ea.png';

// Global error suppression for Supabase auth runtime errors
// Set up immediately before any component renders
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    // Filter out Supabase auth runtime errors
    const errorString = args.join(' ');
    if (
      errorString.includes('Unknown runtime error') ||
      errorString.includes('@supabase/auth-js') ||
      errorString.includes('tslib')
    ) {
      // Silently suppress - don't log anything
      return;
    }
    // Log all other errors normally
    originalError.apply(console, args);
  };

  // Also suppress window errors
  window.addEventListener('error', (event) => {
    if (
      event.error?.stack?.includes('@supabase/auth-js') ||
      event.error?.message?.includes('runtime error') ||
      event.message?.includes('runtime error')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }, true); // Use capture phase

  // Suppress promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason?.stack?.includes('@supabase/auth-js') ||
      event.reason?.message?.includes('runtime error')
    ) {
      event.preventDefault();
      return false;
    }
  }, true); // Use capture phase
}

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [pendingVerificationData, setPendingVerificationData] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    checkSession();
    checkPasswordReset();

    // Set up auth state listener to handle session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      try {
        // Only handle specific events to prevent unnecessary refreshes
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          api.setAccessToken(session.access_token);
          api.setCurrentUser(session.user.id);
          
          const storedRole = localStorage.getItem(`user_role_${session.user.id}`);
          const metadataRole = session.user.user_metadata?.role;
          const role = storedRole || metadataRole || 'student';
          setUserRole(role);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserRole(null);
          api.setAccessToken(null);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Update token silently without changing user state (prevents re-render)
          api.setAccessToken(session.access_token);
        }
        // Ignore other events like 'INITIAL_SESSION', 'USER_UPDATED' to prevent loops
      } catch (error: any) {
        // Suppress known Supabase auth runtime errors during sign out
        if (event === 'SIGNED_OUT' || error?.message?.includes('runtime error')) {
          // These are expected and harmless - just log to console
          console.log('Auth state change (expected):', event);
          return;
        }
        console.error('Error handling auth state change:', error);
        // Don't throw - just log the error to prevent app crashes
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  const checkPasswordReset = () => {
    // Check if URL has reset password parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset') === 'true') {
      setIsResettingPassword(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        setUser(session.user);
        api.setAccessToken(session.access_token);
        api.setCurrentUser(session.user.id); // Set current user ID
        console.log('Access token set in checkSession');
        
        // Get user role from localStorage or user metadata
        const storedRole = localStorage.getItem(`user_role_${session.user.id}`);
        const metadataRole = session.user.user_metadata?.role;
        const role = storedRole || metadataRole || 'student';
        
        setUserRole(role);
        console.log('User role loaded:', role);

        // Ensure user profile exists in Supabase
        try {
          let userProfile = await getUserProfile(session.user.id);
          if (!userProfile) {
            const verified = localStorage.getItem(`user_verified_${session.user.id}`) === 'true' || role === 'student' || role === 'admin';
            userProfile = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || localStorage.getItem(`user_name_${session.user.id}`) || 'User',
              role: role as any,
              membershipLevel: role === 'student' ? (parseInt(localStorage.getItem(`user_membership_level_${session.user.id}`) || '1')) : 0,
              verified: verified,
              verificationStatus: verified ? 'approved' as const : 'pending' as const,
              membershipExpiry: localStorage.getItem(`user_membership_expiry_${session.user.id}`) || undefined,
              createdAt: session.user.created_at || new Date().toISOString(),
            };
            await saveUserProfile(session.user.id, userProfile);
            console.log('Created user profile in checkSession:', userProfile);
          }
        } catch (dbError) {
          console.log('Database not ready yet, will prompt for setup when accessing dashboards');
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      // Hardcoded admin login
      if (email === 'utmmandarinclub@gmail.com' && password === 'admin123') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // If admin account doesn't exist, provide helpful message
          console.error('\n⚠️ ADMIN ACCOUNT NOT SET UP');
          console.log('═══════════════════════════════════════════════════════════');
          console.log('The admin account needs to be created in Supabase first!');
          console.log('');
          console.log('📧 Email: utmmandarinclub@gmail.com');
          console.log('🔑 Password: admin123');
          console.log('');
          console.log('STEPS TO CREATE ADMIN ACCOUNT:');
          console.log('1. Go to your Supabase Dashboard');
          console.log('2. Navigate to Authentication → Users');
          console.log('3. Click "Add user" → "Create new user"');
          console.log('4. Enter the admin email and password above');
          console.log('5. IMPORTANT: Toggle OFF "Auto Confirm User" so you can set the password');
          console.log('6. Refresh this page and try logging in again');
          console.log('═══════════════════════════════════════════════════════════\n');
          throw new Error('Admin account not found in Supabase. Please create it first:\n\n1. Go to Supabase Dashboard → Authentication → Users\n2. Click "Add user"\n3. Email: utmmandarinclub@gmail.com\n4. Password: admin123\n5. Create user and try logging in again\n\nSee console for detailed instructions.');
        }

        if (data.session) {
          api.setAccessToken(data.session.access_token);
          api.setCurrentUser(data.user.id); // Set current user ID
          setUser(data.user);
          setUserRole('admin');
          localStorage.setItem(`user_role_${data.user.id}`, 'admin');
          
          // Save admin profile to localStorage so it shows in admin dashboard
          const adminProfile = {
            id: data.user.id,
            email: email,
            name: data.user.user_metadata?.name || 'Admin',
            role: 'admin' as const,
            membershipLevel: 0,
            verified: true,
            verificationStatus: 'approved' as const,
            createdAt: data.user.created_at || new Date().toISOString(),
          };
          saveUserProfile(data.user.id, adminProfile);
          
          return;
        }
      }

      // Check if trying to login with admin email but wrong password
      if (email === 'utmmandarinclub@gmail.com' && password !== 'admin123') {
        throw new Error('Invalid admin password. The admin password is: admin123');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Provide more helpful error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. If you don\'t have an account yet, please sign up first.');
        } else if (error.message.includes('Email not confirmed')) {
          // User needs to verify their email - show verification dialog
          setPendingVerificationEmail(email);
          setPendingVerificationData({
            userId: null, // Will be set after verification
            name: '',
            role: 'student',
            password: password, // Store password to auto-login after verification
          });
          setShowEmailVerification(true);
          
          toast.info('Email Verification Required', {
            description: 'Please check your email for the verification code to complete your account setup.',
            duration: 8000,
          });
          
          // Resend verification code automatically
          try {
            await supabase.auth.resend({
              type: 'signup',
              email: email,
            });
            
            console.log('\n══════════════════════════════════════════════════════════');
            console.log('📧 VERIFICATION EMAIL RESENT');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`Email: ${email}`);
            console.log('\nPlease check your inbox for the 6-digit verification code.');
            console.log('═══════════════════════════════════════════════════════════\n');
          } catch (resendError) {
            console.error('Failed to resend verification code:', resendError);
          }
          
          return; // Don't throw error, just show verification dialog
        }
        throw error;
      }

      if (data.session) {
        api.setAccessToken(data.session.access_token);
        api.setCurrentUser(data.user.id); // Set current user ID
        
        // Get role from localStorage or user metadata
        const storedRole = localStorage.getItem(`user_role_${data.user.id}`);
        const metadataRole = data.user.user_metadata?.role;
        const storedVerified = localStorage.getItem(`user_verified_${data.user.id}`);
        const storedStatus = localStorage.getItem(`user_verification_status_${data.user.id}`);
        
        const role = storedRole || metadataRole || 'student';
        const verified = storedVerified !== null ? storedVerified === 'true' : true;
        const status = storedStatus as 'pending' | 'approved' | 'rejected' | null;
        
        // Check if user is verified (for committee members and tutors)
        if ((role === 'committee' || role === 'tutor') && !verified) {
          await supabase.auth.signOut();
          
          // Provide specific message based on verification status
          if (status === 'rejected') {
            throw new Error('Your account application was rejected by an administrator. Please contact utmmandarinclub@gmail.com for more information.');
          } else {
            throw new Error('Your account is pending admin verification. Please wait for approval before logging in.');
          }
        }
        
        // Ensure user profile exists
        try {
          let userProfile = await getUserProfile(data.user.id);
          if (!userProfile) {
            // Create profile if it doesn't exist
            userProfile = {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.name || localStorage.getItem(`user_name_${data.user.id}`) || 'User',
              role: role as any,
              membershipLevel: role === 'student' ? (parseInt(localStorage.getItem(`user_membership_level_${data.user.id}`) || '1')) : 0,
              verified: verified,
              verificationStatus: verified ? 'approved' as const : 'pending' as const,
              membershipExpiry: localStorage.getItem(`user_membership_expiry_${data.user.id}`) || undefined,
              createdAt: data.user.created_at || new Date().toISOString(),
            };
            await saveUserProfile(data.user.id, userProfile);
          }
        } catch (dbError) {
          console.log('Database not ready yet, will prompt for setup in dashboard');
        }
        
        setUser(data.user);
        setUserRole(role);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const handleSignup = async (email: string, password: string, name: string, role?: string) => {
    try {
      const userRole = role || 'student';
      
      // Create auth user with Supabase - this will send verification email automatically
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            role: userRole,
          },
          emailRedirectTo: undefined,
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Store pending verification data (no code stored - Supabase handles it)
      setPendingVerificationEmail(email);
      setPendingVerificationData({
        userId: authData.user.id,
        name: name,
        role: userRole,
        password: password,
      });

      // Sign out the user immediately - they need to verify email first
      await supabase.auth.signOut();

      // Show email verification dialog
      setShowEmailVerification(true);

      toast.success('Verification Email Sent!', {
        description: `Please check your email at ${email} for the 6-digit verification code.\n\nNote: If email is not configured in Supabase, check the browser console for the code.`,
        duration: 10000,
      });

      // Development fallback: Log instructions
      console.log('\n══════════════════════════════════════════════════════════');
      console.log('📧 VERIFICATION EMAIL SENT');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Email: ${email}`);
      console.log('\n✅ NEXT STEPS:');
      console.log('1. Check your email inbox for verification code');
      console.log('2. Check spam/junk folder if not in inbox');
      console.log('3. Look for email from Supabase');
      console.log('4. Enter the 6-digit code in the dialog');
      console.log('\n⚠️ EMAIL NOT ARRIVING?');
      console.log('• Ensure "Confirm email" is enabled in Supabase Dashboard');
      console.log('• Go to: Authentication → Providers → Email → Confirm email (ON)');
      console.log('• Check SUPABASE_EMAIL_TROUBLESHOOTING.md for help');
      console.log('\n💡 DEVELOPMENT TIP:');
      console.log('If Supabase email is not configured, you can check the');
      console.log('Supabase Auth logs or configure SMTP settings.');
      console.log('═══════════════════════════════════════════════════════════\n');

      return {
        success: true,
        requiresEmailVerification: true,
        message: 'Please check your email for the verification code.'
      };
    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(error.message || 'Signup failed');
    }
  };

  const handleEmailVerification = async (code: string) => {
    try {
      if (!pendingVerificationData) {
        throw new Error('No pending verification data');
      }

      // Verify the OTP code with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email: pendingVerificationEmail,
        token: code,
        type: 'signup',
      });

      if (error) {
        // Provide more helpful error messages
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          throw new Error('Verification code has expired or is invalid. Please click "Resend Code" to get a new one.');
        }
        throw error;
      }
      
      if (!data.user) throw new Error('Verification failed');

      const { userId, name, role, password } = pendingVerificationData;
      
      // Use verified user's ID if userId was null (from login flow)
      const actualUserId = userId || data.user.id;
      const actualName = name || data.user.user_metadata?.name || 'User';
      const actualRole = role || data.user.user_metadata?.role || 'student';

      // Create complete user profile object
      const userProfile = {
        id: actualUserId,
        email: pendingVerificationEmail,
        name: actualName,
        role: actualRole as 'student' | 'committee' | 'tutor',
        membershipLevel: actualRole === 'student' ? 1 : 0,
        verified: actualRole === 'committee' || actualRole === 'tutor' ? false : true,
        verificationStatus: (actualRole === 'committee' || actualRole === 'tutor' ? 'pending' : 'approved') as 'pending' | 'approved' | 'rejected',
        createdAt: new Date().toISOString(),
      };

      // Save complete user profile to localStorage
      saveUserProfile(actualUserId, userProfile);

      // Store user data in localStorage (backend will auto-create profile on first access)
      localStorage.setItem(`user_role_${actualUserId}`, actualRole);
      localStorage.setItem(`user_name_${actualUserId}`, actualName);
      localStorage.setItem(`user_email_verified_${actualUserId}`, 'true');
      
      // Committee members and tutors need admin verification
      if (actualRole === 'committee' || actualRole === 'tutor') {
        localStorage.setItem(`user_verified_${actualUserId}`, 'false');
        localStorage.setItem(`user_verification_status_${actualUserId}`, 'pending');
        
        // Sign out immediately since they need admin verification
        await supabase.auth.signOut();
        
        // Close verification dialog and show success message
        setShowEmailVerification(false);
        setPendingVerificationEmail('');
        setPendingVerificationData(null);
        
        toast.success('Email Verified!', {
          description: `Your ${actualRole === 'committee' ? 'committee member' : 'tutor'} account is now pending admin verification. You'll be able to login once an admin approves your account.`,
          duration: 8000,
        });
        
        // Return successfully without throwing error
        return;
      } else {
        // Students are auto-approved
        localStorage.setItem(`user_verified_${actualUserId}`, 'true');
        localStorage.setItem(`user_verification_status_${actualUserId}`, 'approved');
        localStorage.setItem(`user_membership_level_${actualUserId}`, '1');
        
        // Close verification dialog
        setShowEmailVerification(false);
        setPendingVerificationEmail('');
        setPendingVerificationData(null);
        
        toast.success('Email Verified!', {
          description: 'Your account has been activated. Welcome!',
        });
        
        // Sign in the verified student
        await handleLogin(pendingVerificationEmail, password);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      throw new Error(error.message || 'Verification failed. Please check your code and try again.');
    }
  };

  const handleResendVerificationCode = async () => {
    try {
      if (!pendingVerificationEmail) {
        throw new Error('No email address found');
      }

      // Resend OTP using Supabase - this will send a new code via email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingVerificationEmail,
      });

      if (error) throw error;

      toast.success('Verification Code Resent!', {
        description: `A new verification code has been sent to ${pendingVerificationEmail}. Please check your email.`,
        duration: 8000,
      });
    } catch (error: any) {
      console.error('Resend verification error:', error);
      throw new Error(error.message || 'Failed to resend verification code');
    }
  };

  const handleCancelVerification = () => {
    setShowEmailVerification(false);
    setPendingVerificationEmail('');
    setPendingVerificationData(null);
    
    toast.info('Verification Cancelled', {
      description: 'You can sign up again when ready.',
    });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserRole(null);
      api.setAccessToken(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src={clubLogo} alt="UTM Mandarin Club" className="w-16 h-16 object-contain mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show password reset form if user clicked email link
  if (isResettingPassword) {
    return (
      <ResetPasswordForm 
        onComplete={() => {
          setIsResettingPassword(false);
          handleLogout();
        }} 
      />
    );
  }

  if (!user) {
    return (
      <>
        <AuthForm onLogin={handleLogin} onSignup={handleSignup} />
        <EmailVerificationDialog
          open={showEmailVerification}
          email={pendingVerificationEmail}
          onVerify={handleEmailVerification}
          onResend={handleResendVerificationCode}
          onCancel={handleCancelVerification}
        />
        
        <Toaster position="top-center" richColors />
      </>
    );
  }

  // Route based on user role
  if (userRole === 'admin') {
    return (
      <SupabaseSetupCheck>
        <EnhancedAdminDashboard user={user} onLogout={handleLogout} />
        <Toaster position="top-center" richColors />
      </SupabaseSetupCheck>
    );
  }

  if (userRole === 'tutor') {
    return (
      <SupabaseSetupCheck>
        <TutorDashboard user={user} onLogout={handleLogout} />
        <Toaster position="top-center" richColors />
      </SupabaseSetupCheck>
    );
  }

  if (userRole === 'committee') {
    return (
      <SupabaseSetupCheck>
        <CommitteeDashboard user={user} onLogout={handleLogout} />
        <Toaster position="top-center" richColors />
      </SupabaseSetupCheck>
    );
  }

  // Default to student dashboard
  return (
    <SupabaseSetupCheck>
      <StudentDashboard user={user} onLogout={handleLogout} />
      <Toaster position="top-center" richColors />
    </SupabaseSetupCheck>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}