"use client";
import React, { useState, useMemo, useEffect } from 'react';
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
  Sparkles,
  PlusCircle,
  Filter,
  RotateCcw,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceItem, EventType, isItemCompatibleWithEventType } from '../types';

interface ServicesSectionProps {
  services?: ServiceItem[];
  eventTypes?: EventType[];
  onSelectService: (service: ServiceItem) => void;
  onInquireService: (serviceId: string, eventTypeName?: string) => void;
}

export const resolveServiceIcon = (service: Pick<ServiceItem, 'id' | 'name' | 'category' | 'iconName'>) => {
  const iconKey = (service.iconName || '').trim().toLowerCase();
  if (iconKey === 'music') return Music;
  if (iconKey === 'utensils') return Utensils;
  if (iconKey === 'palette') return Palette;
  if (iconKey === 'camera') return Camera;
  if (iconKey === 'video') return Video;
  if (iconKey === 'armchair') return Armchair;
  if (iconKey === 'tv') return Tv;
  if (iconKey === 'wrench') return Wrench;

  const idKey = (service.id || '').trim().toLowerCase();
  switch (idKey) {
    case 'entertainment':
    case 'entertainment-hosting':
      return Music;
    case 'catering':
      return Utensils;
    case 'event-decoration':
      return Palette;
    case 'photo-booth':
      return Camera;
    case 'photo-video':
      return Video;
    case 'event-rentals':
      return Armchair;
    case 'event-production':
    case 'sound-light-led':
      return Tv;
  }

  const haystack = `${service.category || ''} ${service.name || ''}`.toLowerCase();
  if (/cater|food|beverage|banquet|menu|buffet|culinary|dining/.test(haystack)) {
    return Utensils;
  }
  if (/photo\s*booth|360|spin|instaprint|souvenir/.test(haystack)) {
    return Camera;
  }
  if (/photo|video|sde|cinem|coverage|drone|media/.test(haystack)) {
    return Video;
  }
  if (/styl|decor|floral|backdrop|theme|ambience|design/.test(haystack)) {
    return Palette;
  }
  if (/rental|chair|table|tent|furniture|linen|tiffany/.test(haystack)) {
    return Armchair;
  }
  if (/sound|light|led|production|audio|visual|truss|tech|staging/.test(haystack)) {
    return Tv;
  }
  if (/entertain|music|band|dj|host|emcee|talent|perform|interactive|stage/.test(haystack)) {
    return Music;
  }
  if (iconKey === 'sparkles') return Sparkles;

  return Sparkles;
};

export function resolveEventTypeLabels(
  itemEventTypes?: EventType[] | number[],
  allEventTypes: EventType[] = []
): string[] {
  if (!Array.isArray(itemEventTypes) || itemEventTypes.length === 0) {
    return [];
  }
  const names: string[] = [];
  itemEventTypes.forEach((entry) => {
    if (typeof entry === 'number') {
      const found = allEventTypes.find((et) => Number(et.id) === Number(entry));
      if (found?.name) names.push(found.name);
    } else if (entry && typeof entry === 'object' && 'name' in entry && entry.name) {
      names.push(entry.name);
    } else if (entry && typeof entry === 'object' && 'id' in entry) {
      const found = allEventTypes.find((et) => Number(et.id) === Number((entry as { id: number }).id));
      if (found?.name) names.push(found.name);
    }
  });
  return Array.from(new Set(names));
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  services = [],
  eventTypes = [],
  onSelectService,
  onInquireService
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | 'all'>('all');

  const activeServices = useMemo(
    () => services.filter((s) => s.isActive !== false),
    [services]
  );

  const activeEventTypes = useMemo(
    () => eventTypes.filter((et) => et.isActive !== false),
    [eventTypes]
  );

  // Dynamically derive unique service categories from active database services
  const categoryOptions = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        activeServices
          .map((s) => (s.category || '').trim())
          .filter(Boolean)
      )
    );
    return [
      { id: 'all', label: 'All Categories' },
      ...uniqueCategories.map((cat) => ({ id: cat, label: cat })),
    ];
  }, [activeServices]);

  // Reset activeCategory to 'all' if the previously selected category no longer exists
  useEffect(() => {
    if (
      activeCategory !== 'all' &&
      !categoryOptions.some((c) => c.id === activeCategory)
    ) {
      setActiveCategory('all');
    }
  }, [activeCategory, categoryOptions]);

  const selectedEventTypeObj = useMemo(
    () =>
      selectedEventTypeId === 'all'
        ? null
        : activeEventTypes.find((et) => Number(et.id) === Number(selectedEventTypeId)) || null,
    [activeEventTypes, selectedEventTypeId]
  );

  const filteredServices = useMemo(() => {
    return activeServices.filter((service) => {
      const matchesCategory =
        activeCategory === 'all' ||
        (service.category || '').trim().toLowerCase() === activeCategory.toLowerCase();

      const matchesEventType =
        selectedEventTypeId === 'all' ||
        isItemCompatibleWithEventType(service.eventTypes, Number(selectedEventTypeId), false);

      return matchesCategory && matchesEventType;
    });
  }, [activeServices, activeCategory, selectedEventTypeId]);

  const hasActiveFilters = activeCategory !== 'all' || selectedEventTypeId !== 'all';

  return (
    <section id="services" className="scroll-mt-24 py-16 sm:py-24 lg:py-28 bg-white border-t border-slate-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 sm:mb-10">
          <div className="space-y-3 max-w-2xl">
            <Badge
              variant="secondary"
              className="bg-blue-50 text-[#1E3A8A] border border-blue-200/80 px-3 py-0.5 text-xs font-bold uppercase tracking-wider"
            >
              Event Services Catalog
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1E3A8A]">
              Everything You Need for Your Event
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed font-normal">
              Browse individual event services, inspect standard inclusions, and customize your selections inside a single quotation request.
            </p>
          </div>

          {/* Separate Event-Type Filter Control */}
          {activeEventTypes.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 self-start lg:self-auto w-full sm:w-auto">
              <label
                htmlFor="services-event-type-filter"
                className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 shrink-0"
              >
                <Filter className="w-3.5 h-3.5 text-[#1E3A8A]" />
                <span>Filter by Event Type:</span>
              </label>
              <select
                id="services-event-type-filter"
                value={selectedEventTypeId === 'all' ? 'all' : String(selectedEventTypeId)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedEventTypeId(val === 'all' ? 'all' : Number(val));
                }}
                className="h-10 w-full sm:w-auto min-w-[205px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white cursor-pointer"
              >
                <option value="all">All Event Types</option>
                {activeEventTypes.map((et) => (
                  <option key={et.id} value={String(et.id)}>
                    {et.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Dynamic Service Category Filter Bar */}
        <div className="mb-8 sm:mb-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
            {categoryOptions.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 min-h-9 px-3.5 ${
                  activeCategory === cat.id
                    ? 'bg-[#1E3A8A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#1E3A8A] hover:bg-slate-200/50'
                }`}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveCategory('all');
                setSelectedEventTypeId('all');
              }}
              className="shrink-0 text-xs font-semibold text-slate-600 hover:text-[#1E3A8A] min-h-9"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Filters</span>
            </Button>
          )}
        </div>

        {/* Empty Filter State */}
        {filteredServices.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
            <p className="text-sm sm:text-base font-bold text-slate-800">
              No services match the selected category and event type filter.
            </p>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Try switching back to All Categories or All Event Types to view all available JAD Events offerings.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveCategory('all');
                setSelectedEventTypeId('all');
              }}
              className="mt-2 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Show All Services</span>
            </Button>
          </div>
        ) : (
          /* Services Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {filteredServices.map((service) => {
              const Icon = resolveServiceIcon(service);
              const compatibleLabels = resolveEventTypeLabels(
                service.eventTypes,
                activeEventTypes
              );
              const allOptionsCount = new Set([
                ...(Array.isArray(service.features) ? service.features : []),
                ...(Array.isArray(service.inclusions) ? service.inclusions : []),
              ]).size;
              const displayedFeatures = (service.features || []).slice(0, 3);
              const extraCount = Math.max(0, allOptionsCount - displayedFeatures.length);

              return (
                <Card
                  key={service.id}
                  className="group relative rounded-xl bg-white border border-slate-200/90 hover:border-blue-200 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden py-0 gap-0"
                >
                  {/* Card Image Stage (Clickable to view details) */}
                  <button
                    type="button"
                    onClick={() => onSelectService(service)}
                    aria-label={`View details for ${service.name}`}
                    className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E3A8A]"
                  >
                    <img
                      src={service.featuredImage}
                      alt={service.name}
                      className="w-full h-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>

                    {/* Category Pill */}
                    <Badge className="absolute top-3 left-3 bg-white/95 text-[#1E3A8A] border-none shadow-xs hover:bg-white font-bold text-xs">
                      {service.category}
                    </Badge>

                    {/* Icon Badge */}
                    <div className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-white/95 text-[#1E3A8A] flex items-center justify-center shadow-xs">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </div>

                    {/* Custom Quotation Banner */}
                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 text-white">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-orange-300 block tracking-wider">
                          Tailored Rate
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white">
                          Custom Quotation Available
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Card Content Area */}
                  <CardContent className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4 bg-white">
                    <div className="space-y-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => onSelectService(service)}
                          className="text-left rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] cursor-pointer"
                        >
                          <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-[#1E3A8A] transition-colors leading-snug">
                            {service.name}
                          </h3>
                        </button>

                        {/* Event Type Compatibility Pill */}
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {compatibleLabels.length === 0
                                ? 'Suitable for All Event Types'
                                : compatibleLabels.slice(0, 2).join(', ') +
                                  (compatibleLabels.length > 2
                                    ? ` +${compatibleLabels.length - 2} more`
                                    : '')}
                            </span>
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {service.shortDesc}
                      </p>

                      {/* Features Checklist */}
                      <div className="pt-1 space-y-1.5">
                        {displayedFeatures.map((feat, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs text-slate-700 font-medium"
                          >
                            <Check className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0 mt-0.5" />
                            <span className="line-clamp-1 text-slate-700">{feat}</span>
                          </div>
                        ))}
                        {extraCount > 0 && (
                          <button
                            type="button"
                            onClick={() => onSelectService(service)}
                            className="text-[11px] font-semibold text-[#1E3A8A] hover:underline pt-0.5 inline-block cursor-pointer"
                          >
                            +{extraCount} more standard inclusion{extraCount === 1 ? '' : 's'} & options
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3.5 border-t border-slate-100 flex items-center gap-2.5">
                      <Button
                        id={`view-detail-${service.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectService(service)}
                        className="flex-1 rounded-lg text-xs font-semibold text-slate-700 border-slate-200 hover:text-[#1E3A8A] hover:bg-blue-50/50 min-h-9"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>View Details</span>
                      </Button>

                      <Button
                        id={`inquire-service-${service.id}`}
                        variant="brand"
                        size="sm"
                        onClick={() => onInquireService(service.id, selectedEventTypeObj?.name)}
                        className="flex-1 rounded-lg text-xs font-bold text-white bg-[#1E3A8A] hover:bg-blue-900 min-h-9"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-white" />
                        <span>Inquire Service</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
