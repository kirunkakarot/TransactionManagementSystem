"use client";
import React, { useState } from 'react';
import { 
  Wrench, 
  Check, 
  Eye, 
  Music, 
  Utensils, 
  Palette, 
  Camera, 
  Video, 
  Armchair, 
  Tv,
  PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceItem } from '../types';

interface ServicesSectionProps {
  services?: ServiceItem[];
  onSelectService: (service: ServiceItem) => void;
  onInquireService: (serviceId: string) => void;
}

const getCategoryIcon = (id: string) => {
  switch (id) {
    case 'entertainment': return Music;
    case 'catering': return Utensils;
    case 'event-decoration': return Palette;
    case 'photo-booth': return Camera;
    case 'photo-video': return Video;
    case 'event-rentals': return Armchair;
    case 'event-production': return Tv;
    default: return Wrench;
  }
};

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  services = [],
  onSelectService,
  onInquireService
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Services' },
    { id: 'production', label: 'Tech & Media' },
    { id: 'styling', label: 'Styling & Catering' },
    { id: 'talent', label: 'Talent & Interactive' },
  ];

  const activeServices = services.filter(s => s.isActive !== false);

  const filteredServices = activeServices.filter(service => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'production') return ['photo-video', 'event-production', 'event-rentals'].includes(service.id) || service.category.includes('Technical') || service.category.includes('Media');
    if (activeCategory === 'styling') return ['catering', 'event-decoration'].includes(service.id) || service.category.includes('Food') || service.category.includes('Styling');
    if (activeCategory === 'talent') return ['entertainment', 'photo-booth'].includes(service.id) || service.category.includes('Stage') || service.category.includes('Guest');
    return true;
  });

  return (
    <section id="services" className="py-20 sm:py-28 bg-white border-t border-slate-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-16">
          <div className="space-y-3 max-w-2xl">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1E3A8A]">
              Everything You Need for Your Event
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Select verified services, customize equipment inclusions, and bundle them into your itemized digital quotation.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-md bg-slate-50 border border-slate-200 self-start md:self-auto">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[#1E3A8A] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#1E3A8A] hover:bg-slate-200/50'
                }`}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Services Grid (Crisp White Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredServices.map((service) => {
            const Icon = getCategoryIcon(service.id);
            return (
              <Card
                key={service.id}
                className="group relative rounded-md bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Card Image Stage */}
                <div className="relative h-52 sm:h-56 w-full overflow-hidden bg-slate-100">
                  <img
                    src={service.featuredImage}
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent"></div>

                  {/* Category Pill */}
                  <Badge className="absolute top-3 left-3 bg-white/95 text-slate-800 border-none shadow-sm hover:bg-white font-semibold text-xs">
                    {service.category}
                  </Badge>

                  {/* Icon Badge */}
                  <div className="absolute top-3 right-3 w-9 h-9 rounded-md bg-white/95 text-[#1E3A8A] flex items-center justify-center shadow-sm">
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Starting Price Banner */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-baseline justify-between text-white">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-200 block tracking-wider">Starting at</span>
                      <span className="text-xl font-extrabold text-white">
                        ₱{service.startingPrice.toLocaleString()}{' '}
                        <span className="text-xs font-medium text-slate-200">PHP</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Content Area */}
                <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-5 bg-white">
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#1E3A8A] transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {service.shortDesc}
                    </p>

                    {/* Features Checklist */}
                    <div className="pt-2 space-y-1.5">
                      {service.features.slice(0, 3).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                          <Check className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                          <span className="truncate text-slate-700">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5">
                    <Button
                      id={`view-detail-${service.id}`}
                      variant="secondary"
                      size="sm"
                      onClick={() => onSelectService(service)}
                      className="flex-1 rounded-md text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200/80 border border-slate-200"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-700" />
                      <span>Details</span>
                    </Button>

                    <Button
                      id={`inquire-service-${service.id}`}
                      variant="brand"
                      size="sm"
                      onClick={() => onInquireService(service.id)}
                      className="flex-1 rounded-md text-xs font-medium text-white bg-[#1E3A8A] hover:bg-blue-900"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-white" />
                      <span>Book Service</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
