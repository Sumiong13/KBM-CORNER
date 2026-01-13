import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { GraduationCap, LogOut, QrCode, BookOpen, FileText, ClipboardCheck, Users, AlertCircle, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { QRCodeGenerator } from './QRCodeGenerator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { LevelVerificationDialog } from './LevelVerificationDialog';
import clubLogo from 'figma:asset/ade13b6fb51eb9b3ff7200cf4269cebe703dd1ea.png';

interface TutorDashboardProps {
  user: any;
  onLogout: () => void;
}

export function TutorDashboard({ user, onLogout }: TutorDashboardProps) {
  const [tutorClass, setTutorClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'grading' | 'students' | 'levelup'>('overview');
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [showGradingDialog, setShowGradingDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<string>('assignment');
  const [gradeValue, setGradeValue] = useState<string>('');
  const [gradeComments, setGradeComments] = useState<string>('');
  const [showLevelVerification, setShowLevelVerification] = useState(false);
  const [verificationStudent, setVerificationStudent] = useState<any>(null);
  const [allGrades, setAllGrades] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    
    // Removed aggressive 10-second auto-refresh - use manual refresh button instead
    // Auto-refresh was causing performance issues and constant re-renders

    // Listen for localStorage changes (for cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('user_profile_')) {
        console.log('LocalStorage changed, refreshing tutor dashboard...');
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
      const classData = await api.getTutorClass();
      
      setTutorClass(classData.class);
      setStudents(classData.students || []);
      setAttendance(classData.attendance || []);
    } catch (error) {
      console.error('Failed to load tutor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClassQR = () => {
    if (!tutorClass) return;
    
    // Create a mock event for QR generation
    const mockEvent = {
      id: `class:${tutorClass.className}`,
      title: `${tutorClass.className} - Level ${tutorClass.level} Class`,
      sessionCode: tutorClass.className,
      type: 'class',
      className: tutorClass.className
    };
    
    setSelectedClass(mockEvent);
    setShowQRCode(true);
  };

  const handleOpenGrading = (student: any) => {
    setSelectedStudent(student);
    setGradeValue('');
    setGradeComments('');
    setShowGradingDialog(true);
  };

  const handleSubmitGrade = async () => {
    if (!selectedStudent || !gradeValue) return;

    try {
      // Use the Supabase-based grading method
      await api.gradeStudent(selectedStudent.id, {
        assessmentType: selectedAssessmentType,
        grade: parseFloat(gradeValue),
        level: selectedStudent.level || 1,
        comments: gradeComments
      });
      
      alert('Grade submitted successfully!');
      setShowGradingDialog(false);
      setGradeValue('');
      setGradeComments('');
      loadData();
    } catch (error) {
      console.error('Failed to submit grade:', error);
      alert('Failed to submit grade');
    }
  };

  // Calculate class statistics
  const getStudentAttendanceCount = (studentId: string) => {
    return attendance.filter((a: any) => a.userId === studentId).length;
  };

  const averageAttendance = students.length > 0
    ? (attendance.length / students.length).toFixed(1)
    : '0';

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
                <h1 className="text-xl">UTM Mandarin Club - Tutor</h1>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!tutorClass ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Class Assigned</AlertTitle>
            <AlertDescription>
              You haven't been assigned to a class yet. Please contact the admin to assign you to a class (HYB01-HYB05).
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Class Info Banner */}
            <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-red-600" />
                  Your Assigned Class
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-red-700">{tutorClass.className}</p>
                      <p className="text-sm text-gray-600">Level {tutorClass.level} • {students.length} Students</p>
                    </div>
                    <Button
                      onClick={handleGenerateClassQR}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Generate QR Code
                    </Button>
                  </div>
                  
                  {/* Additional Class Details */}
                  {(tutorClass.description || tutorClass.schedule || tutorClass.venue) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-red-200">
                      {tutorClass.description && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Description</p>
                          <p className="text-sm text-gray-700">{tutorClass.description}</p>
                        </div>
                      )}
                      {tutorClass.schedule && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Schedule</p>
                          <p className="text-sm text-gray-700">{tutorClass.schedule}</p>
                        </div>
                      )}
                      {tutorClass.venue && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Venue</p>
                          <p className="text-sm text-gray-700">{tutorClass.venue}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Navigation Tabs */}
            <div className="bg-white border rounded-lg">
              <div className="border-b">
                <div className="flex gap-4 px-4">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-2 border-b-2 transition-colors ${
                      activeTab === 'overview'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4 inline mr-2" />
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('grading')}
                    className={`py-4 px-2 border-b-2 transition-colors ${
                      activeTab === 'grading'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Grading
                  </button>
                  <button
                    onClick={() => setActiveTab('students')}
                    className={`py-4 px-2 border-b-2 transition-colors ${
                      activeTab === 'students'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    Students
                  </button>
                  <button
                    onClick={() => setActiveTab('levelup')}
                    className={`py-4 px-2 border-b-2 transition-colors ${
                      activeTab === 'levelup'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                    Level Up
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm">Class Students</CardTitle>
                          <Users className="w-4 h-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl">{students.length}</p>
                          <p className="text-xs text-gray-500 mt-1">Level {tutorClass.level}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm">Total Attendance</CardTitle>
                          <ClipboardCheck className="w-4 h-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl">{attendance.length}</p>
                          <p className="text-xs text-gray-500 mt-1">All check-ins</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm">Average Attendance</CardTitle>
                          <GraduationCap className="w-4 h-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl">{averageAttendance}</p>
                          <p className="text-xs text-gray-500 mt-1">Per student</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Student Attendance Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Class Attendance Overview</CardTitle>
                        <CardDescription>Attendance records for {tutorClass.className}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {students.length === 0 ? (
                          <p className="text-gray-500 text-center py-8">No students in this class yet</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Attendance Count</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {students.map((student) => {
                                const attendanceCount = getStudentAttendanceCount(student.id);
                                return (
                                  <TableRow key={student.id}>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>{student.email}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">Level {student.level}</Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={attendanceCount > 0 ? 'default' : 'secondary'}>
                                        {attendanceCount} sessions
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={new Date(student.membershipExpiry) > new Date() ? 'default' : 'destructive'}>
                                        {new Date(student.membershipExpiry) > new Date() ? 'Active' : 'Expired'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'grading' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Grade Students</CardTitle>
                      <CardDescription>Assign marks for assignments, quizzes, projects, and exams</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {students.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No students in your class yet</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Level</TableHead>
                              <TableHead>Attendance</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students.map((student) => (
                              <TableRow key={student.id}>
                                <TableCell>{student.name}</TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">Level {student.level || 1}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    {getStudentAttendanceCount(student.id)} sessions
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenGrading(student)}
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Assign Grade
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'students' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Student Overview</CardTitle>
                      <CardDescription>All students in {tutorClass.className}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {students.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No students in your class yet</p>
                      ) : (
                        <div className="space-y-3">
                          {students.map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{student.name}</p>
                                <p className="text-sm text-gray-600">{student.email}</p>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline">Level {student.level || 1}</Badge>
                                  <Badge variant={new Date(student.membershipExpiry) > new Date() ? 'default' : 'destructive'}>
                                    {new Date(student.membershipExpiry) > new Date() ? 'Active' : 'Expired'}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {getStudentAttendanceCount(student.id)} sessions attended
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenGrading(student)}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Grade
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'levelup' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Level Up Students</CardTitle>
                      <CardDescription>Verify students for level up</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {students.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No students in your class yet</p>
                      ) : (
                        <div className="space-y-3">
                          {students.map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{student.name}</p>
                                <p className="text-sm text-gray-600">{student.email}</p>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline">Level {student.level || 1}</Badge>
                                  <Badge variant={new Date(student.membershipExpiry) > new Date() ? 'default' : 'destructive'}>
                                    {new Date(student.membershipExpiry) > new Date() ? 'Active' : 'Expired'}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {getStudentAttendanceCount(student.id)} sessions attended
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setVerificationStudent(student);
                                  setShowLevelVerification(true);
                                }}
                              >
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Level Up
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QR Code Generator Dialog */}
      {showQRCode && selectedClass && (
        <QRCodeGenerator
          event={selectedClass}
          onClose={() => {
            setShowQRCode(false);
            setSelectedClass(null);
          }}
        />
      )}

      {/* Grading Dialog */}
      <Dialog open={showGradingDialog} onOpenChange={setShowGradingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Grade</DialogTitle>
            <DialogDescription>
              Submit marks for {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                Student: {selectedStudent?.name} • Level {selectedStudent?.level || 1}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Class: {tutorClass?.className}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessment-type">Assessment Type</Label>
              <Select value={selectedAssessmentType} onValueChange={setSelectedAssessmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="exam">Final Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Grade (0-100)</Label>
              <Input
                id="grade"
                type="number"
                min="0"
                max="100"
                value={gradeValue}
                onChange={(e) => setGradeValue(e.target.value)}
                placeholder="Enter grade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Input
                id="comments"
                type="text"
                value={gradeComments}
                onChange={(e) => setGradeComments(e.target.value)}
                placeholder="Enter comments"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGradingDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitGrade}
                disabled={!gradeValue || parseFloat(gradeValue) < 0 || parseFloat(gradeValue) > 100}
              >
                Submit Grade
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Level Verification Dialog */}
      {verificationStudent && (
        <LevelVerificationDialog
          open={showLevelVerification}
          onClose={() => {
            setShowLevelVerification(false);
            setVerificationStudent(null);
          }}
          onSuccess={() => {
            loadData();
          }}
          student={verificationStudent}
        />
      )}
    </div>
  );
}