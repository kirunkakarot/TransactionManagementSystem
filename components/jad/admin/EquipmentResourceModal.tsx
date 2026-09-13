"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wrench, 
  Check, 
  Layers, 
  ShieldCheck, 
  AlertTriangle,
  Boxes
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EquipmentResource, ServiceItem } from '../types';
import { toast } from 'sonner';

interface EquipmentResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceToEdit: EquipmentResource | null;
  onSaveResource: (resource: EquipmentResource) => void;
  availableServices: ServiceItem[];
}

const EQUIPMENT_CATEGORIES = [
  'Visual / Video',
  'Audio',
  'Lighting & FX',
  'Special Effects',
  'Guest Engagement',
  'Photo Media',
  'Media Coverage',
  'Aerial Video',
  'Furniture Rentals',
  'Staging & Rigging',
  'Power & Generators'
];

export const EquipmentResourceModal: React.FC<EquipmentResourceModalProps> = ({
  isOpen,
  onClose,
  resourceToEdit,
  onSaveResource,
  availableServices
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Visual / Video');
  const [quantity, setQuantity] = useState<number>(4);
  const [availableUnits, setAvailableUnits] = useState<number>(4);
  const [unit, setUnit] = useState('sets');
  const [condition, setCondition] = useState<'Excellent' | 'Good' | 'Needs Maintenance'>('Excellent');
  const [assignedServiceId, setAssignedServiceId] = useState<string>('event-production');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (resourceToEdit) {
      setName(resourceToEdit.name);
      setCategory(resourceToEdit.category);
      setQuantity(resourceToEdit.quantity);
      setAvailableUnits(resourceToEdit.availableUnits);
      setUnit(resourceToEdit.unit || 'units');
      setCondition(resourceToEdit.condition || 'Excellent');
      setAssignedServiceId(resourceToEdit.assignedServiceId || 'event-production');
      setNotes(resourceToEdit.notes || '');
    } else {
      setName('');
      setCategory('Visual / Video');
      setQuantity(4);
      setAvailableUnits(4);
      setUnit('units');
      setCondition('Excellent');
      setAssignedServiceId(availableServices[0]?.id || 'event-production');
      setNotes('Certified operational inspection completed.');
    }
  }, [resourceToEdit, isOpen, availableServices]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Gear Name Required', { description: 'Please enter a name or model for the equipment item.' });
      return;
    }
    if (quantity < 0 || availableUnits < 0) {
      toast.error('Invalid Quantity', { description: 'Inventory counts cannot be negative.' });
      return;
    }
    if (availableUnits > quantity) {
      toast.error('Invalid Available Units', { description: 'Available units cannot exceed total inventory count.' });
      return;
    }

    const finalResource: EquipmentResource = {
      id: resourceToEdit ? resourceToEdit.id : `eq-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      category,
      quantity: Number(quantity),
      availableUnits: Number(availableUnits),
      unit: unit.trim() || 'units',
      condition,
      assignedServiceId: assignedServiceId || undefined,
      notes: notes.trim()
    };

    onSaveResource(finalResource);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg p-6 sm:p-8 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-[#1E3A8A]">
                {resourceToEdit ? 'Edit Equipment & Resource' : 'Add Inventory Resource'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Manage hardware availability, technical condition, and service allocation.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Equipment / Resource Name *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. NovaStar P3 LED Processor & Panels"
              required
              className="text-xs font-semibold rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Equipment Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              >
                {EQUIPMENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Hardware Condition</label>
              <select
                value={condition}
                onChange={e => setCondition(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              >
                <option value="Excellent">â­ Excellent (Showcase Ready)</option>
                <option value="Good">✓ Good (Operational)</option>
                <option value="Needs Maintenance">âš ï¸ Needs Maintenance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Total Count *</label>
              <Input
                type="number"
                value={quantity}
                onChange={e => {
                  const val = Number(e.target.value);
                  setQuantity(val);
                  if (availableUnits > val) setAvailableUnits(val);
                }}
                required
                min={0}
                className="text-xs font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Available Ready *</label>
              <Input
                type="number"
                value={availableUnits}
                onChange={e => setAvailableUnits(Number(e.target.value))}
                required
                min={0}
                max={quantity}
                className="text-xs font-extrabold text-emerald-700 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Unit Type</label>
              <Input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="sets / units / rigs"
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Assigned Event Service</label>
            <select
              value={assignedServiceId}
              onChange={e => setAssignedServiceId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="">-- Unassigned (General Inventory) --</option>
              {availableServices.map(srv => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} ({srv.category})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Maintenance & Warehouse Notes</label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Flight-cased in pairs, flight battery firmware updated."
              className="text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button type="submit" variant="brand" className="rounded-xl text-xs font-bold bg-[#1E3A8A] hover:bg-blue-900 text-white gap-1.5">
              <Check className="w-4 h-4" />
              <span>{resourceToEdit ? 'Save Inventory Specs' : 'Add to Inventory'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

