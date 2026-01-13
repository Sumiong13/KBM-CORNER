import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { CheckCircle2, XCircle, TrendingUp, Calendar, Award, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface LevelVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: any;
  grades?: any[]; // Make this optional since we'll load it ourselves
}

export function LevelVerificationDialog({
  open,
  onClose,
  onSuccess,
  student,
  grades: initialGrades,
}: LevelVerificationDialogProps) {
  const [approving, setApproving] = useState(false);
  const [tutorNotes, setTutorNotes] = useState('');
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [grades, setGrades] = useState<any[]>(initialGrades || []);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const currentLevel = student?.level || student?.membershipLevel || 1;
  const nextLevel = Math.min(currentLevel + 1, 5);

  // Load grades from Supabase when dialog opens
  useEffect(() => {
    const loadGrades = async () => {
      if (!student?.id || !open) return;
      
      try {
        setLoadingGrades(true);
        const result = await api.getStudentGrades(student.id);
        setGrades(result.grades || []);
      } catch (error) {
        console.error('Failed to load student grades:', error);
        // Fall back to localStorage if Supabase fails
        const localGrades = localStorage.getItem(`grades_${student.id}`);
        if (localGrades) {
          setGrades(JSON.parse(localGrades));
        }
      } finally {
        setLoadingGrades(false);
      }
    };

    loadGrades();
  }, [student?.id, open]);

  // Calculate student statistics
  const studentGrades = grades.filter(g => g.level === currentLevel);
  const averageGrade = studentGrades.length > 0
    ? studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length
    : 0;
  const passRate = studentGrades.length > 0
    ? (studentGrades.filter(g => g.grade >= 60).length / studentGrades.length) * 100
    : 0;

  const handleVerify = async (approved: boolean) => {
    if (!student) return;

    try {
      setApproving(true);
      setDecision(approved ? 'approve' : 'reject');

      const result = await api.verifyLevelUp(student.id, approved, tutorNotes);

      if (result.success) {
        alert(result.message);
        onSuccess();
        handleClose();
      } else {
        alert(result.message || 'Failed to verify level');
      }
    } catch (error: any) {
      console.error('Failed to verify level:', error);
      alert(`Failed to verify level: ${error.message}`);
    } finally {
      setApproving(false);
      setDecision(null);
    }
  };

  const handleClose = () => {
    setTutorNotes('');
    setDecision(null);
    onClose();
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Level Verification - End of Semester</DialogTitle>
          <DialogDescription>
            Review {student.name}'s performance and decide if they should progress to the next level
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Student Info */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{student.name}</h3>
                  <p className="text-sm text-gray-600">{student.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    Level {currentLevel}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {averageGrade.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600">Average Grade</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {passRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600">Pass Rate</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {studentGrades.length}
                  </div>
                  <div className="text-xs text-gray-600">Total Grades</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Level Progression */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold text-blue-600">L{currentLevel}</span>
                  </div>
                  <p className="text-sm font-medium">Current Level</p>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-gray-400" />
                </div>

                <div className="text-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 ${
                    currentLevel >= 5 ? 'bg-gray-100' : 'bg-green-100'
                  }`}>
                    <span className={`text-2xl font-bold ${
                      currentLevel >= 5 ? 'text-gray-400' : 'text-green-600'
                    }`}>
                      {currentLevel >= 5 ? '✓' : `L${nextLevel}`}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {currentLevel >= 5 ? 'Max Level' : 'Next Level'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Grades */}
          {studentGrades.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Recent Grades (Level {currentLevel})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {studentGrades.slice(-5).reverse().map((grade) => (
                    <div
                      key={grade.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{grade.assessmentType}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(grade.gradedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={grade.grade >= 60 ? 'default' : 'secondary'}
                        className={grade.grade >= 60 ? 'bg-green-500' : 'bg-red-500'}
                      >
                        {grade.grade}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning for no grades */}
          {studentGrades.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900">No Grades for Current Level</p>
                <p className="text-sm text-yellow-800">
                  This student has no recorded grades for Level {currentLevel}. Consider their overall
                  performance and attendance before making a decision.
                </p>
              </div>
            </div>
          )}

          {/* Maximum Level Notice */}
          {currentLevel >= 5 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Maximum Level Reached</p>
                <p className="text-sm text-blue-800">
                  This student is already at the maximum level (Level 5). They have completed the entire program!
                </p>
              </div>
            </div>
          )}

          {/* Tutor Notes */}
          <div>
            <Label htmlFor="notes" className="text-base font-semibold mb-3 block">
              Tutor Notes & Feedback
            </Label>
            <Textarea
              id="notes"
              value={tutorNotes}
              onChange={(e) => setTutorNotes(e.target.value)}
              placeholder="Add your notes about the student's performance this semester..."
              className="min-h-[100px]"
              disabled={approving || currentLevel >= 5}
            />
            <p className="text-xs text-gray-500 mt-2">
              Your notes will be recorded and visible to administrators
            </p>
          </div>

          {/* Decision Guidelines */}
          <Card className="bg-gray-50">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-3">Verification Guidelines</h4>
              <div className="space-y-2 text-sm">
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Approve:</strong> Student demonstrates good understanding, consistent attendance, and satisfactory performance</span>
                </p>
                <p className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Reject:</strong> Student needs more practice, has poor attendance, or shows insufficient mastery of current level</span>
                </p>
                <p className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span><strong>End of Semester:</strong> This decision should be made after reviewing the entire semester's performance</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={approving}
          >
            Cancel
          </Button>
          {currentLevel < 5 && (
            <>
              <Button
                variant="destructive"
                onClick={() => handleVerify(false)}
                disabled={approving}
              >
                {approving && decision === 'reject' ? 'Processing...' : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Remain at Level {currentLevel}
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleVerify(true)}
                disabled={approving}
                className="bg-green-600 hover:bg-green-700"
              >
                {approving && decision === 'approve' ? 'Processing...' : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Promote to Level {nextLevel}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}