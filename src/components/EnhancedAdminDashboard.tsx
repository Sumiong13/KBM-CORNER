import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { 
  getAllUsers, 
  saveUserProfile, 
  deleteUser as deleteUserFromStorage,
  generateId
} from '../lib/supabaseStorage';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { 
  Users, 
  UserCheck, 
  Calendar as CalendarIcon, 
  DollarSign, 
  AlertCircle, 
  BarChart3, 
  UserPlus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Shield, 
  ShieldOff, 
  CheckCircle, 
  LogOut 
} from 'lucide-react';
import { ReportsGenerator } from './ReportsGenerator';
import { AssignClassButton } from './AssignClassButton';
import { api } from '../lib/api';
import clubLogo from 'figma:asset/ade13b6fb51eb9b3ff7200cf4269cebe703dd1ea.png';

interface EnhancedAdminDashboardProps {
  user: any;
  onLogout: () => void;
}

export function EnhancedAdminDashboard({ user, onLogout }: EnhancedAdminDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add User Dialog States
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'student' | 'committee' | 'tutor'>('student');
  const [addingUser, setAddingUser] = useState(false);
  
  // Edit Role Dialog States
  const [showEditRoleDialog, setShowEditRoleDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editRole, setEditRole] = useState<'student' | 'committee' | 'tutor'>('student');
  const [updatingRole, setUpdatingRole] = useState(false);
  
  // Activate Student Dialog States
  const [showActivateStudentDialog, setShowActivateStudentDialog] = useState(false);
  const [activatingStudent, setActivatingStudent] = useState<any>(null);
  const [activationLevel, setActivationLevel] = useState<number>(1);
  const [activationMonths, setActivationMonths] = useState<number>(4);
  const [processingActivation, setProcessingActivation] = useState(false);
  
  // Deactivate Student Dialog States
  const [showDeactivateStudentDialog, setShowDeactivateStudentDialog] = useState(false);
  const [deactivatingStudent, setDeactivatingStudent] = useState<any>(null);
  const [processingDeactivation, setProcessingDeactivation] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    loadData();
    
    // Removed aggressive 10-second auto-refresh - use manual refresh button instead
    // Auto-refresh was causing performance issues and constant re-renders

    // Listen for localStorage changes (works across tabs)
    const handleStorageChange = (e: StorageEvent) => {
      // Reload data when user profiles or events change
      if (e.key && (e.key.startsWith('user_profile_') || e.key === 'events')) {
        console.log('LocalStorage changed, refreshing dashboard...');
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Debug: Check localStorage
      console.log('=== ADMIN DASHBOARD DEBUG ===');
      console.log('Checking localStorage for users...');
      
      // Get all localStorage keys
      const allKeys = Object.keys(localStorage);
      console.log('All localStorage keys:', allKeys);
      
      // Filter user profile keys
      const userProfileKeys = allKeys.filter(key => key.startsWith('user_profile_'));
      console.log('User profile keys:', userProfileKeys);
      
      // Check for events
      const eventsExist = localStorage.getItem('events');
      console.log('Events key exists:', !!eventsExist);
      
      // Fetch users
      const fetchedUsers = await getAllUsers();
      console.log('Fetched users count:', fetchedUsers.length);
      console.log('Fetched users:', fetchedUsers);
      
      // Breakdown by role
      const roleBreakdown = {
        students: fetchedUsers.filter(u => u.role === 'student').length,
        tutors: fetchedUsers.filter(u => u.role === 'tutor').length,
        committee: fetchedUsers.filter(u => u.role === 'committee').length,
        admin: fetchedUsers.filter(u => u.role === 'admin').length,
      };
      console.log('Users by role:', roleBreakdown);
      console.log('Student users:', fetchedUsers.filter(u => u.role === 'student'));
      console.log('Tutor users:', fetchedUsers.filter(u => u.role === 'tutor'));
      console.log('Committee users:', fetchedUsers.filter(u => u.role === 'committee'));
      
      console.log('=== END DEBUG ===');
      
      const [statsData, eventsData, usersData, pendingData] = await Promise.all([
        api.getAdminStats().catch(err => { 
          if (err?.code !== 'PGRST205') console.error('Stats error:', err); 
          return { stats: {} }; 
        }),
        api.getEvents().catch(err => { 
          if (err?.code !== 'PGRST205') console.error('Events error:', err); 
          return { events: [] }; 
        }),
        api.getAllUsers().catch(err => { 
          if (err?.code !== 'PGRST205') console.error('Users error:', err); 
          return { users: [] }; 
        }),
        api.getPendingVerifications().catch(err => { 
          if (err?.code !== 'PGRST205') console.error('Pending verifications error:', err); 
          return { users: [] }; 
        })
      ]);
      
      console.log('Fetched users count:', usersData.users?.length || 0);
      console.log('Fetched users:', usersData.users);
      console.log('Fetched events count:', eventsData.events?.length || 0);
      console.log('Fetched events:', eventsData.events);
      console.log('=== END DEBUG ===');
      
      setStats(statsData.stats || {});
      setEvents(eventsData.events || []);
      setUsers(usersData.users || []);
      setPendingVerifications(pendingData.users || []);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (userId: string, approved: boolean) => {
    try {
      await api.verifyUser(userId, approved);
      loadData();
    } catch (error) {
      console.error('Failed to verify user:', error);
      alert('Failed to verify user');
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserName) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setAddingUser(true);
      
      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            name: newUserName,
            role: newUserRole,
          },
          emailRedirectTo: undefined,
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Failed to create user');

      // Create user profile in localStorage
      const userId = data.user.id;
      const userProfile = {
        id: userId,
        email: newUserEmail,
        name: newUserName,
        role: newUserRole,
        membershipLevel: newUserRole === 'student' ? 1 : 0,
        verified: true, // Admin-created users are auto-verified
        verificationStatus: 'approved' as const,
        createdAt: new Date().toISOString(),
      };
      
      saveUserProfile(userId, userProfile);
      
      // Also set individual localStorage keys
      localStorage.setItem(`user_role_${userId}`, newUserRole);
      localStorage.setItem(`user_name_${userId}`, newUserName);
      localStorage.setItem(`user_verified_${userId}`, 'true');
      localStorage.setItem(`user_verification_status_${userId}`, 'approved');
      localStorage.setItem(`user_email_verified_${userId}`, 'true');
      if (newUserRole === 'student') {
        localStorage.setItem(`user_membership_level_${userId}`, '1');
      }

      alert(`User ${newUserName} created successfully!`);
      setShowAddUserDialog(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('student');
      loadData();
    } catch (error: any) {
      console.error('Failed to add user:', error);
      alert(`Failed to add user: ${error.message}`);
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete from localStorage
      deleteUserFromStorage(userId);
      
      // Note: We can't delete from Supabase Auth without admin privileges
      // The user will still be able to log in with Supabase, but their data is removed
      
      alert(`User ${userName} has been deleted from the system.`);
      loadData();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert(`Failed to delete user: ${error.message}`);
    }
  };

  const handleResetLevel = async (userId: string, userName: string, userEmail: string) => {
    if (!confirm(`Reset "${userName}" (${userEmail}) to Level 1? This will set their level back to 1.`)) {
      return;
    }

    try {
      const allUsers = await getAllUsers();
      const profile = allUsers.find(u => u.id === userId);
      if (profile) {
        // Reset to Level 1
        await saveUserProfile(userId, {
          ...profile,
          level: 1,
          membershipLevel: 1,
        });

        alert(`${userName} has been reset to Level 1.`);
        loadData();
      } else {
        alert('User not found.');
      }
    } catch (error: any) {
      console.error('Failed to reset level:', error);
      alert(`Failed to reset level: ${error.message}`);
    }
  };

  const handleEditRole = (userToEdit: any) => {
    setEditingUser(userToEdit);
    setEditRole(userToEdit.role);
    setShowEditRoleDialog(true);
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;

    try {
      setUpdatingRole(true);
      
      // Update user profile in localStorage
      const userProfile = {
        ...editingUser,
        role: editRole,
        membershipLevel: editRole === 'student' ? (editingUser.membershipLevel || 1) : 0,
      };
      
      saveUserProfile(editingUser.id, userProfile);
      
      // Also update individual localStorage keys
      localStorage.setItem(`user_role_${editingUser.id}`, editRole);
      if (editRole === 'student' && !editingUser.membershipLevel) {
        localStorage.setItem(`user_membership_level_${editingUser.id}`, '1');
      }

      alert(`User ${editingUser.name}'s role has been updated to ${editRole}.`);
      setShowEditRoleDialog(false);
      setEditingUser(null);
      loadData();
    } catch (error: any) {
      console.error('Failed to update role:', error);
      alert(`Failed to update role: ${error.message}`);
    } finally {
      setUpdatingRole(false);
    }
  };
  
  const handleActivateStudent = (student: any) => {
    setActivatingStudent(student);
    setActivationLevel(student.level || student.membershipLevel || 1);
    setActivationMonths(4); // Default 4 months (1 semester)
    setShowActivateStudentDialog(true);
  };

  const handleProcessActivation = async () => {
    if (!activatingStudent) return;

    try {
      setProcessingActivation(true);
      
      console.log('[Admin] Activating student:', activatingStudent);
      console.log('[Admin] Activation Level:', activationLevel);
      console.log('[Admin] Activation Months:', activationMonths);
      
      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + activationMonths);
      const expiryDateString = expiryDate.toISOString();
      
      console.log('[Admin] Calculated expiry date:', expiryDateString);
      
      // Update user profile directly (RLS policy allows admins to update any profile)
      console.log('[Admin] Calling saveUserProfile...');
      await saveUserProfile(activatingStudent.id, {
        membershipLevel: activationLevel,
        membershipExpiry: expiryDateString,
      });
      
      console.log('[Admin] User profile updated successfully in Supabase');

      alert(`${activatingStudent.name} has been activated!\n• Level: ${activationLevel}\n• Membership valid until: ${expiryDate.toLocaleDateString()}`);
      setShowActivateStudentDialog(false);
      setActivatingStudent(null);
      
      console.log('[Admin] Reloading data...');
      await loadData();
      console.log('[Admin] Data reloaded successfully');
    } catch (error: any) {
      console.error('[Admin] Failed to activate student:', error);
      console.error('[Admin] Error details:', error);
      alert(`Failed to activate student: ${error.message}`);
    } finally {
      setProcessingActivation(false);
    }
  };
  
  const handleDeactivateStudent = (student: any) => {
    setDeactivatingStudent(student);
    setShowDeactivateStudentDialog(true);
  };

  const handleProcessDeactivation = async () => {
    if (!deactivatingStudent) return;

    try {
      setProcessingDeactivation(true);
      
      // Update user profile in localStorage
      const userProfile = {
        ...deactivatingStudent,
        level: 1,
        membershipLevel: 1,
        membershipExpiry: null,
        membershipActive: false,
      };
      
      saveUserProfile(deactivatingStudent.id, userProfile);
      
      // Also update individual localStorage keys
      localStorage.setItem(`user_membership_level_${deactivatingStudent.id}`, '1');
      localStorage.setItem(`user_membership_expiry_${deactivatingStudent.id}`, 'null');

      alert(`${deactivatingStudent.name} has been deactivated.\n• Level reset to 1\n• Membership expired.`);
      setShowDeactivateStudentDialog(false);
      setDeactivatingStudent(null);
      loadData();
    } catch (error: any) {
      console.error('Failed to deactivate student:', error);
      alert(`Failed to deactivate student: ${error.message}`);
    } finally {
      setProcessingDeactivation(false);
    }
  };
  
  // Calculate statistics
  const students = users.filter(u => u.role === 'student');
  const clubMembers = users.filter(u => u.role === 'committee' || u.role === 'tutor');
  const totalStudents = students.length;
  const totalClubMembers = clubMembers.length;
  // Only students have paid memberships
  const activeMemberships = students.filter(u => u.membershipActive || new Date(u.membershipExpiry) > new Date()).length;
  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).length;
  const recentEvents = events.filter(e => new Date(e.date) < new Date()).slice(0, 5);
  
  // Level distribution (students only)
  const levelDistribution = [1, 2, 3, 4, 5].map(level => ({
    level,
    count: students.filter(u => u.level === level).length
  }));

  // Revenue estimation (RM50 per active membership - students only)
  const estimatedRevenue = activeMemberships * 50;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src={clubLogo} alt="UTM Mandarin Club" className="w-16 h-16 object-contain mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={clubLogo} alt="UTM Mandarin Club" className="w-12 h-12 object-contain bg-white rounded-lg p-1" />
              <div>
                <h1 className="text-2xl">Admin Dashboard</h1>
                <p className="text-red-100 text-sm">UTM Mandarin Club Management System</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          {/* Scrollable Tabs for Mobile */}
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full lg:min-w-0 flex-nowrap">
              <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
              <TabsTrigger value="students" className="whitespace-nowrap">
                Students
                <Badge variant="secondary" className="ml-2">{totalStudents}</Badge>
              </TabsTrigger>
              <TabsTrigger value="clubmembers" className="whitespace-nowrap">
                Club Members
                <Badge variant="secondary" className="ml-2">{totalClubMembers}</Badge>
              </TabsTrigger>
              <TabsTrigger value="events" className="whitespace-nowrap">
                Events
                <Badge variant="secondary" className="ml-2">{events.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="verifications" className="whitespace-nowrap">
                Verifications
                {pendingVerifications.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{pendingVerifications.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reports" className="whitespace-nowrap">Reports</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStudents}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalClubMembers} club members
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Memberships</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeMemberships}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalStudents > 0 ? Math.round((activeMemberships / totalStudents) * 100) : 0}% of students
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{upcomingEvents}</div>
                  <p className="text-xs text-muted-foreground">
                    {events.length - upcomingEvents} past events
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue (Est.)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">RM {estimatedRevenue}</div>
                  <p className="text-xs text-muted-foreground">
                    From active memberships
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pending Verifications Alert */}
            {pendingVerifications.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <AlertCircle className="w-5 h-5" />
                    Pending Verifications
                  </CardTitle>
                  <CardDescription>
                    {pendingVerifications.length} committee/tutor{pendingVerifications.length > 1 ? 's' : ''} awaiting approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => {
                      const verificationTab = document.querySelector('[value="verifications"]') as HTMLElement;
                      verificationTab?.click();
                    }}
                    variant="outline"
                    className="border-orange-300 hover:bg-orange-100"
                  >
                    Review Applications
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Level Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Student Level Distribution
                </CardTitle>
                <CardDescription>
                  Number of students at each proficiency level
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {levelDistribution.map(({ level, count }) => (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Level {level}</span>
                      <span className="text-muted-foreground">{count} student{count !== 1 ? 's' : ''}</span>
                    </div>
                    <Progress 
                      value={totalStudents > 0 ? (count / totalStudents) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Recent Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentEvents.length > 0 ? (
                    recentEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(event.date).toLocaleDateString()} at {event.time}
                          </p>
                        </div>
                        <Badge>{event.type}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No recent events</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">All Students ({totalStudents})</h3>
                <p className="text-sm text-gray-600">Students with paid memberships - RM50 per semester</p>
              </div>
              <Button onClick={() => { setNewUserRole('student'); setShowAddUserDialog(true); }}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {students.length > 0 ? (
                    students.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary">Student</Badge>
                          <Badge variant="outline">Level {student.level || 1}</Badge>
                          <Badge variant={student.membershipActive || new Date(student.membershipExpiry) > new Date() ? 'default' : 'secondary'}>
                            {student.membershipActive || new Date(student.membershipExpiry) > new Date() ? 'Active' : 'Expired'}
                          </Badge>
                          {student.membershipActive || new Date(student.membershipExpiry) > new Date() ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeactivateStudent(student)}
                              title="Deactivate membership"
                            >
                              <ShieldOff className="w-4 h-4 text-red-600" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleActivateStudent(student)}
                              title="Activate membership and assign level"
                            >
                              <Shield className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditRole(student)}
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUser(student.id, student.name)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResetLevel(student.id, student.name, student.email)}
                          >
                            <RefreshCw className="w-4 h-4 text-gray-600" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">No students found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Club Members Tab */}
          <TabsContent value="clubmembers" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Club Members ({totalClubMembers})</h3>
                <p className="text-sm text-gray-600">Committee members and tutors - No membership fee required</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { setNewUserRole('committee'); setShowAddUserDialog(true); }}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Committee
                </Button>
                <Button onClick={() => { setNewUserRole('tutor'); setShowAddUserDialog(true); }} variant="secondary">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Tutor
                </Button>
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {clubMembers.length > 0 ? (
                    clubMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.email}</p>
                          <div className="flex flex-wrap gap-2 mt-2 items-center">
                            <p className="text-xs text-gray-500">
                              Joined: {new Date(member.createdAt).toLocaleDateString()}
                            </p>
                            {member.assignedClass && (
                              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                {member.assignedClass}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={member.role === 'committee' ? 'default' : 'secondary'}>
                            {member.role === 'committee' ? 'Committee' : 'Tutor'}
                          </Badge>
                          <Badge variant={member.verified ? 'default' : 'destructive'}>
                            {member.verified ? 'Verified' : 'Pending'}
                          </Badge>
                          {member.role === 'tutor' && (
                            <AssignClassButton member={member} onAssigned={loadData} />
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUser(member.id, member.name)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditRole(member)}
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">No club members found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Events</CardTitle>
                <CardDescription>View and manage club events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-gray-600">{event.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(event.date).toLocaleDateString()} at {event.time} • {event.venue}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge>{event.type}</Badge>
                          <Badge variant={new Date(event.date) >= new Date() ? 'default' : 'secondary'}>
                            {new Date(event.date) >= new Date() ? 'Upcoming' : 'Past'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">No events found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verifications Tab */}
          <TabsContent value="verifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Committee/Tutor Verifications</CardTitle>
                <CardDescription>Review and approve committee/tutor applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingVerifications.length > 0 ? (
                    pendingVerifications.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {member.role === 'committee' ? 'Committee' : 'Tutor'}
                            </Badge>
                            <p className="text-xs text-gray-500">
                              Applied: {new Date(member.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleVerifyUser(member.id, true)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleVerifyUser(member.id, false)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="font-medium">All caught up!</p>
                      <p className="text-sm text-gray-500">No pending verifications</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <ReportsGenerator users={users} events={events} />
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {newUserRole === 'student' ? 'Student' : newUserRole === 'committee' ? 'Committee Member' : 'Tutor'}</DialogTitle>
            <DialogDescription>
              Create a new user account. The user will be able to login immediately with these credentials.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password (min 6 characters)"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="committee">Committee Member</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)} disabled={addingUser}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={addingUser}>
              {addingUser ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditRoleDialog} onOpenChange={setShowEditRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role for {editingUser?.name}</DialogTitle>
            <DialogDescription>
              Change the role of this user in the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={editRole} onValueChange={(value: any) => setEditRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="committee">Committee Member</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditRoleDialog(false)} disabled={updatingRole}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={updatingRole}>
              {updatingRole ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Activate Student Dialog */}
      <Dialog open={showActivateStudentDialog} onOpenChange={setShowActivateStudentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Membership for {activatingStudent?.name}</DialogTitle>
            <DialogDescription>
              Set the membership level and duration for this student.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="level">Membership Level</Label>
              <Select value={activationLevel.toString()} onValueChange={(value: any) => setActivationLevel(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1</SelectItem>
                  <SelectItem value="2">Level 2</SelectItem>
                  <SelectItem value="3">Level 3</SelectItem>
                  <SelectItem value="4">Level 4</SelectItem>
                  <SelectItem value="5">Level 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="months">Duration (Months)</Label>
              <Input
                id="months"
                type="number"
                placeholder="Enter duration in months"
                value={activationMonths}
                onChange={(e) => setActivationMonths(parseInt(e.target.value))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateStudentDialog(false)} disabled={processingActivation}>
              Cancel
            </Button>
            <Button onClick={handleProcessActivation} disabled={processingActivation}>
              {processingActivation ? 'Activating...' : 'Activate Membership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Deactivate Student Dialog */}
      <Dialog open={showDeactivateStudentDialog} onOpenChange={setShowDeactivateStudentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Membership for {deactivatingStudent?.name}</DialogTitle>
            <DialogDescription>
              Reset the membership level and deactivate this student's membership.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="level">Membership Level</Label>
              <Select value="1" onValueChange={(value: any) => setActivationLevel(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateStudentDialog(false)} disabled={processingDeactivation}>
              Cancel
            </Button>
            <Button onClick={handleProcessDeactivation} disabled={processingDeactivation}>
              {processingDeactivation ? 'Deactivating...' : 'Deactivate Membership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}