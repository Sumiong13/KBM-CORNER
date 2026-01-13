import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Users, Calendar as CalendarIcon, CheckCircle, Clock, LogOut, Plus, Edit, Trash2, QrCode, ShieldCheck, Edit2, RotateCcw, UserPlus, Ban } from 'lucide-react';
import { api } from '../lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { QRCodeGenerator } from './QRCodeGenerator';
import clubLogo from 'figma:asset/ade13b6fb51eb9b3ff7200cf4269cebe703dd1ea.png';

interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'members' | 'assessments' | 'payments' | 'verifications'>('overview');
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Event form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventType, setEventType] = useState('meeting');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, eventsData, usersData, assessmentsData, pendingData] = await Promise.all([
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
        api.getAssessments().catch(err => { 
          if (err?.code !== 'PGRST205') console.error('Assessments error:', err); 
          return { assessments: [] }; 
        }),
        api.getPendingVerifications().catch(err => { 
          if (err?.code !== 'PGRST205') console.error('Pending verifications error:', err); 
          return { users: [] }; 
        })
      ]);
      
      setStats(statsData.stats || {});
      setEvents(eventsData.events || []);
      setUsers(usersData.users || []);
      setAssessments(assessmentsData.assessments || []);
      setPendingVerifications(pendingData.users || []);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEventDialog = (event?: any) => {
    if (event) {
      setEditingEvent(event);
      setEventTitle(event.title);
      setEventDescription(event.description);
      setEventDate(event.date);
      setEventTime(event.time);
      setEventVenue(event.venue);
      setEventType(event.type);
    } else {
      setEditingEvent(null);
      setEventTitle('');
      setEventDescription('');
      setEventDate('');
      setEventTime('');
      setEventVenue('');
      setEventType('meeting');
    }
    setShowEventDialog(true);
  };

  const handleSaveEvent = async () => {
    try {
      const eventData = {
        title: eventTitle,
        description: eventDescription,
        date: eventDate,
        time: eventTime,
        venue: eventVenue,
        type: eventType
      };

      if (editingEvent) {
        await api.updateEvent(editingEvent.id, eventData);
      } else {
        await api.createEvent(eventData);
      }

      setShowEventDialog(false);
      loadData();
    } catch (error) {
      console.error('Failed to save event:', error);
      alert('Failed to save event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await api.deleteEvent(eventId);
      loadData();
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event');
    }
  };

  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      await api.updateUserRole(userId, role);
      loadData();
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert('Failed to update user role');
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

  const handleToggleMembership = async (student: any) => {
    const isActive = new Date(student.membershipExpiry) > new Date();
    
    if (isActive) {
      // Deactivate membership
      if (!confirm(`Are you sure you want to deactivate ${student.name}'s membership?`)) {
        return;
      }
      try {
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 1); // Set to yesterday
        await api.updateUserProfile(student.id, { membershipExpiry: expiredDate.toISOString() });
        loadData();
      } catch (error) {
        console.error('Failed to deactivate membership:', error);
        alert('Failed to deactivate membership');
      }
    } else {
      // Activate membership - show payment dialog for confirmation
      setSelectedMember(student);
      setShowPaymentDialog(true);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.deleteUser(userId);
      loadData();
      alert('User deleted successfully');
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={clubLogo} alt="UTM Mandarin Club" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-xl">UTM Mandarin Club - Admin</h1>
                <p className="text-sm text-gray-600">Welcome, {user.user_metadata?.name}!</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="overflow-x-auto">
            <div className="flex gap-2 sm:gap-4 min-w-max">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap text-sm ${
                  activeTab === 'overview'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap text-sm ${
                  activeTab === 'members'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Students
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap text-sm ${
                  activeTab === 'events'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Events
              </button>
              <button
                onClick={() => setActiveTab('verifications')}
                className={`py-3 px-4 border-b-2 transition-colors relative whitespace-nowrap text-sm ${
                  activeTab === 'verifications'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Verifications
                {pendingVerifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingVerifications.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('assessments')}
                className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap text-sm ${
                  activeTab === 'assessments'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Assessments
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap text-sm ${
                  activeTab === 'payments'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Total Students</CardTitle>
                  <Users className="w-4 h-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl">{stats?.totalStudents || 0}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Active Memberships</CardTitle>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl">{stats?.activeMemberships || 0}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {stats?.totalStudents > 0 
                      ? `${Math.round((stats.activeMemberships / stats.totalStudents) * 100)}% of total students`
                      : '0% of total students'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Total Events</CardTitle>
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl">{stats?.totalEvents || 0}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Total Attendance</CardTitle>
                  <Clock className="w-4 h-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl">{stats?.totalAttendance || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Attendance */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
                <CardDescription>Latest check-ins across all events</CardDescription>
              </CardHeader>
              <CardContent>
                {!stats?.recentAttendance || stats.recentAttendance.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No attendance records yet</p>
                ) : (
                  <div className="space-y-2">
                    {stats.recentAttendance.map((record: any) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{record.eventTitle}</p>
                          <p className="text-sm text-gray-600">{record.userId}</p>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(record.checkedInAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Utilities */}
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ⚙️ System Utilities
                </CardTitle>
                <CardDescription>
                  Admin-only tools for system maintenance and data migration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Reset All Memberships</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    This will set all student and committee memberships to expired status. 
                    Students will need to pay RM50 to activate their membership. 
                    <strong className="text-red-600"> Admin accounts are not affected.</strong>
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (confirm('Are you sure you want to reset ALL memberships? This will require students to make payment to reactivate.')) {
                        try {
                          const result = await api.resetAllMemberships();
                          alert(`Success! Reset ${result.resetCount} memberships.`);
                          loadData();
                        } catch (error) {
                          console.error('Failed to reset memberships:', error);
                          alert('Failed to reset memberships. Check console for details.');
                        }
                      }
                    }}
                  >
                    Reset All Memberships to Expired
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl">Events Management</h2>
                <p className="text-gray-600">Create and manage club events. Click "Show QR" to display the QR code for student check-in.</p>
              </div>
              <Button onClick={() => openEventDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </div>

            <div className="grid gap-4">
              {events.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No events created yet
                  </CardContent>
                </Card>
              ) : (
                events.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle>{event.title}</CardTitle>
                            <Badge>{event.type}</Badge>
                          </div>
                          <CardDescription>{event.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowQRCode(true);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEventDialog(event)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Date</p>
                          <p>{new Date(event.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Time</p>
                          <p>{event.time}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Venue</p>
                          <p>{event.venue}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Session Code</p>
                          <p className="font-mono bg-red-50 text-red-600 px-2 py-1 rounded inline-block">{event.sessionCode}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <Card>
            <CardHeader>
              <CardTitle>All Students</CardTitle>
              <CardDescription>Manage student roles and accounts. Use the "Payment" button to activate membership for students who paid manually (cash/bank transfer).</CardDescription>
            </CardHeader>
            <CardContent>
              {users.filter(u => u.role !== 'admin').length === 0 ? (
                <p className="text-gray-500 text-center py-4">No students yet</p>
              ) : (
                <div className="space-y-2">
                  {users.filter(student => student.role !== 'admin').map((student) => {
                    const isActive = new Date(student.membershipExpiry) > new Date();
                    const daysRemaining = isActive 
                      ? Math.ceil((new Date(student.membershipExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    
                    return (
                    <div key={student.id} className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 bg-gray-50 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{student.name}</p>
                        <p className="text-sm text-gray-600 truncate">{student.email}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {student.role === 'student' && (
                            <Badge variant="outline" className="text-xs">Level {student.level || 1}</Badge>
                          )}
                          <Badge 
                            variant={isActive ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {isActive ? `Active (${daysRemaining}d left)` : 'Inactive'}
                          </Badge>
                          {!isActive && student.role === 'student' && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
                              ⚠️ Needs Payment
                            </Badge>
                          )}
                          <Badge 
                            variant="secondary"
                            className={`text-xs ${
                              student.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              student.role === 'tutor' ? 'bg-blue-100 text-blue-700' :
                              student.role === 'committee' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {student.role || 'student'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 lg:ml-4">
                        <Select 
                          value={student.role} 
                          onValueChange={(value) => handleUpdateUserRole(student.id, value)}
                        >
                          <SelectTrigger className="w-full sm:w-32 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="tutor">Tutor</SelectItem>
                            <SelectItem value="committee">Committee</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm" 
                          variant={isActive ? "outline" : "default"}
                          className={`w-full sm:w-auto text-sm ${!isActive ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                          onClick={() => {
                            setSelectedMember(student);
                            setShowPaymentDialog(true);
                          }}
                        >
                          {isActive ? 'Extend' : 'Activate'} RM50
                        </Button>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'verifications' && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Verifications</CardTitle>
              <CardDescription>
                Review and approve committee student signup requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingVerifications.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No pending verifications
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingVerifications.map((student) => (
                    <div 
                      key={student.id} 
                      className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200"
                    >
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            Pending Verification
                          </Badge>
                          <Badge variant="secondary">
                            {student.role || 'committee'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Signed up: {new Date(student.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleVerifyUser(student.id, true)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleVerifyUser(student.id, false)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'assessments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl">Assessments Management</h2>
                <p className="text-gray-600">Create and manage quizzes and exams</p>
              </div>
              <Button onClick={() => setShowAssessmentDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Assessment
              </Button>
            </div>

            <div className="grid gap-4">
              {assessments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No assessments created yet
                  </CardContent>
                </Card>
              ) : (
                assessments.map((assessment) => (
                  <Card key={assessment.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle>{assessment.title}</CardTitle>
                            <Badge>{assessment.type}</Badge>
                            <Badge variant="outline">Level {assessment.level}</Badge>
                          </div>
                          <CardDescription className="mt-2">
                            {assessment.questions.length} questions • Passing score: {assessment.passingScore}%
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        Due: {new Date(assessment.dueDate).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Records</CardTitle>
              <CardDescription>View all membership payments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">
                Payment records will be shown here after members make payments
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
            <DialogDescription>
              {editingEvent ? 'Update event details' : 'Add a new event to the calendar'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Event title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Event description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={eventVenue}
                onChange={(e) => setEventVenue(e.target.value)}
                placeholder="Event venue"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="event">Special Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEvent}>
                {editingEvent ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Offline Payment</DialogTitle>
            <DialogDescription>
              Record a manual payment for {selectedMember?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
              <p className="text-sm font-semibold text-yellow-900 mb-1">⚠️ Important</p>
              <p className="text-sm text-yellow-800">
                Only use this button if the student has <strong>actually paid RM50</strong> via cash or bank transfer. Do not activate membership without payment!
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                {selectedMember?.role === 'student' && `Current Level: ${selectedMember?.level || 1} • `}
                Membership: {selectedMember && new Date(selectedMember.membershipExpiry) > new Date() ? 'Active' : 'Expired'}
              </p>
            </div>
            <p className="text-sm text-gray-600">
              This will extend the membership by 4 months{selectedMember?.role === 'student' ? ` and keep the student at Level ${selectedMember?.level || 1}` : ''}.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={async () => {
                console.log('[Admin Dialog] Button clicked, selectedMember:', selectedMember);
                
                // Extra confirmation to prevent accidental activation
                if (!confirm(`Are you sure ${selectedMember?.name} has paid RM50? This will activate their membership for 4 months.`)) {
                  console.log('[Admin Dialog] User cancelled confirmation');
                  return;
                }
                
                try {
                  console.log('[Admin] Recording payment for user:', selectedMember);
                  console.log('[Admin] User ID:', selectedMember.id);
                  console.log('[Admin] Amount: 50, Type: Semester');
                  
                  const result = await api.recordPayment(selectedMember.id, 50, 'Semester');
                  console.log('[Admin] Payment recorded successfully:', result);
                  
                  alert('Payment recorded successfully! Membership activated for 4 months.');
                  setShowPaymentDialog(false);
                  
                  console.log('[Admin] Reloading data...');
                  await loadData(); // Reload to show updated status
                  console.log('[Admin] Data reloaded successfully');
                } catch (error) {
                  console.error('[Admin] Failed to record payment:', error);
                  console.error('[Admin] Error details:', JSON.stringify(error, null, 2));
                  alert('Failed to record payment: ' + (error?.message || 'Unknown error'));
                }
              }}>
                Confirm RM50 Payment Received
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assessment Dialog - Simplified */}
      <Dialog open={showAssessmentDialog} onOpenChange={setShowAssessmentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Assessment</DialogTitle>
            <DialogDescription>
              Note: For this prototype, use the browser console or API to create detailed assessments with questions.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              To create a full assessment with questions, you can use the API directly. 
              Example structure needed:
            </p>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
{`{
  "title": "Level 1 Quiz 1",
  "type": "quiz",
  "level": 1,
  "passingScore": 70,
  "dueDate": "2025-12-31",
  "questions": [
    {
      "question": "What is 你好?",
      "options": ["Hello", "Goodbye", "Thank you", "Sorry"],
      "correctAnswer": "Hello"
    }
  ]
}`}
            </pre>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowAssessmentDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Generator Dialog */}
      {showQRCode && selectedEvent && (
        <QRCodeGenerator
          event={selectedEvent}
          onClose={() => {
            setShowQRCode(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}