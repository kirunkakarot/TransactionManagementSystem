"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  Layers, 
  Image as ImageIcon,
  Tag,
  Wrench,
  Power
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ServiceItem, EquipmentResource } from '../types';
import { toast } from 'sonner';

interface ServiceEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceToEdit: ServiceItem | null;
  onSaveService: (service: ServiceItem) => void;
  availableResources: EquipmentResource[];
}

const SERVICE_CATEGORIES = [
  'Stage & Performance',
  'Food & Beverage',
  'Styling & Ambience',
  'Guest Experience',
  'Media & Coverage',
  'Equipment & Furniture',
  'Technical & Staging',
  'Coordination & Logistics'
];

const DEFAULT_IMAGES: Record<string, string> = {
  'Stage & Performance': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
  'Food & Beverage': 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80',
  'Styling & Ambience': 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
  'Guest Experience': 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&q=80',
  'Media & Coverage': 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
  'Equipment & Furniture': 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80',
  'Technical & Staging': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
  'Coordination & Logistics': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80'
};

export const ServiceEditorModal: React.FC<ServiceEditorModalProps> = ({
  isOpen,
  onClose,
  serviceToEdit,
  onSaveService,
  availableResources
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Stage & Performance');
  const [startingPrice, setStartingPrice] = useState<number>(15000);
  const [shortDesc, setShortDesc] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [iconName, setIconName] = useState('Wrench');
  const [isActive, setIsActive] = useState(true);

  // Features list
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');

  // Inclusions list
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [newInclusion, setNewInclusion] = useState('');

  // Linked equipment IDs
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);

  useEffect(() => {
    if (serviceToEdit) {
      setName(serviceToEdit.name || '');
      const validCategory = SERVICE_CATEGORIES.includes(serviceToEdit.category) 
        ? serviceToEdit.category 
        : 'Stage & Performance';
      setCategory(validCategory);
      setStartingPrice(serviceToEdit.startingPrice || 0);
      setShortDesc(serviceToEdit.shortDesc || serviceToEdit.description || '');
      setFullDesc(serviceToEdit.fullDesc || serviceToEdit.description || serviceToEdit.shortDesc || '');
      setFeaturedImage(serviceToEdit.featuredImage || DEFAULT_IMAGES[validCategory] || '');
      setIconName(serviceToEdit.iconName || 'Wrench');
      setIsActive(serviceToEdit.isActive !== false);
      setFeatures(Array.isArray(serviceToEdit.features) ? serviceToEdit.features : []);
      setInclusions(Array.isArray(serviceToEdit.inclusions) ? serviceToEdit.inclusions : []);
      setSelectedResourceIds(
        serviceToEdit.equipmentResources?.map(r => r.id) || 
        availableResources.filter(r => r.assignedServiceId === serviceToEdit.id).map(r => r.id)
      );
    } else {
      // Default new service values
      setName('');
      setCategory('Stage & Performance');
      setStartingPrice(20000);
      setShortDesc('High-grade professional event service and execution.');
      setFullDesc('Comprehensive operational setup and experienced on-site specialists.');
      setFeaturedImage(DEFAULT_IMAGES['Stage & Performance']);
      setIconName('Wrench');
      setIsActive(true);
      setFeatures(['Professional On-Site Crew', 'Real-time Coordination', 'Pre-Event Soundcheck & Staging']);
      setInclusions(['Full Ingress & Egress', 'Dedicated Supervisor', 'Contingency Spares']);
      setSelectedResourceIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceToEdit, isOpen]);

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    setFeatures(prev => [...prev, newFeature.trim()]);
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddInclusion = () => {
    if (!newInclusion.trim()) return;
    setInclusions(prev => [...prev, newInclusion.trim()]);
    setNewInclusion('');
  };

  const handleRemoveInclusion = (index: number) => {
    setInclusions(prev => prev.filter((_, i) => i !== index));
  };

  const toggleResource = (resourceId: string) => {
    setSelectedResourceIds(prev => 
      prev.includes(resourceId) ? prev.filter(id => id !== resourceId) : [...prev, resourceId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Service Name Required', { description: 'Please enter a name for the event service.' });
      return;
    }
    if (startingPrice <= 0) {
      toast.error('Invalid Rate', { description: 'Starting price must be greater than zero.' });
      return;
    }

    const linkedResources = availableResources.filter(r => selectedResourceIds.includes(r.id));

    const finalService: ServiceItem = {
      id: serviceToEdit ? serviceToEdit.id : `srv-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      category,
      startingPrice: Number(startingPrice),
      shortDesc: shortDesc.trim(),
      fullDesc: fullDesc.trim(),
      featuredImage: featuredImage.trim() || DEFAULT_IMAGES[category] || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
      iconName,
      features: features.length > 0 ? features : ['Standard Professional Inclusions'],
      inclusions: inclusions.length > 0 ? inclusions : ['On-Site Crew & Supervision'],
      isActive,
      equipmentResources: linkedResources
    };

    onSaveService(finalService);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 rounded-md">
        <DialogHeader>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-extrabold text-[#1E3A8A]">
                  {serviceToEdit ? 'Edit Event Service' : 'Add New Event Service'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Configure catalog specifications, base rate, assigned equipment, and inclusions.
                </DialogDescription>
              </div>
            </div>
            <Badge variant={isActive ? 'success' : 'outline'} className="text-xs">
              {isActive ? 'Active in Catalog' : 'Deactivated / Hidden'}
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Active Status & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Service Category *</label>
              <select
                value={category}
                onChange={e => {
                  setCategory(e.target.value);
                  if (!featuredImage || Object.values(DEFAULT_IMAGES).includes(featuredImage)) {
                    setFeaturedImage(DEFAULT_IMAGES[e.target.value] || '');
                  }
                }}
                className="w-full h-10 px-3 rounded-md border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              >
                {SERVICE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Availability Status</label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-slate-200 bg-slate-50">
                <Button
                  type="button"
                  variant={isActive ? 'brand' : 'outline'}
                  size="sm"
                  onClick={() => setIsActive(true)}
                  className={`text-xs h-7 px-3 rounded-md font-bold flex-1 ${isActive ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                  <Power className="w-3.5 h-3.5 mr-1" /> Active
                </Button>
                <Button
                  type="button"
                  variant={!isActive ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={() => setIsActive(false)}
                  className={`text-xs h-7 px-3 rounded-md font-bold flex-1 ${!isActive ? 'bg-slate-200 text-slate-800 border-slate-300' : 'text-slate-500'}`}
                >
                  Deactivated
                </Button>
              </div>
            </div>
          </div>

          {/* Service Name & Base Price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Service Title *</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. 360 Glam Video Spinner Booth"
                required
                className="text-xs font-medium rounded-md"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Starting Price (PHP) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₱</span>
                <Input
                  type="number"
                  value={startingPrice}
                  onChange={e => setStartingPrice(Number(e.target.value))}
                  placeholder="25000"
                  required
                  min={0}
                  step={500}
                  className="pl-7 text-xs font-extrabold text-[#1E3A8A] rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Short & Full Description */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Short Summary (Shown on Cards)</label>
              <Input
                value={shortDesc}
                onChange={e => setShortDesc(e.target.value)}
                placeholder="Single sentence summarizing the service highlight."
                className="text-xs rounded-md"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Detailed Description & Specifications</label>
              <textarea
                value={fullDesc}
                onChange={e => setFullDesc(e.target.value)}
                rows={3}
                placeholder="Full operational description, technical gear standards, and staging details..."
                className="w-full p-3 rounded-md border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>
          </div>

          {/* Featured Banner Image */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Featured Media Photo URL</label>
            <div className="flex items-center gap-2">
              <Input
                value={featuredImage}
                onChange={e => setFeaturedImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="text-xs rounded-md flex-1 font-mono"
              />
              {featuredImage && (
                <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 border border-slate-200">
                  <img src={featuredImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Key Features (Badges) */}
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200 space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Key Highlights & Specs</span>
              <span className="text-[11px] text-slate-400 font-normal">{features.length} items</span>
            </label>
            
            <div className="flex flex-wrap gap-1.5">
              {features.map((feat, i) => (
                <Badge key={i} variant="blue" className="text-xs py-1 px-2.5 gap-1.5">
                  <span>{feat}</span>
                  <button type="button" onClick={() => handleRemoveFeature(i)} className="hover:text-red-500">
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
                placeholder="Add highlight spec (e.g. 4K Slow Motion Camera)"
                className="text-xs rounded-md flex-1 bg-white"
              />
              <Button type="button" size="sm" onClick={handleAddFeature} className="text-xs rounded-md bg-[#1E3A8A] text-white">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Included Deliverables */}
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200 space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Standard Operational Inclusions</span>
              <span className="text-[11px] text-slate-400 font-normal">{inclusions.length} items</span>
            </label>
            
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
                placeholder="Add inclusion deliverable (e.g. 2 Uniformed Technical Operators)"
                className="text-xs rounded-md flex-1 bg-white"
              />
              <Button type="button" size="sm" onClick={handleAddInclusion} className="text-xs rounded-md bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Linked Equipment & Resources */}
          <div className="p-4 rounded-md bg-blue-50/60 border border-blue-200 space-y-3">
            <label className="text-xs font-bold text-[#1E3A8A] flex items-center justify-between">
              <span>Assign Equipment & Hardware Resources</span>
              <span className="text-[11px] text-blue-700 font-semibold">{selectedResourceIds.length} Linked</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Select inventory items allocated to this service for staging and logistics tracking:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {availableResources.map(res => {
                const isSelected = selectedResourceIds.includes(res.id);
                return (
                  <button
                    type="button"
                    key={res.id}
                    onClick={() => toggleResource(res.id)}
                    className={`flex items-start justify-between p-2.5 rounded-md border text-left text-xs transition-all ${
                      isSelected 
                        ? 'bg-white border-[#1E3A8A] shadow-sm' 
                        : 'bg-white/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 leading-tight">{res.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {res.availableUnits} / {res.quantity} {res.unit} available • {res.category}
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ml-2 mt-0.5 ${
                      isSelected ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3" />}
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
              <span>{serviceToEdit ? 'Save Changes' : 'Create Event Service'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

