import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Edit, Trash2, GraduationCap, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import * as supabaseStorage from '../lib/supabaseStorage';

interface ClassData {
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

interface ClassManagementProps {
  tutors: any[];
  onClassAssigned: () => void;
}

export function ClassManagement({ tutors, onClassAssigned }: ClassManagementProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [formData, setFormData] = useState({
    className: '',
    level: 1,
    description: '',
    schedule: '',
    venue: '',
    capacity: 20,
    tutorId: '',
  });

  useEffect(() => {
    loadClasses();
  }, [tutors]);

  const loadClasses = async () => {
    try {
      const classesData = await supabaseStorage.getAllClasses();
      
      // Enrich classes with tutor information from props
      const enrichedClasses = classesData.map((cls) => {
        if (cls.tutorId) {
          const tutor = tutors.find(t => t.id === cls.tutorId);
          return {
            ...cls,
            tutorName: tutor?.name || cls.tutorName || 'Unknown Tutor'
          };
        }
        return cls;
      });
      
      setClasses(enrichedClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Failed to load classes');
    }
  };

  const openDialog = (classData?: ClassData) => {
    if (classData) {
      setEditingClass(classData);
      setFormData({
        className: classData.className,
        level: classData.level,
        description: classData.description,
        schedule: classData.schedule,
        venue: classData.venue,
        capacity: classData.capacity,
        tutorId: classData.tutorId || '',
      });
    } else {
      setEditingClass(null);
      setFormData({
        className: '',
        level: 1,
        description: '',
        schedule: '',
        venue: '',
        capacity: 20,
        tutorId: '',
      });
    }
    setShowDialog(true);
  };

  const handleSaveClass = async () => {
    // Validation
    if (!formData.className.trim()) {
      toast.error('Please enter a class name');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Please enter a class description');
      return;
    }
    if (!formData.schedule.trim()) {
      toast.error('Please enter a class schedule');
      return;
    }
    if (!formData.venue.trim()) {
      toast.error('Please enter a venue');
      return;
    }

    try {
      const selectedTutor = (formData.tutorId && formData.tutorId !== 'NONE') 
        ? tutors.find(t => t.id === formData.tutorId) 
        : null;

      if (editingClass) {
        // Update existing class
        await supabaseStorage.updateClass(editingClass.id, {
          className: formData.className,
          level: formData.level,
          description: formData.description,
          schedule: formData.schedule,
          venue: formData.venue,
          capacity: formData.capacity,
          tutorId: (formData.tutorId && formData.tutorId !== 'NONE') ? formData.tutorId : undefined,
          tutorName: selectedTutor?.name || undefined,
        });
        
        toast.success('Class updated successfully!');
      } else {
        // Create new class
        await supabaseStorage.saveClass({
          className: formData.className,
          level: formData.level,
          description: formData.description,
          schedule: formData.schedule,
          venue: formData.venue,
          capacity: formData.capacity,
          tutorId: (formData.tutorId && formData.tutorId !== 'NONE') ? formData.tutorId : undefined,
          tutorName: selectedTutor?.name || undefined,
        });
        
        toast.success('Class created successfully!');
      }

      await loadClasses();
      setShowDialog(false);
      onClassAssigned();
    } catch (error: any) {
      console.error('Error saving class:', error);
      // Check for unique constraint violation
      if (error?.code === '23505' || error?.message?.includes('duplicate')) {
        toast.error('A class with this name already exists');
      } else {
        toast.error('Failed to save class: ' + (error?.message || 'Unknown error'));
      }
    }
  };

  const handleDeleteClass = async (classId: string) => {
    const classToDelete = classes.find(c => c.id === classId);
    if (!classToDelete) return;

    if (!confirm(`Are you sure you want to delete ${classToDelete.className}? This will automatically unassign any tutor from this class.`)) {
      return;
    }

    try {
      await supabaseStorage.deleteClass(classId);
      await loadClasses();
      toast.success('Class deleted successfully!');
      onClassAssigned();
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast.error('Failed to delete class: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleChangeTutor = async (classId: string, newTutorId: string) => {
    const classData = classes.find(c => c.id === classId);
    if (!classData) return;

    try {
      const tutor = (newTutorId && newTutorId !== 'NONE') ? tutors.find(t => t.id === newTutorId) : null;
      
      await supabaseStorage.updateClass(classId, {
        tutorId: (newTutorId && newTutorId !== 'NONE') ? newTutorId : undefined,
        tutorName: tutor?.name || undefined,
      });

      await loadClasses();
      toast.success((newTutorId && newTutorId !== 'NONE') ? 'Tutor assigned successfully!' : 'Tutor unassigned successfully!');
      onClassAssigned();
    } catch (error: any) {
      console.error('Error changing tutor:', error);
      toast.error('Failed to update tutor assignment: ' + (error?.message || 'Unknown error'));
    }
  };

  const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const getLevelName = (level: number) => {
    const levels: { [key: number]: string } = {
      1: 'Beginner',
      2: 'Elementary',
      3: 'Intermediate',
      4: 'Upper Intermediate',
      5: 'Advanced'
    };
    return levels[level] || 'Unknown';
  };

  const getAvailableTutors = (currentTutorId?: string) => {
    // Get tutors who are verified and either not assigned or are the current tutor
    return tutors.filter(t => 
      t.verified && (!t.assignedClass || t.id === currentTutorId)
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Classes</CardTitle>
            <GraduationCap className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl">{classes.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Classes with Tutors</CardTitle>
            <Users className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl">{classes.filter(c => c.tutorId).length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {classes.length > 0 
                ? `${Math.round((classes.filter(c => c.tutorId).length / classes.length) * 100)}% assigned`
                : '0% assigned'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Capacity</CardTitle>
            <Users className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl">{classes.reduce((sum, c) => sum + c.capacity, 0)}</p>
            <p className="text-xs text-gray-500 mt-1">students across all classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Class Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Class Management</CardTitle>
              <CardDescription>Create and manage Mandarin classes and assign tutors</CardDescription>
            </div>
            <Button onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Class
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="font-medium text-gray-600">No Classes Yet</p>
              <p className="text-sm text-gray-500">Click "Create Class" to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((classData) => (
                <div key={classData.id} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">{classData.className}</h3>
                        <Badge variant="secondary">
                          Level {classData.level} - {getLevelName(classData.level)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{classData.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Schedule
                          </p>
                          <p>{classData.schedule}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Venue</p>
                          <p>{classData.venue}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Capacity</p>
                          <p>{classData.capacity} students</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Created</p>
                          <p>{new Date(classData.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Tutor Assignment */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label className="text-sm text-gray-600">Assigned Tutor:</Label>
                        <Select
                          value={classData.tutorId || ''}
                          onValueChange={(value) => handleChangeTutor(classData.id, value)}
                        >
                          <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Select a tutor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">No tutor assigned</SelectItem>
                            {getAvailableTutors(classData.tutorId).map((tutor) => (
                              <SelectItem key={tutor.id} value={tutor.id}>
                                {tutor.name} ({tutor.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {classData.tutorId && classData.tutorName && (
                          <Badge className="bg-green-100 text-green-700">
                            {classData.tutorName}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openDialog(classData)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteClass(classData.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
            <DialogDescription>
              {editingClass ? 'Update class details and assignment' : 'Add a new Mandarin class'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="className">Class Name *</Label>
              <Input
                id="className"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                placeholder="e.g., HYB01, Mandarin Beginner, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Level *</Label>
              <Select
                value={String(formData.level)}
                onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1 - Beginner</SelectItem>
                  <SelectItem value="2">Level 2 - Elementary</SelectItem>
                  <SelectItem value="3">Level 3 - Intermediate</SelectItem>
                  <SelectItem value="4">Level 4 - Upper Intermediate</SelectItem>
                  <SelectItem value="5">Level 5 - Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the class curriculum and objectives"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule">Schedule *</Label>
                <Input
                  id="schedule"
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  placeholder="e.g., Mon & Wed 7-9 PM"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue *</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g., Room A101"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                max="100"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 20 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tutor">Assign Tutor (Optional)</Label>
              <Select
                value={formData.tutorId}
                onValueChange={(value) => setFormData({ ...formData, tutorId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tutor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No tutor assigned</SelectItem>
                  {getAvailableTutors(editingClass?.tutorId).map((tutor) => (
                    <SelectItem key={tutor.id} value={tutor.id}>
                      {tutor.name} ({tutor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Only verified tutors without existing assignments are shown
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveClass}>
                {editingClass ? 'Update Class' : 'Create Class'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
