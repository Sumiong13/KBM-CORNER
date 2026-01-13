import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Download, FileText, Calendar, DollarSign, Users } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { getAllUsers, getAllEvents, getAllAttendance, getAllPayments, getAllRSVPs } from '../lib/storage';

interface ReportsGeneratorProps {
  users: any[];
  events: any[];
}

export function ReportsGenerator({ users, events }: ReportsGeneratorProps) {
  const [generating, setGenerating] = useState<string | null>(null);

  // Helper function to convert data to CSV
  const convertToCSV = (data: any[], headers: string[]): string => {
    if (data.length === 0) return headers.join(',') + '\n';
    
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header.toLowerCase().replace(/ /g, '_')] || '';
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  };

  // Helper function to download CSV file
  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Student List Report
  const generateStudentListReport = () => {
    setGenerating('students');
    try {
      const students = users.filter(u => u.role === 'student');
      
      const reportData = students.map(student => ({
        name: student.name,
        email: student.email,
        membership_level: student.membershipLevel || 1,
        membership_expiry: student.membershipExpiry 
          ? new Date(student.membershipExpiry).toLocaleDateString() 
          : 'N/A',
        verified: student.verified ? 'Yes' : 'No',
        joined_date: student.createdAt 
          ? new Date(student.createdAt).toLocaleDateString() 
          : 'N/A',
      }));

      const headers = ['Name', 'Email', 'Membership Level', 'Membership Expiry', 'Verified', 'Joined Date'];
      const csv = convertToCSV(reportData, headers);
      
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(`student-list-${date}.csv`, csv);
      
      toast.success(`Student list exported! (${students.length} students)`);
    } catch (error) {
      console.error('Error generating student list:', error);
      toast.error('Failed to generate student list report');
    } finally {
      setGenerating(null);
    }
  };

  // Generate Committee List Report
  const generateCommitteeListReport = () => {
    setGenerating('committee');
    try {
      const committeeMembers = users.filter(u => u.role === 'committee' || u.role === 'tutor');
      
      const reportData = committeeMembers.map(member => ({
        name: member.name,
        email: member.email,
        role: member.role.charAt(0).toUpperCase() + member.role.slice(1),
        verified: member.verified ? 'Yes' : 'No',
        assigned_class: (member as any).assignedClass || 'N/A',
        assigned_level: (member as any).assignedLevel || 'N/A',
        joined_date: member.createdAt 
          ? new Date(member.createdAt).toLocaleDateString() 
          : 'N/A',
      }));

      const headers = ['Name', 'Email', 'Role', 'Verified', 'Assigned Class', 'Assigned Level', 'Joined Date'];
      const csv = convertToCSV(reportData, headers);
      
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(`committee-list-${date}.csv`, csv);
      
      toast.success(`Committee list exported! (${committeeMembers.length} members)`);
    } catch (error) {
      console.error('Error generating committee list:', error);
      toast.error('Failed to generate committee list report');
    } finally {
      setGenerating(null);
    }
  };

  // Generate Attendance Report for Each Event
  const generateAttendanceReport = () => {
    setGenerating('attendance');
    try {
      const allAttendance = getAllAttendance();
      
      const reportData = allAttendance.map(record => {
        const user = users.find(u => u.id === record.userId);
        const event = events.find(e => e.id === record.eventId);
        
        return {
          student_name: user?.name || 'Unknown',
          student_email: user?.email || 'N/A',
          event_title: event?.title || record.className || record.sessionCode || 'Unknown Event',
          event_date: event?.date 
            ? new Date(event.date).toLocaleDateString() 
            : 'N/A',
          event_type: event?.type || 'class',
          checked_in_at: new Date(record.checkedInAt).toLocaleString(),
          session_code: record.sessionCode || 'N/A',
        };
      });

      // Sort by event and then by student name
      reportData.sort((a, b) => {
        const eventCompare = a.event_title.localeCompare(b.event_title);
        if (eventCompare !== 0) return eventCompare;
        return a.student_name.localeCompare(b.student_name);
      });

      const headers = ['Student Name', 'Student Email', 'Event Title', 'Event Date', 'Event Type', 'Checked In At', 'Session Code'];
      const csv = convertToCSV(reportData, headers);
      
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(`attendance-report-${date}.csv`, csv);
      
      toast.success(`Attendance report exported! (${reportData.length} records)`);
    } catch (error) {
      console.error('Error generating attendance report:', error);
      toast.error('Failed to generate attendance report');
    } finally {
      setGenerating(null);
    }
  };

  // Generate Financial Report
  const generateFinancialReport = () => {
    setGenerating('financial');
    try {
      const allPayments = getAllPayments();
      
      const reportData = allPayments.map(payment => {
        const user = users.find(u => u.id === payment.userId);
        
        return {
          student_name: payment.name || user?.name || 'Unknown',
          student_email: payment.email || user?.email || 'N/A',
          phone_number: payment.phoneNumber || 'N/A',
          amount: `RM ${payment.amount}`,
          payment_method: payment.paymentMethod || 'N/A',
          reference_number: payment.referenceNumber || 'N/A',
          level: payment.level || 'N/A',
          status: payment.status || 'completed',
          paid_at: new Date(payment.paidAt).toLocaleString(),
        };
      });

      // Sort by payment date (newest first)
      reportData.sort((a, b) => 
        new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
      );

      // Calculate totals
      const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalTransactions = allPayments.length;

      const headers = ['Student Name', 'Student Email', 'Phone Number', 'Amount', 'Payment Method', 'Reference Number', 'Level', 'Status', 'Paid At'];
      const csv = convertToCSV(reportData, headers);
      
      // Add summary at the end
      const summary = `\n\nSUMMARY\nTotal Transactions,${totalTransactions}\nTotal Revenue,RM ${totalRevenue}\n`;
      const csvWithSummary = csv + summary;
      
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(`financial-report-${date}.csv`, csvWithSummary);
      
      toast.success(`Financial report exported! (RM ${totalRevenue} from ${totalTransactions} transactions)`);
    } catch (error) {
      console.error('Error generating financial report:', error);
      toast.error('Failed to generate financial report');
    } finally {
      setGenerating(null);
    }
  };

  // Generate Event Summary Report
  const generateEventSummaryReport = () => {
    setGenerating('events');
    try {
      const allAttendance = getAllAttendance();
      const allRSVPs = getAllRSVPs();
      
      const reportData = events.map(event => {
        const eventAttendance = allAttendance.filter(a => a.eventId === event.id);
        const eventRSVPs = allRSVPs.filter(r => r.eventId === event.id);
        
        return {
          event_title: event.title,
          event_type: event.type || 'event',
          event_date: new Date(event.date).toLocaleDateString(),
          event_time: event.time || 'N/A',
          venue: event.venue || 'N/A',
          session_code: event.sessionCode || 'N/A',
          total_rsvps: eventRSVPs.length,
          total_attendance: eventAttendance.length,
          attendance_rate: eventRSVPs.length > 0 
            ? `${Math.round((eventAttendance.length / eventRSVPs.length) * 100)}%` 
            : 'N/A',
          created_at: event.createdAt 
            ? new Date(event.createdAt).toLocaleDateString() 
            : 'N/A',
        };
      });

      // Sort by event date (newest first)
      reportData.sort((a, b) => 
        new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      );

      const headers = ['Event Title', 'Event Type', 'Event Date', 'Event Time', 'Venue', 'Session Code', 'Total RSVPs', 'Total Attendance', 'Attendance Rate', 'Created At'];
      const csv = convertToCSV(reportData, headers);
      
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(`event-summary-${date}.csv`, csv);
      
      toast.success(`Event summary exported! (${events.length} events)`);
    } catch (error) {
      console.error('Error generating event summary:', error);
      toast.error('Failed to generate event summary report');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Student Reports
            </CardTitle>
            <CardDescription>Export student and committee member data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={generateStudentListReport}
              disabled={generating !== null}
            >
              <Download className="w-4 h-4 mr-2" />
              {generating === 'students' ? 'Generating...' : 'Export Student List'}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={generateCommitteeListReport}
              disabled={generating !== null}
            >
              <Download className="w-4 h-4 mr-2" />
              {generating === 'committee' ? 'Generating...' : 'Export Committee & Tutors List'}
            </Button>
            <div className="pt-2 text-xs text-gray-500">
              <p>Includes names, emails, membership levels, and verification status</p>
            </div>
          </CardContent>
        </Card>

        {/* Event & Attendance Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Event & Attendance Reports
            </CardTitle>
            <CardDescription>Export event analytics and attendance records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={generateAttendanceReport}
              disabled={generating !== null}
            >
              <Download className="w-4 h-4 mr-2" />
              {generating === 'attendance' ? 'Generating...' : 'Export Attendance Report'}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={generateEventSummaryReport}
              disabled={generating !== null}
            >
              <Download className="w-4 h-4 mr-2" />
              {generating === 'events' ? 'Generating...' : 'Export Event Summary'}
            </Button>
            <div className="pt-2 text-xs text-gray-500">
              <p>Attendance includes all events and classes with check-in details</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Financial Reports
            </CardTitle>
            <CardDescription>Export payment and revenue data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={generateFinancialReport}
              disabled={generating !== null}
            >
              <Download className="w-4 h-4 mr-2" />
              {generating === 'financial' ? 'Generating...' : 'Export Financial Report'}
            </Button>
            <div className="pt-2 text-xs text-gray-500">
              <p>Includes all payments with student details, amounts, payment methods, and total revenue summary</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Report Overview
            </CardTitle>
            <CardDescription>Current data snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-gray-600">Students</p>
                <p className="text-2xl font-bold text-blue-600">
                  {users.filter(u => u.role === 'student').length}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-gray-600">Club Members</p>
                <p className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.role === 'committee' || u.role === 'tutor').length}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-purple-600">
                  {events.length}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-gray-600">Attendance Records</p>
                <p className="text-2xl font-bold text-orange-600">
                  {getAllAttendance().length}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t">
              <p className="text-xs text-gray-500">
                💡 All reports are exported as CSV files and can be opened in Excel or Google Sheets
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
