'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchEventTypes, createEventTypeApi, updateEventTypeApi } from '@/services/api';
import { EventType } from '@/components/jad/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { List } from 'lucide-react';

export function EventTypeManager() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<EventType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  });

  const loadEventTypes = async () => {
    try {
      setLoading(true);
      const data = await fetchEventTypes();
      setEventTypes(data.eventTypes || []);
    } catch (error: any) {
      toast.error('Error', { description: 'Failed to load event types' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventTypes();
  }, []);

  const openModal = (eventType?: EventType) => {
    if (eventType) {
      setEditingType(eventType);
      setFormData({
        name: eventType.name,
        description: eventType.description || '',
        isActive: eventType.isActive,
      });
    } else {
      setEditingType(null);
      setFormData({ name: '', description: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingType(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Validation Error', { description: 'Name is required.' });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('jad_token') || '';
      
      if (editingType) {
        await updateEventTypeApi(editingType.id, formData, token);
        toast.success('Success', { description: 'Event type updated successfully.' });
      } else {
        await createEventTypeApi(formData, token);
        toast.success('Success', { description: 'Event type created successfully.' });
      }
      closeModal();
      loadEventTypes();
    } catch (error: any) {
      toast.error('Error', { description: error.message || 'Failed to save event type' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="rounded-md border-slate-200/90 shadow-sm bg-white p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-2">
            <List className="w-4 h-4 text-emerald-600" />
            <span>Event Types</span>
          </h3>
          <p className="text-xs text-slate-500">Manage configurable event types for inquiries.</p>
        </div>
        <Button onClick={() => openModal()} className="rounded-md bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-xs h-9 px-4 font-semibold shadow-sm gap-2">
          <Plus className="h-4 w-4" />
          Add Event Type
        </Button>
      </div>
      <div className="pt-2">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : eventTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No event types found.</div>
        ) : (
          <div className="space-y-4">
            {eventTypes.map((et) => (
              <div key={et.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{et.name}</h4>
                    <Badge variant={et.isActive ? 'default' : 'secondary'} className={et.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}>
                      {et.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {et.description && (
                    <p className="text-sm text-muted-foreground mt-1">{et.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openModal(et)} className="h-8 border-slate-200 hover:bg-slate-100 text-slate-600">
                    <Pencil className="h-4 w-4 mr-2 text-[#1E3A8A]" /> Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[#1E3A8A] font-extrabold">{editingType ? 'Edit Event Type' : 'Add Event Type'}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure the event type details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Birthday Celebration"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the event type..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active (Visible to customers)</Label>
            </div>
            <DialogFooter className="pt-4 border-t border-slate-100 mt-4">
              <Button type="button" variant="outline" onClick={closeModal} disabled={submitting} className="font-semibold text-slate-600 border-slate-200">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="font-semibold bg-[#1E3A8A] hover:bg-[#1E3A8A]/90">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingType ? 'Update Event Type' : 'Create Event Type'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
