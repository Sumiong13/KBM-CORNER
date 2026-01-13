import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { UserPlus, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

interface AssignClassButtonProps {
  member: {
    id: string;
    name: string;
    assignedClass?: string;
    assignedClassId?: string;
  };
  onAssigned: () => void;
}

interface ClassOption {
  id: string;
  className: string;
  level: number;
  description: string;
}

export function AssignClassButton({ member, onAssigned }: AssignClassButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Load classes from database when dialog opens
  useEffect(() => {
    if (open) {
      loadClasses();
    }
  }, [open]);

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const { getAllClasses } = await import('../lib/supabaseStorage');
      const allClasses = await getAllClasses();
      
      // Filter out classes that already have tutors assigned (except current tutor's class)
      const availableClasses = allClasses.filter(
        c => !c.tutorId || c.tutorId === member.id
      );
      
      setClasses(availableClasses.map(c => ({
        id: c.id,
        className: c.className,
        level: c.level,
        description: c.description || `Level ${c.level} Mandarin Class`,
      })));
    } catch (error) {
      console.error('Failed to load classes:', error);
      alert('Failed to load classes. Please try again.');
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedClassId) return;

    try {
      setLoading(true);
      const selectedClass = classes.find(c => c.id === selectedClassId);
      if (!selectedClass) return;

      await api.assignClassToTutor(member.id, selectedClassId);
      alert(`Successfully assigned ${member.name} to ${selectedClass.className}!`);
      setOpen(false);
      onAssigned();
    } catch (error) {
      console.error('Failed to assign class:', error);
      alert('Failed to assign class: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={member.assignedClass ? 'outline' : 'default'}>
          {member.assignedClass ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              {member.assignedClass}
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Class
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Class to Tutor</DialogTitle>
          <DialogDescription>
            Assign {member.name} to a class from the Class Management system
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Tutor:</strong> {member.name}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {member.assignedClass 
                ? `Currently assigned to ${member.assignedClass}`
                : 'Not yet assigned to any class'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="class-select">Select Class</Label>
            {loadingClasses ? (
              <p className="text-sm text-gray-500">Loading classes...</p>
            ) : classes.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-900">
                  No available classes found. Please create a class in the Class Management tab first.
                </p>
              </div>
            ) : (
              <>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger id="class-select">
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.className} - Level {cls.level} - {cls.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Only classes without assigned tutors are shown
                </p>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!selectedClassId || loading || loadingClasses}
            >
              {loading ? 'Assigning...' : 'Assign Class'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}