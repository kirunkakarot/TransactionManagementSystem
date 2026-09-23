"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  Users, 
  Layers, 
  Star,
  Power,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PackageItem, ServiceItem, EventType } from '../types';
import { toast } from 'sonner';

interface PackageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageToEdit: PackageItem | null;
  onSavePackage: (pkg: PackageItem) => void;
  availableServices: ServiceItem[];
  availableEventTypes?: EventType[];
}

export const PackageEditorModal: React.FC<PackageEditorModalProps> = ({
  isOpen,
  onClose,
  packageToEdit,
  onSavePackage,
  availableServices,
  availableEventTypes = []
}) => {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [capacity, setCapacity] = useState('100 - 150 Guests');
  const [price, setPrice] = useState<number>(45000);
  const [originalPrice, setOriginalPrice] = useState<number>(55000);
  const [idealFor, setIdealFor] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Bundled services
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Linked Event Type IDs
  const [selectedEventTypeIds, setSelectedEventTypeIds] = useState<number[]>([]);

  // Inclusions list
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [newInclusion, setNewInclusion] = useState('');

  // Features list
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    if (packageToEdit) {
      setName(packageToEdit.name || '');
      setTagline(packageToEdit.tagline || (packageToEdit as any).description || '');
      setCapacity(packageToEdit.capacity || '50 - 200 Guests');
      setPrice(packageToEdit.price || 0);
      setOriginalPrice(packageToEdit.originalPrice || Math.round((packageToEdit.price || 0) * 1.2));
      setIdealFor(packageToEdit.idealFor || '');
      setIsPopular(packageToEdit.isPopular || false);
      setIsActive(packageToEdit.isActive !== false);
      setSelectedServiceIds(Array.isArray(packageToEdit.servicesIncluded) ? packageToEdit.servicesIncluded : []);
      setInclusions(Array.isArray(packageToEdit.inclusions) ? packageToEdit.inclusions : []);
      setFeatures(Array.isArray(packageToEdit.features) ? packageToEdit.features : []);
      setSelectedEventTypeIds(
        (packageToEdit.eventTypes as EventType[])?.map((et: EventType) => et.id) || []
      );
    } else {
      setName('');
      setTagline('Complete end-to-end event production and guest experience suite.');
      setCapacity('100 - 200 Guests');
      setPrice(55000);
      setOriginalPrice(68000);
      setIdealFor('Weddings, Debuts, Corporate Milestones');
      setIsPopular(false);
      setIsActive(true);
      setSelectedServiceIds(['event-decoration', 'photo-video', 'entertainment']);
      setInclusions([
        'Full Stage & Thematic Venue Backdrop Styling',
        'Professional Host / Emcee & Live Acoustic Duo',
        '4-Hour Magnetic Instant Print Photo Booth',
        'Dedicated On-Day Coordination Team (3 staff)'
      ]);
      setFeatures([
        'Integrated Quotation & Invoice Ledger',
        'Real-time Schedule Tracker',
        'Complimentary Rehearsal Director'
      ]);
      setSelectedEventTypeIds([]);
    }
  }, [packageToEdit, isOpen]);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev => 
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const toggleEventType = (eventTypeId: number) => {
    setSelectedEventTypeIds(prev => 
      prev.includes(eventTypeId) ? prev.filter(id => id !== eventTypeId) : [...prev, eventTypeId]
    );
  };

  const handleAddInclusion = () => {
    if (!newInclusion.trim()) return;
    setInclusions(prev => [...prev, newInclusion.trim()]);
    setNewInclusion('');
  };

  const handleRemoveInclusion = (index: number) => {
    setInclusions(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    setFeatures(prev => [...prev, newFeature.trim()]);
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Package Name Required', { description: 'Please provide a name for this package bundle.' });
      return;
    }
    if (price <= 0) {
      toast.error('Invalid Package Rate', { description: 'Package price must be greater than zero.' });
      return;
    }

    const finalPackage: PackageItem = {
      id: packageToEdit ? packageToEdit.id : `pkg-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      tagline: tagline.trim(),
      capacity: capacity.trim(),
      price: Number(price),
      originalPrice: originalPrice > 0 ? Number(originalPrice) : undefined,
      isPopular,
      isActive,
      idealFor: idealFor.trim() || 'All Special Occasions',
      servicesIncluded: selectedServiceIds,
      inclusions: inclusions.length > 0 ? inclusions : ['Standard All-In Event Coordination'],
      features: features.length > 0 ? features : ['Online Portal Milestone Tracking'],
      eventTypes: selectedEventTypeIds
    };

    onSavePackage(finalPackage);
    onClose();
  };

  // Calculate sum of individual services selected for comparison
  const bundledServicesValue = availableServices
    .filter(s => selectedServiceIds.includes(s.id))
    .reduce((sum, s) => sum + s.startingPrice, 0);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 rounded-md">
        <DialogHeader>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-md bg-blue-100 text-[#1E3A8A] flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-extrabold text-[#1E3A8A]">
                  {packageToEdit ? 'Edit Event Package' : 'Create All-Inclusive Package'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Bundle multiple services, assign guest capacity, set package pricing, and define inclusions.
                </DialogDescription>
              </div>
            </div>
            <Badge variant={isActive ? 'success' : 'outline'} className="text-xs">
              {isActive ? 'Active in Packages' : 'Deactivated / Hidden'}
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Status & Popularity Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Catalog Visibility:</span>
              <Button
                type="button"
                variant={isActive ? 'brand' : 'outline'}
                size="sm"
                onClick={() => setIsActive(!isActive)}
                className={`text-xs h-7 px-3 rounded-md font-bold ${isActive ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-slate-500'}`}
              >
                <Power className="w-3.5 h-3.5 mr-1" />
                {isActive ? 'Active in Showcase' : 'Deactivated'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={isPopular ? 'brand' : 'outline'}
                size="sm"
                onClick={() => setIsPopular(!isPopular)}
                className={`text-xs h-7 px-3 rounded-md font-bold ${isPopular ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'text-slate-600'}`}
              >
                <Star className="w-3.5 h-3.5 mr-1" />
                {isPopular ? 'â­ Featured Most Popular' : 'Mark as Popular'}
              </Button>
            </div>
          </div>

          {/* Package Name & Target Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Package Title *</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Diamond Jubilee All-In Suite"
                required
                className="text-xs font-semibold rounded-md"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Ideal For / Occasion Tag *</label>
              <Input
                value={idealFor}
                onChange={e => setIdealFor(e.target.value)}
                placeholder="e.g. Grand Weddings, Milestone 18th Debuts"
                required
                className="text-xs rounded-md"
              />
            </div>
          </div>

          {/* Tagline / Subtitle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Package Tagline & Value Statement</label>
            <Input
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="e.g. All-inclusive luxury production and complete guest entertainment."
              className="text-xs rounded-md"
            />
          </div>

          {/* Pricing & Guest Capacity Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Package Rate (PHP) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₱</span>
                <Input
                  type="number"
                  value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                  placeholder="65000"
                  required
                  min={0}
                  step={500}
                  className="pl-7 text-xs font-extrabold text-[#1E3A8A] rounded-md"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Original Value (PHP)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₱</span>
                <Input
                  type="number"
                  value={originalPrice}
                  onChange={e => setOriginalPrice(Number(e.target.value))}
                  placeholder="80000"
                  min={0}
                  step={500}
                  className="pl-7 text-xs font-medium text-slate-500 rounded-md"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Guest Capacity Scope *</label>
              <div className="relative">
                <Users className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <Input
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  placeholder="100 - 200 Guests"
                  required
                  className="pl-8 text-xs font-semibold rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Add Services to Package */}
          <div className="p-4 rounded-md bg-blue-50/70 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1E3A8A]">
                Add Event Services to this Bundle
              </label>
              <span className="text-[11px] text-blue-700 font-semibold">
                {selectedServiceIds.length} Services Selected • Alacarte Value: ₱{bundledServicesValue.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Select which individual services from your catalog are packaged together:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {availableServices.map(srv => {
                const isSelected = selectedServiceIds.includes(srv.id);
                return (
                  <button
                    type="button"
                    key={srv.id}
                    onClick={() => toggleService(srv.id)}
                    className={`flex items-center justify-between p-2.5 rounded-md border text-left text-xs transition-all ${
                      isSelected 
                        ? 'bg-white border-[#1E3A8A] shadow-sm' 
                        : 'bg-white/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-800">{srv.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Base: ₱{srv.startingPrice.toLocaleString()} PHP • {srv.category}
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ml-2 ${
                      isSelected ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Package Inclusions (Line item deliverables) */}
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Package Deliverable Inclusions (Displayed on Customer Card)
              </label>
              <span className="text-[11px] text-slate-400 font-normal">{inclusions.length} items</span>
            </div>

            <div className="space-y-1.5">
              {inclusions.map((inc, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md bg-white border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-slate-800 font-medium">{inc}</span>
                  </div>
                  <button type="button" onClick={() => handleRemoveInclusion(i)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newInclusion}
                onChange={e => setNewInclusion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddInclusion(); } }}
                placeholder="e.g. 5-Hour High-Definition LED Wall (9x12 ft)"
                className="text-xs rounded-md flex-1 bg-white"
              />
              <Button type="button" size="sm" onClick={handleAddInclusion} className="text-xs rounded-md bg-orange-600 hover:bg-orange-700 text-white font-bold">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Value Features & Digital Management Perks */}
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Digital & Portal Perks (Badges)
              </label>
              <span className="text-[11px] text-slate-400 font-normal">{features.length} perks</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {features.map((feat, i) => (
                <Badge key={i} variant="brand" className="text-xs py-1 px-2.5 gap-1.5">
                  <span>{feat}</span>
                  <button type="button" onClick={() => handleRemoveFeature(i)} className="hover:text-red-300">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={e => setNewFeature(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
                placeholder="e.g. Real-Time Rehearsal Script Sync"
                className="text-xs rounded-md flex-1 bg-white"
              />
              <Button type="button" size="sm" onClick={handleAddFeature} className="text-xs rounded-md bg-[#1E3A8A] text-white font-bold">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Linked Event Types */}
          <div className="p-4 rounded-md bg-purple-50/60 border border-purple-200 space-y-3">
            <label className="text-xs font-bold text-purple-800 flex items-center justify-between">
              <span>Assign Event Types</span>
              <span className="text-[11px] text-purple-700 font-semibold">{selectedEventTypeIds.length} Linked</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Select which event types this package applies to. Leave empty to apply to all.
            </p>

            <div className="flex flex-wrap gap-2">
              {availableEventTypes.map(et => {
                const isSelected = selectedEventTypeIds.includes(et.id);
                return (
                  <button
                    type="button"
                    key={et.id}
                    onClick={() => toggleEventType(et.id)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      isSelected 
                        ? 'bg-purple-600 border-purple-600 text-white shadow-sm' 
                        : 'bg-white/60 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>{et.name}</span>
                    <div className={`w-3 h-3 rounded-full ml-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-white text-purple-600' : 'hidden'
                    }`}>
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md text-xs font-bold">
              Cancel
            </Button>
            <Button type="submit" variant="brand" className="rounded-md text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white gap-1.5 shadow-sm">
              <Check className="w-4 h-4" />
              <span>{packageToEdit ? 'Update Package' : 'Create Package Bundle'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

