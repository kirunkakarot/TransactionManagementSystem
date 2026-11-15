"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  Printer,
  Send,
  FileText,
  Sparkles,
  CheckCircle2,
  Calendar,
  MapPin,
  Users,
  Percent,
  DollarSign,
  Tag,
  Package,
  Layers,
  Utensils,
  AlertCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Info,
  Edit3,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  CheckSquare,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Quotation,
  QuotationLineItem,
  QuotationDiscount,
  QuotationAdditionalCharge,
  InquiryFormData,
  ServiceItem,
  PackageItem,
  PackageCustomization,
  ServiceCustomization,
  InquirySelectionDetails,
  EVENT_TIME_OPTIONS,
  parseInquirySelectionDetails,
  extractPlainInquiryNotes,
  formatSelectionModeLabel,
  validateEventTimeRange,
  formatEventTimeRange,
  calculateEventDurationLabel,
  resolveEventTimes,
  stripQuotationItemScopeMetadata,
  formatQuotationItemNotesForDisplay,
} from '../types';
import { toast } from 'sonner';

const INCLUSION_CATEGORIES = [
  'Food and Beverage',
  'Entertainment',
  'Equipment',
  'Decorations',
  'Photography and Media',
  'Additional Services',
  'Other Inclusions',
] as const;

interface StructuredInclusionEntry {
  id: string;
  text: string;
  category: string;
  isCustom?: boolean;
}

interface ItemCustomerPreferences {
  selectedOptions: string[];
  preferredDishes?: string;
  preferredActivities?: string;
  stylingThemeNotes?: string;
}

interface ItemSpecialRequirements {
  dietaryRestrictions?: string;
  customNotes?: string;
}

interface ItemScopeWorkspace {
  itemId: string;
  catalogItemId?: string;
  inclusionsState?: 'populated' | 'empty' | 'uninitialized';
  catalogSubtitle?: string;
  catalogPredefinedInclusions: Array<{ text: string; category: string }>;
  scopeDescription: string;
  inclusions: StructuredInclusionEntry[];
  preferences: ItemCustomerPreferences;
  requirements: ItemSpecialRequirements;
  collapsedCategories: Record<string, boolean>;
  lastRemovedInclusion?: { entry: StructuredInclusionEntry; index: number } | null;
}

interface SerializedItemScopeMetadataV1 {
  v: 1;
  catalogItemId?: string;
  inclusionsState: 'populated' | 'empty';
  scopeDescription: string;
  inclusions: Array<{
    text: string;
    category: string;
    isCustom?: boolean;
  }>;
  preferences?: {
    selectedOptions?: string[];
    preferredDishes?: string;
    preferredActivities?: string;
    stylingThemeNotes?: string;
  };
  requirements?: {
    dietaryRestrictions?: string;
    customNotes?: string;
  };
}

const JAD_SCOPE_METADATA_PREFIX = '[[JAD_SCOPE_V1:';
const JAD_SCOPE_METADATA_SUFFIX = ']]';

function encodeBase64UrlUtf8(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64UrlUtf8(encoded: string): string | null {
  try {
    if (!encoded || /[^A-Za-z0-9_-]/.test(encoded)) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLen);
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf8');
    }
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function extractSerializedScopeMetadata(rawNotes?: string | null): {
  cleanNotes: string;
  metadata: SerializedItemScopeMetadataV1 | null;
  hasMetadataMarker: boolean;
} {
  const raw = typeof rawNotes === 'string' ? rawNotes : '';
  const cleanNotes = stripQuotationItemScopeMetadata(raw);
  const match = raw.match(/\[\[JAD_SCOPE_V(\d+):([^\]]*)\]\]/);
  if (!match) {
    const hasMalformedMarker = /\[\[JAD_SCOPE_/.test(raw);
    return { cleanNotes, metadata: null, hasMetadataMarker: hasMalformedMarker };
  }
  const version = parseInt(match[1], 10);
  if (version !== 1) {
    return { cleanNotes, metadata: null, hasMetadataMarker: true };
  }
  const decodedJson = decodeBase64UrlUtf8(match[2]);
  if (!decodedJson) {
    return { cleanNotes, metadata: null, hasMetadataMarker: true };
  }
  try {
    const parsed = JSON.parse(decodedJson);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.v === 1 &&
      Array.isArray(parsed.inclusions) &&
      (parsed.inclusionsState === 'populated' || parsed.inclusionsState === 'empty')
    ) {
      return {
        cleanNotes,
        metadata: parsed as SerializedItemScopeMetadataV1,
        hasMetadataMarker: true,
      };
    }
  } catch {
    // Malformed JSON inside marker — fall back safely to cleanNotes
  }
  return { cleanNotes, metadata: null, hasMetadataMarker: true };
}

function toSlugKey(val: string): string {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanPackageTitle(val?: string | null): string {
  if (!val) return '';
  return val
    .replace(/\s*\((Event\s+)?Package\)\s*$/i, '')
    .trim();
}

function collectPackageCustomizations(
  parsedSelection?: InquirySelectionDetails | null
): PackageCustomization[] {
  if (!parsedSelection) return [];
  const list: PackageCustomization[] = [];
  const seen = new Set<string>();

  const pushUnique = (pc?: PackageCustomization | null) => {
    if (!pc || typeof pc !== 'object') return;
    const key = `${String(pc.packageId || '').trim().toLowerCase()}::${cleanPackageTitle(
      pc.packageName
    ).toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push(pc);
  };

  if (parsedSelection.packageSelection) {
    pushUnique(parsedSelection.packageSelection);
  }
  if (Array.isArray(parsedSelection.packageSelections)) {
    parsedSelection.packageSelections.forEach((pc) => pushUnique(pc));
  }
  if (
    parsedSelection.packageCustomizations &&
    typeof parsedSelection.packageCustomizations === 'object'
  ) {
    Object.values(parsedSelection.packageCustomizations).forEach((pc) => pushUnique(pc));
  }

  return list;
}

function resolvePackageCustomizationForItem(
  item: { id?: string; name: string },
  matchedPkg: PackageItem | undefined,
  packagesCatalog: PackageItem[],
  parsedSelection?: InquirySelectionDetails | null,
  explicitCatalogItemId?: string
): PackageCustomization | null {
  const candidates = collectPackageCustomizations(parsedSelection);
  if (candidates.length === 0) return null;

  const cleanItemName = cleanPackageTitle(item.name).toLowerCase();
  const itemSlug = toSlugKey(cleanItemName);
  const targetPkgId = (
    explicitCatalogItemId ||
    (matchedPkg?.id !== undefined ? String(matchedPkg.id) : '')
  )
    .trim()
    .toLowerCase();
  const targetPkgName = cleanPackageTitle(matchedPkg?.name || item.name).toLowerCase();
  const targetPkgSlug = toSlugKey(targetPkgName);

  // 1. Primary Match: Match by explicit Package ID whenever available
  if (targetPkgId) {
    const idMatches = candidates.filter(
      (c) => String(c.packageId || '').trim().toLowerCase() === targetPkgId
    );
    if (idMatches.length === 1) {
      return idMatches[0];
    }
    if (idMatches.length > 1) {
      const refined = idMatches.find(
        (c) => cleanPackageTitle(c.packageName).toLowerCase() === targetPkgName
      );
      return refined || null;
    }
  } else {
    // If catalog package was not resolved, check if item name or ID directly matches a candidate's packageId
    const directIdMatches = candidates.filter((c) => {
      const cid = String(c.packageId || '').trim().toLowerCase();
      return cid && (cid === cleanItemName || (item.id && item.id.toLowerCase() === `item-pkg-${cid}`));
    });
    if (directIdMatches.length === 1) {
      return directIdMatches[0];
    }
  }

  // 2. Fallback Match: Match by Package Name ONLY when the candidate's packageId does not belong to a different package
  const allCatalogIds = new Set(
    packagesCatalog.map((p) => String(p.id).trim().toLowerCase()).filter(Boolean)
  );

  const nameMatches = candidates.filter((c) => {
    const cid = String(c.packageId || '').trim().toLowerCase();
    const cname = cleanPackageTitle(c.packageName).toLowerCase();
    const cslug = toSlugKey(cname);

    // If the candidate has an explicit packageId that differs from our known targetPkgId
    // and is not just the package name/slug itself, do NOT cross-assign it to this package.
    if (cid) {
      const cidIsNameOrSlug = cid === cname || cid === cslug || cid === targetPkgName || cid === targetPkgSlug;
      if (targetPkgId && cid !== targetPkgId && !cidIsNameOrSlug) {
        return false;
      }
      if (!targetPkgId && allCatalogIds.has(cid) && cid !== cleanItemName && !cidIsNameOrSlug) {
        return false;
      }
    }

    if (!cname) return false;
    return (
      cname === targetPkgName ||
      cname === cleanItemName ||
      (cslug.length > 0 && (cslug === targetPkgSlug || cslug === itemSlug))
    );
  });

  if (nameMatches.length === 1) {
    return nameMatches[0];
  }

  return null;
}

function parseLegacyCommaOrBulletOptions(
  body: string,
  knownOptionTexts: string[]
): string[] {
  const trimmed = body.trim();
  if (!trimmed) return [];
  if (trimmed.includes('•')) {
    return trimmed
      .split(/\s*•\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Protect known options that legitimately contain commas before splitting on comma delimiters
  const commaKnownOptions = Array.from(
    new Set(
      knownOptionTexts
        .map((o) => o.trim())
        .filter((o) => o.length > 0 && o.includes(','))
    )
  ).sort((a, b) => b.length - a.length);

  let working = trimmed;
  const placeholders = new Map<string, string>();

  commaKnownOptions.forEach((knownOpt, idx) => {
    const escaped = knownOpt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    working = working.replace(regex, (matched) => {
      const token = `__JAD_KNOWN_OPT_${idx}_${placeholders.size}__`;
      placeholders.set(token, matched.trim());
      return token;
    });
  });

  return working
    .split(/\s*,\s*/)
    .map((part) => {
      let restored = part.trim();
      placeholders.forEach((origVal, token) => {
        restored = restored.replace(token, origVal);
      });
      return restored.trim();
    })
    .filter(Boolean);
}

function inferInclusionCategory(text: string, fallbackCategory?: string): string {
  const combined = `${text} ${fallbackCategory || ''}`.toLowerCase();
  if (/cater|food|beverage|banquet|menu|buffet|culinary|dining|drink|bar|grazing|cake|dessert|lechon|waiter|waitstaff|server/.test(combined)) {
    return 'Food and Beverage';
  }
  if (/entertain|host|emcee|band|dj|music|perform|singer|acoustic|dancer|talent|games|program|interactive/.test(combined)) {
    return 'Entertainment';
  }
  if (/photo|video|camera|cinema|drone|album|shoot|coverage|booth|360|media|projector|livestream|sde/.test(combined)) {
    return 'Photography and Media';
  }
  if (/decor|styl|floral|flower|backdrop|centerpiece|drape|drapery|arch|linen|chair|table\s*setting|theme|motif|ambience|balloon|entourage|aisle/.test(combined)) {
    return 'Decorations';
  }
  if (/sound|light|audio|visual|speaker|mic|truss|rigging|generator|stage|staging|platform|tech|equipment|rental|led\s*wall|smoke|confetti|sparkular/.test(combined)) {
    return 'Equipment';
  }
  if (/coordinat|direct|crew|marshal|usher|plan|manage|script|moodboard|portal|consult|bridal\s*car|transport|logistics|assist/.test(combined)) {
    return 'Additional Services';
  }
  if (fallbackCategory && fallbackCategory.trim()) {
    return fallbackCategory.trim();
  }
  return 'Other Inclusions';
}

function extractCatalogStructuredInclusions(
  item?: { inclusions?: string[]; features?: string[]; category?: string } | null,
  servicesCatalog?: ServiceItem[]
): Array<{ text: string; category: string }> {
  if (!item) return [];
  const rawList = [
    ...(Array.isArray(item.inclusions) ? item.inclusions : []),
    ...(Array.isArray(item.features) ? item.features : []),
  ]
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);

  const uniqueTexts = Array.from(new Set(rawList));
  return uniqueTexts.map((text) => {
    let matchedServiceCat = item.category;
    if (!matchedServiceCat && Array.isArray(servicesCatalog)) {
      const lowerText = text.toLowerCase();
      const matchedSrv = servicesCatalog.find(
        (s) =>
          (Array.isArray(s.inclusions) && s.inclusions.some((inc) => inc.trim().toLowerCase() === lowerText)) ||
          (Array.isArray(s.features) && s.features.some((f) => f.trim().toLowerCase() === lowerText))
      );
      if (matchedSrv?.category) {
        matchedServiceCat = matchedSrv.category;
      }
    }
    return {
      text,
      category: inferInclusionCategory(text, matchedServiceCat),
    };
  });
}

function composeItemNotesFromWorkspace(ws: ItemScopeWorkspace): string {
  const segments: string[] = [];

  if (ws.scopeDescription.trim()) {
    segments.push(ws.scopeDescription.trim());
  }

  const validInclusions = ws.inclusions
    .map((inc) => ({
      text: inc.text.trim(),
      category: (inc.category || 'Other Inclusions').trim() || 'Other Inclusions',
      isCustom: Boolean(inc.isCustom),
    }))
    .filter((inc) => inc.text.length > 0);

  if (validInclusions.length > 0) {
    segments.push(`Inclusions: ${validInclusions.map((inc) => inc.text).join(' • ')}`);
  }

  if (ws.preferences.preferredDishes?.trim()) {
    segments.push(`Preferred Dishes: ${ws.preferences.preferredDishes.trim()}`);
  }
  if (ws.preferences.preferredActivities?.trim()) {
    segments.push(`Activities/Program: ${ws.preferences.preferredActivities.trim()}`);
  }
  if (ws.preferences.stylingThemeNotes?.trim()) {
    segments.push(`Theme/Palette: ${ws.preferences.stylingThemeNotes.trim()}`);
  }
  if (ws.requirements.dietaryRestrictions?.trim()) {
    segments.push(`Dietary/Allergies: ${ws.requirements.dietaryRestrictions.trim()}`);
  }
  if (ws.requirements.customNotes?.trim()) {
    segments.push(`Client Note: ${ws.requirements.customNotes.trim()}`);
  }

  const readableSummary = segments.join(' | ');

  const metadataPayload: SerializedItemScopeMetadataV1 = {
    v: 1,
    ...(ws.catalogItemId ? { catalogItemId: ws.catalogItemId } : {}),
    inclusionsState: validInclusions.length > 0 ? 'populated' : 'empty',
    scopeDescription: ws.scopeDescription,
    inclusions: validInclusions,
    preferences: {
      selectedOptions: Array.isArray(ws.preferences.selectedOptions)
        ? ws.preferences.selectedOptions
        : [],
      ...(ws.preferences.preferredDishes?.trim()
        ? { preferredDishes: ws.preferences.preferredDishes.trim() }
        : {}),
      ...(ws.preferences.preferredActivities?.trim()
        ? { preferredActivities: ws.preferences.preferredActivities.trim() }
        : {}),
      ...(ws.preferences.stylingThemeNotes?.trim()
        ? { stylingThemeNotes: ws.preferences.stylingThemeNotes.trim() }
        : {}),
    },
    requirements: {
      ...(ws.requirements.dietaryRestrictions?.trim()
        ? { dietaryRestrictions: ws.requirements.dietaryRestrictions.trim() }
        : {}),
      ...(ws.requirements.customNotes?.trim()
        ? { customNotes: ws.requirements.customNotes.trim() }
        : {}),
    },
  };

  const encodedMeta = `${JAD_SCOPE_METADATA_PREFIX}${encodeBase64UrlUtf8(
    JSON.stringify(metadataPayload)
  )}${JAD_SCOPE_METADATA_SUFFIX}`;

  return readableSummary ? `${readableSummary} ${encodedMeta}` : encodedMeta;
}

function buildWorkspaceForPackageItem(
  itemId: string,
  pkg: PackageItem,
  pkgCustom?: PackageCustomization | null,
  servicesCatalog?: ServiceItem[]
): ItemScopeWorkspace {
  const catalogPredefined = extractCatalogStructuredInclusions(pkg, servicesCatalog);
  const selectedOpts =
    pkgCustom && Array.isArray(pkgCustom.selectedOptions) && pkgCustom.selectedOptions.length > 0
      ? pkgCustom.selectedOptions.map((o) => String(o).trim()).filter(Boolean)
      : [];

  const sourceInclusions =
    selectedOpts.length > 0
      ? selectedOpts.map((text) => ({
          text,
          category: inferInclusionCategory(text),
        }))
      : catalogPredefined;

  const inclusions: StructuredInclusionEntry[] = sourceInclusions.map((entry, idx) => ({
    id: `${itemId}-inc-${idx}`,
    text: entry.text,
    category: entry.category,
    isCustom: false,
  }));

  return {
    itemId,
    catalogItemId: String(pkg.id),
    inclusionsState: inclusions.length > 0 ? 'populated' : 'empty',
    catalogSubtitle: `Capacity: ${pkg.capacity || 'Flexible'} • ${pkg.tagline || 'Complete Event Package'}`,
    catalogPredefinedInclusions: catalogPredefined,
    scopeDescription: `All-inclusive package (${pkg.capacity || 'Complete'})`,
    inclusions,
    preferences: {
      selectedOptions: selectedOpts,
      preferredDishes: pkgCustom?.preferredDishes?.trim() || undefined,
      preferredActivities: pkgCustom?.preferredActivities?.trim() || undefined,
      stylingThemeNotes: pkgCustom?.stylingThemeNotes?.trim() || undefined,
    },
    requirements: {
      dietaryRestrictions: pkgCustom?.dietaryRestrictions?.trim() || undefined,
      customNotes: pkgCustom?.customNotes?.trim() || undefined,
    },
    collapsedCategories: {},
    lastRemovedInclusion: null,
  };
}

function buildWorkspaceForServiceItem(
  itemId: string,
  srv?: ServiceItem | null,
  srvCustom?: ServiceCustomization | null
): ItemScopeWorkspace {
  const fallbackCategory = srv?.category || srvCustom?.category;
  const catalogPredefined = extractCatalogStructuredInclusions(
    srv ? { inclusions: srv.inclusions, features: srv.features, category: srv.category } : null
  );
  const selectedOpts =
    srvCustom && Array.isArray(srvCustom.selectedOptions) && srvCustom.selectedOptions.length > 0
      ? srvCustom.selectedOptions.map((o) => String(o).trim()).filter(Boolean)
      : [];

  const sourceInclusions =
    selectedOpts.length > 0
      ? selectedOpts.map((text) => ({
          text,
          category: inferInclusionCategory(text, fallbackCategory),
        }))
      : catalogPredefined;

  const inclusions: StructuredInclusionEntry[] = sourceInclusions.map((entry, idx) => ({
    id: `${itemId}-inc-${idx}`,
    text: entry.text,
    category: entry.category,
    isCustom: false,
  }));

  return {
    itemId,
    catalogItemId: srv?.id !== undefined ? String(srv.id) : srvCustom?.serviceId,
    inclusionsState: inclusions.length > 0 ? 'populated' : 'empty',
    catalogSubtitle: srv?.shortDesc || (fallbackCategory ? `${fallbackCategory} Service` : undefined),
    catalogPredefinedInclusions: catalogPredefined,
    scopeDescription: srv?.shortDesc || 'Standard Service Scope',
    inclusions,
    preferences: {
      selectedOptions: selectedOpts,
      preferredDishes: srvCustom?.preferredDishes?.trim() || undefined,
      preferredActivities: srvCustom?.preferredActivities?.trim() || undefined,
      stylingThemeNotes: srvCustom?.stylingThemeNotes?.trim() || undefined,
    },
    requirements: {
      dietaryRestrictions: srvCustom?.dietaryRestrictions?.trim() || undefined,
      customNotes: srvCustom?.customNotes?.trim() || undefined,
    },
    collapsedCategories: {},
    lastRemovedInclusion: null,
  };
}

function buildWorkspaceForExistingItem(
  item: QuotationLineItem,
  packagesCatalog: PackageItem[],
  servicesCatalog: ServiceItem[],
  parsedSelection?: InquirySelectionDetails | null
): ItemScopeWorkspace {
  const { cleanNotes, metadata } = extractSerializedScopeMetadata(item.notes);

  const cleanName = cleanPackageTitle(item.name).toLowerCase();
  const itemSlug = toSlugKey(cleanName);
  const explicitCatalogId = metadata?.catalogItemId?.trim().toLowerCase();

  const matchedPkg =
    item.type === 'package'
      ? packagesCatalog.find((p) => {
          const pid = String(p.id).trim().toLowerCase();
          if (explicitCatalogId && pid === explicitCatalogId) return true;
          return (
            p.name.trim().toLowerCase() === cleanName ||
            toSlugKey(p.name) === itemSlug ||
            pid === cleanName
          );
        })
      : undefined;

  const matchedSrv =
    item.type === 'service'
      ? servicesCatalog.find((s) => {
          const sid = String(s.id).trim().toLowerCase();
          if (explicitCatalogId && sid === explicitCatalogId) return true;
          return (
            s.name.trim().toLowerCase() === cleanName ||
            toSlugKey(s.name) === itemSlug ||
            sid === cleanName
          );
        })
      : undefined;

  const matchedPkgCustom =
    item.type === 'package'
      ? resolvePackageCustomizationForItem(
          item,
          matchedPkg,
          packagesCatalog,
          parsedSelection,
          metadata?.catalogItemId
        )
      : null;

  let matchedSrvCustom: ServiceCustomization | undefined;
  if (item.type === 'service' && parsedSelection?.serviceCustomizations) {
    if (explicitCatalogId && parsedSelection.serviceCustomizations[explicitCatalogId]) {
      matchedSrvCustom = parsedSelection.serviceCustomizations[explicitCatalogId];
    } else if (matchedSrv && parsedSelection.serviceCustomizations[matchedSrv.id]) {
      matchedSrvCustom = parsedSelection.serviceCustomizations[matchedSrv.id];
    } else {
      matchedSrvCustom = Object.values(parsedSelection.serviceCustomizations).find(
        (sc) =>
          (explicitCatalogId && String(sc.serviceId).trim().toLowerCase() === explicitCatalogId) ||
          sc.serviceName.trim().toLowerCase() === cleanName ||
          toSlugKey(sc.serviceName) === itemSlug ||
          String(sc.serviceId).toLowerCase() === cleanName
      );
    }
  }

  const catalogPredefined = matchedPkg
    ? extractCatalogStructuredInclusions(matchedPkg, servicesCatalog)
    : matchedSrv
    ? extractCatalogStructuredInclusions({
        inclusions: matchedSrv.inclusions,
        features: matchedSrv.features,
        category: matchedSrv.category,
      })
    : [];

  const baseSelectedOptions =
    matchedPkgCustom?.selectedOptions ||
    matchedSrvCustom?.selectedOptions ||
    [];

  const preferences: ItemCustomerPreferences = {
    selectedOptions: Array.isArray(baseSelectedOptions) ? [...baseSelectedOptions] : [],
    preferredDishes:
      matchedPkgCustom?.preferredDishes?.trim() ||
      matchedSrvCustom?.preferredDishes?.trim() ||
      undefined,
    preferredActivities:
      matchedPkgCustom?.preferredActivities?.trim() ||
      matchedSrvCustom?.preferredActivities?.trim() ||
      undefined,
    stylingThemeNotes:
      matchedPkgCustom?.stylingThemeNotes?.trim() ||
      matchedSrvCustom?.stylingThemeNotes?.trim() ||
      undefined,
  };

  const requirements: ItemSpecialRequirements = {
    dietaryRestrictions:
      matchedPkgCustom?.dietaryRestrictions?.trim() ||
      matchedSrvCustom?.dietaryRestrictions?.trim() ||
      undefined,
    customNotes:
      matchedPkgCustom?.customNotes?.trim() ||
      matchedSrvCustom?.customNotes?.trim() ||
      undefined,
  };

  // Path 1: Versioned V1 metadata block present and valid
  if (metadata) {
    if (
      Array.isArray(metadata.preferences?.selectedOptions) &&
      metadata.preferences.selectedOptions.length > 0 &&
      preferences.selectedOptions.length === 0
    ) {
      preferences.selectedOptions = [...metadata.preferences.selectedOptions];
    }
    if (metadata.preferences?.preferredDishes?.trim()) {
      preferences.preferredDishes = metadata.preferences.preferredDishes.trim();
    }
    if (metadata.preferences?.preferredActivities?.trim()) {
      preferences.preferredActivities = metadata.preferences.preferredActivities.trim();
    }
    if (metadata.preferences?.stylingThemeNotes?.trim()) {
      preferences.stylingThemeNotes = metadata.preferences.stylingThemeNotes.trim();
    }
    if (metadata.requirements?.dietaryRestrictions?.trim()) {
      requirements.dietaryRestrictions = metadata.requirements.dietaryRestrictions.trim();
    }
    if (metadata.requirements?.customNotes?.trim()) {
      requirements.customNotes = metadata.requirements.customNotes.trim();
    }

    const restoredInclusions: StructuredInclusionEntry[] =
      metadata.inclusionsState === 'empty'
        ? []
        : metadata.inclusions
            .filter((entry) => entry && typeof entry.text === 'string' && entry.text.trim().length > 0)
            .map((entry, idx) => ({
              id: `${item.id}-inc-${idx}`,
              text: entry.text,
              category:
                typeof entry.category === 'string' && entry.category.trim().length > 0
                  ? entry.category.trim()
                  : inferInclusionCategory(entry.text, matchedSrv?.category),
              isCustom:
                typeof entry.isCustom === 'boolean'
                  ? entry.isCustom
                  : !catalogPredefined.some(
                      (c) => c.text.toLowerCase() === entry.text.trim().toLowerCase()
                    ),
            }));

    return {
      itemId: item.id,
      catalogItemId:
        metadata.catalogItemId ||
        (matchedPkg?.id !== undefined
          ? String(matchedPkg.id)
          : matchedSrv?.id !== undefined
          ? String(matchedSrv.id)
          : undefined),
      inclusionsState: metadata.inclusionsState,
      catalogSubtitle: matchedPkg
        ? `Capacity: ${matchedPkg.capacity || 'Flexible'} • ${matchedPkg.tagline || 'Event Package'}`
        : matchedSrv?.shortDesc,
      catalogPredefinedInclusions: catalogPredefined,
      scopeDescription:
        typeof metadata.scopeDescription === 'string' ? metadata.scopeDescription : '',
      inclusions: restoredInclusions,
      preferences,
      requirements,
      collapsedCategories: {},
      lastRemovedInclusion: null,
    };
  }

  // Path 2: Legacy quotation item notes (or fallback when metadata marker is absent/unknown/malformed)
  const rawNotes = cleanNotes;
  // Split only on pipe delimiters that immediately precede a recognized section label
  const pipeSegments = rawNotes
    ? rawNotes
        .split(
          /\s*\|\s*(?=(?:Inclusions|Selected Inclusions|Options|Preferred Dishes|Activities\/Program|Theme\/Palette|Dietary(?:\/Allergies)?|Client Note|Scope Description)\s*:)/i
        )
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  let parsedBulletInclusions: string[] = [];
  const parsedLegacyOptions: string[] = [];
  let explicitlyEmptyLegacyInclusions = false;
  const preservedDescriptionParts: string[] = [];

  const knownOptionPool = [
    ...preferences.selectedOptions,
    ...catalogPredefined.map((c) => c.text),
  ];

  for (const seg of pipeSegments) {
    if (/^Inclusions:\s*/i.test(seg)) {
      const body = seg.replace(/^Inclusions:\s*/i, '').trim();
      if (!body || /^(none|empty|n\/a)$/i.test(body)) {
        explicitlyEmptyLegacyInclusions = true;
        parsedBulletInclusions = [];
      } else if (body.includes('•')) {
        parsedBulletInclusions = body
          .split(/\s*•\s*/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        parsedBulletInclusions = [body];
      }
    } else if (/^(Selected Inclusions|Options):\s*/i.test(seg)) {
      const body = seg.replace(/^(Selected Inclusions|Options):\s*/i, '').trim();
      if (!body || /^(none|empty|n\/a)$/i.test(body)) {
        explicitlyEmptyLegacyInclusions = true;
      } else if (parsedBulletInclusions.length > 0) {
        // An explicit Inclusions: section already exists; retain this legacy segment in scopeDescription so nothing is discarded
        preservedDescriptionParts.push(seg);
      } else {
        const extracted = parseLegacyCommaOrBulletOptions(body, knownOptionPool);
        if (extracted.length > 0) {
          parsedLegacyOptions.push(...extracted);
        } else {
          preservedDescriptionParts.push(seg);
        }
      }
    } else if (/^Scope Description:\s*/i.test(seg)) {
      const val = seg.replace(/^Scope Description:\s*/i, '').trim();
      if (val) preservedDescriptionParts.push(val);
    } else if (/^Preferred Dishes:\s*/i.test(seg)) {
      const val = seg.replace(/^Preferred Dishes:\s*/i, '').trim();
      if (val) preferences.preferredDishes = val;
    } else if (/^Activities\/Program:\s*/i.test(seg)) {
      const val = seg.replace(/^Activities\/Program:\s*/i, '').trim();
      if (val) preferences.preferredActivities = val;
    } else if (/^Theme\/Palette:\s*/i.test(seg)) {
      const val = seg.replace(/^Theme\/Palette:\s*/i, '').trim();
      if (val) preferences.stylingThemeNotes = val;
    } else if (/^Dietary(\/Allergies)?:\s*/i.test(seg)) {
      const val = seg.replace(/^Dietary(\/Allergies)?:\s*/i, '').trim();
      if (val) requirements.dietaryRestrictions = val;
    } else if (/^Client Note:\s*/i.test(seg)) {
      const val = seg.replace(/^Client Note:\s*/i, '').trim();
      if (val) requirements.customNotes = val;
    } else {
      preservedDescriptionParts.push(seg);
    }
  }

  const defaultPkgStubA = matchedPkg
    ? `All-inclusive bundle (${matchedPkg.capacity || 'Complete'})`.toLowerCase()
    : '';
  const defaultPkgStubB = matchedPkg
    ? `All-inclusive package (${matchedPkg.capacity || 'Complete'})`.toLowerCase()
    : '';
  const defaultPkgStubC = matchedPkg
    ? `Capacity: ${matchedPkg.capacity} — ${matchedPkg.tagline}`.toLowerCase()
    : '';
  const defaultSrvStub = (matchedSrv?.shortDesc || '').trim().toLowerCase();

  const normalizedRawLower = rawNotes.trim().toLowerCase();
  const isUninitializedLegacyNotes =
    !rawNotes ||
    normalizedRawLower === defaultPkgStubA ||
    normalizedRawLower === defaultPkgStubB ||
    normalizedRawLower === defaultPkgStubC ||
    (defaultSrvStub.length > 0 && normalizedRawLower === defaultSrvStub) ||
    normalizedRawLower === 'standard service' ||
    normalizedRawLower === 'standard service scope';

  let inclusions: StructuredInclusionEntry[] = [];
  let resolvedState: 'populated' | 'empty' | 'uninitialized' = 'uninitialized';

  if (explicitlyEmptyLegacyInclusions) {
    inclusions = [];
    resolvedState = 'empty';
  } else if (parsedBulletInclusions.length > 0) {
    inclusions = parsedBulletInclusions.map((text, idx) => ({
      id: `${item.id}-inc-${idx}`,
      text,
      category: inferInclusionCategory(text, matchedSrv?.category),
      isCustom: !catalogPredefined.some((c) => c.text.toLowerCase() === text.toLowerCase()),
    }));
    resolvedState = 'populated';
  } else if (parsedLegacyOptions.length > 0) {
    inclusions = parsedLegacyOptions.map((text, idx) => ({
      id: `${item.id}-inc-${idx}`,
      text,
      category: inferInclusionCategory(text, matchedSrv?.category),
      isCustom: !catalogPredefined.some((c) => c.text.toLowerCase() === text.toLowerCase()),
    }));
    resolvedState = 'populated';
  } else if (isUninitializedLegacyNotes) {
    if (preferences.selectedOptions.length > 0) {
      inclusions = preferences.selectedOptions.map((text, idx) => ({
        id: `${item.id}-inc-${idx}`,
        text,
        category: inferInclusionCategory(text, matchedSrv?.category),
        isCustom: false,
      }));
      resolvedState = 'populated';
    } else if (catalogPredefined.length > 0) {
      inclusions = catalogPredefined.map((entry, idx) => ({
        id: `${item.id}-inc-${idx}`,
        text: entry.text,
        category: entry.category,
        isCustom: false,
      }));
      resolvedState = 'populated';
    } else {
      resolvedState = 'empty';
    }
  } else {
    // Custom legacy scope paragraph without explicit Inclusions/Options headers:
    // preserve the custom text in scopeDescription without injecting unrequested catalog inclusions.
    inclusions = [];
    resolvedState = 'empty';
  }

  return {
    itemId: item.id,
    catalogItemId:
      matchedPkg?.id !== undefined
        ? String(matchedPkg.id)
        : matchedSrv?.id !== undefined
        ? String(matchedSrv.id)
        : undefined,
    inclusionsState: resolvedState,
    catalogSubtitle: matchedPkg
      ? `Capacity: ${matchedPkg.capacity || 'Flexible'} • ${matchedPkg.tagline || 'Event Package'}`
      : matchedSrv?.shortDesc,
    catalogPredefinedInclusions: catalogPredefined,
    scopeDescription: preservedDescriptionParts.join(' | '),
    inclusions,
    preferences,
    requirements,
    collapsedCategories: {},
    lastRemovedInclusion: null,
  };
}

interface QuotationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry?: InquiryFormData | null;
  existingQuotation?: Quotation | null;
  services: ServiceItem[];
  packages: PackageItem[];
  onSaveAndSend: (quotation: Quotation) => void;
}

type BuilderSectionId =
  | 'qb-section-review'
  | 'qb-section-build'
  | 'qb-section-pricing'
  | 'qb-section-send';

const BUILDER_NAV_STEPS: Array<{ id: BuilderSectionId; step: string; label: string }> = [
  { id: 'qb-section-review', step: '1', label: 'Review Inquiry' },
  { id: 'qb-section-build', step: '2', label: 'Build Quotation' },
  { id: 'qb-section-pricing', step: '3', label: 'Adjust Pricing' },
  { id: 'qb-section-send', step: '4', label: 'Review and Send' },
];

function computeValidUntilFromDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, days));
  return d.toISOString().split('T')[0];
}

function computeDaysFromValidUntil(validUntilStr: string): number {
  if (!validUntilStr) return 14;
  const target = new Date(`${validUntilStr}T00:00:00`);
  if (isNaN(target.getTime())) return 14;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

export const QuotationBuilderModal: React.FC<QuotationBuilderModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  existingQuotation,
  services,
  packages,
  onSaveAndSend,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeNavSection, setActiveNavSection] = useState<BuilderSectionId>('qb-section-review');
  const [isRequestDetailsOpen, setIsRequestDetailsOpen] = useState<boolean>(true);

  // Client & Event Metadata
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [eventType, setEventType] = useState('Grand Wedding');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [guestCount, setGuestCount] = useState(100);

  // Event Time Range State (Requested vs Approved)
  const [requestedStartTime, setRequestedStartTime] = useState<string | undefined>(undefined);
  const [requestedEndTime, setRequestedEndTime] = useState<string | undefined>(undefined);
  const [approvedStartTime, setApprovedStartTime] = useState<string>('');
  const [approvedEndTime, setApprovedEndTime] = useState<string>('');

  // Line Items & Structured Scope Workspaces
  const [items, setItems] = useState<QuotationLineItem[]>([]);
  const [itemWorkspaces, setItemWorkspaces] = useState<Record<string, ItemScopeWorkspace>>({});
  const [editingInclusion, setEditingInclusion] = useState<{
    itemId: string;
    inclusionId: string;
    text: string;
    category: string;
  } | null>(null);
  const [addingInclusion, setAddingInclusion] = useState<{
    itemId: string;
    text: string;
    category: string;
    categoryManuallySelected?: boolean;
  } | null>(null);

  // Discounts & Additional Charges
  const [discounts, setDiscounts] = useState<QuotationDiscount[]>([]);
  const [additionalCharges, setAdditionalCharges] = useState<QuotationAdditionalCharge[]>([]);

  // Validity & Notes
  const [validityDays, setValidityDays] = useState(14);
  const [validUntilDate, setValidUntilDate] = useState<string>(() => computeValidUntilFromDays(14));
  const [adminComment, setAdminComment] = useState('');
  const [notes, setNotes] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Quick-Add Catalog Search & Filter State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<string>('ALL');

  const parsedSelection = useMemo(() => {
    if (!inquiry) return null;
    return (
      inquiry.selectionDetails ??
      parseInquirySelectionDetails(
        inquiry.requirements,
        inquiry.selectedServices,
        inquiry.packageId
      )
    );
  }, [inquiry]);

  const plainCustomerNotes = useMemo(() => {
    if (!inquiry) return '';
    return extractPlainInquiryNotes(inquiry.notes, inquiry.requirements);
  }, [inquiry]);

  // Initialize from Inquiry or Existing Quotation
  useEffect(() => {
    if (!isOpen) return;
    setActiveNavSection('qb-section-review');
    setCatalogSearch('');
    setCatalogCategory('ALL');
    setEditingInclusion(null);
    setAddingInclusion(null);

    if (existingQuotation) {
      setClientName(existingQuotation.clientName);
      setClientEmail(existingQuotation.clientEmail);
      setClientPhone(existingQuotation.clientPhone);
      setEventType(existingQuotation.eventType);
      setEventDate(existingQuotation.eventDate);
      setVenue(existingQuotation.venue);
      setGuestCount(existingQuotation.guestCount);
      const clonedItems = existingQuotation.items.map((it) => ({ ...it }));
      const nextWorkspaces: Record<string, ItemScopeWorkspace> = {};
      clonedItems.forEach((it) => {
        nextWorkspaces[it.id] = buildWorkspaceForExistingItem(
          it,
          packages,
          services,
          parsedSelection
        );
      });
      setItems(clonedItems);
      setItemWorkspaces(nextWorkspaces);
      setDiscounts((existingQuotation.discounts || []).map((d) => ({ ...d })));
      setAdditionalCharges((existingQuotation.additionalCharges || []).map((c) => ({ ...c })));
      const vDays = existingQuotation.validityDays || 14;
      setValidityDays(vDays);
      setValidUntilDate(existingQuotation.validUntil || computeValidUntilFromDays(vDays));
      setAdminComment(existingQuotation.adminComment || '');
      setNotes(existingQuotation.notes || '');

      const resolvedTimes = resolveEventTimes({
        startTime: existingQuotation.startTime,
        endTime: existingQuotation.endTime,
        requestedStartTime: existingQuotation.requestedStartTime ?? inquiry?.requestedStartTime,
        requestedEndTime: existingQuotation.requestedEndTime ?? inquiry?.requestedEndTime,
        approvedStartTime: existingQuotation.approvedStartTime,
        approvedEndTime: existingQuotation.approvedEndTime,
        selectionDetails: parsedSelection,
        requirementsRaw: inquiry?.requirements,
      });

      setRequestedStartTime(resolvedTimes.requestedStartTime);
      setRequestedEndTime(resolvedTimes.requestedEndTime);
      setApprovedStartTime(resolvedTimes.effectiveStartTime || '');
      setApprovedEndTime(resolvedTimes.effectiveEndTime || '');
      setIsRequestDetailsOpen(Boolean(inquiry));
    } else if (inquiry) {
      setClientName(inquiry.fullName);
      setClientEmail(inquiry.email);
      setClientPhone(inquiry.phone);
      setEventType(inquiry.eventType);
      setEventDate(inquiry.eventDate);
      setVenue(inquiry.venue);
      setGuestCount(inquiry.guestCount || 100);
      setAdminComment('');
      const cleanNotes = extractPlainInquiryNotes(inquiry.notes, inquiry.requirements);
      setNotes(cleanNotes || 'Customized event production quotation per client specifications.');
      setValidityDays(14);
      setValidUntilDate(computeValidUntilFromDays(14));

      const details =
        inquiry.selectionDetails ??
        parseInquirySelectionDetails(
          inquiry.requirements,
          inquiry.selectedServices,
          inquiry.packageId
        );

      const resolvedTimes = resolveEventTimes({
        startTime: inquiry.startTime,
        endTime: inquiry.endTime,
        requestedStartTime: inquiry.requestedStartTime,
        requestedEndTime: inquiry.requestedEndTime,
        approvedStartTime: inquiry.approvedStartTime,
        approvedEndTime: inquiry.approvedEndTime,
        selectionDetails: details,
        requirementsRaw: inquiry.requirements,
      });

      setRequestedStartTime(resolvedTimes.requestedStartTime);
      setRequestedEndTime(resolvedTimes.requestedEndTime);
      setApprovedStartTime(resolvedTimes.effectiveStartTime || '');
      setApprovedEndTime(resolvedTimes.effectiveEndTime || '');
      setIsRequestDetailsOpen(true);

      // Pre-populate line items based on customer's selected package & customized services
      const initialItems: QuotationLineItem[] = [];
      const initialWorkspaces: Record<string, ItemScopeWorkspace> = {};

      const pkgCustomList = collectPackageCustomizations(details);
      if (pkgCustomList.length > 0) {
        pkgCustomList.forEach((pkgCust, pkgIdx) => {
          const cleanPkgId = String(pkgCust.packageId || '').trim().toLowerCase();
          const cleanPkgName = cleanPackageTitle(pkgCust.packageName).toLowerCase();
          const pkg =
            packages.find((p) => cleanPkgId && String(p.id).trim().toLowerCase() === cleanPkgId) ||
            packages.find(
              (p) =>
                cleanPkgName &&
                (p.name.trim().toLowerCase() === cleanPkgName ||
                  toSlugKey(p.name) === toSlugKey(cleanPkgName))
            );
          if (pkg) {
            const itemId = `item-pkg-${Date.now()}-${pkgIdx}`;
            const ws = buildWorkspaceForPackageItem(itemId, pkg, pkgCust, services);
            initialWorkspaces[itemId] = ws;
            initialItems.push({
              id: itemId,
              type: 'package',
              name: `${pkg.name} (Event Package)`,
              rate: pkg.price,
              quantity: 1,
              amount: pkg.price,
              notes: composeItemNotesFromWorkspace(ws),
            });
          }
        });
      } else if (inquiry.packageId) {
        const cleanPkgKey = String(inquiry.packageId).trim().toLowerCase();
        const pkg = packages.find(
          (p) =>
            String(p.id).toLowerCase() === cleanPkgKey ||
            p.name.toLowerCase() === cleanPkgKey ||
            toSlugKey(p.name) === cleanPkgKey
        );
        if (pkg) {
          const itemId = `item-pkg-${Date.now()}`;
          const ws = buildWorkspaceForPackageItem(itemId, pkg, null, services);
          initialWorkspaces[itemId] = ws;
          initialItems.push({
            id: itemId,
            type: 'package',
            name: `${pkg.name} (Event Package)`,
            rate: pkg.price,
            quantity: 1,
            amount: pkg.price,
            notes: composeItemNotesFromWorkspace(ws),
          });
        }
      }

      if (inquiry.selectedServices && inquiry.selectedServices.length > 0) {
        inquiry.selectedServices.forEach((srvId, idx) => {
          const cleanKey = String(srvId).trim().toLowerCase();
          const srv = services.find(
            (s) =>
              String(s.id).toLowerCase() === cleanKey ||
              s.name.toLowerCase() === cleanKey ||
              toSlugKey(s.name) === cleanKey
          );
          const srvCustom =
            details?.serviceCustomizations?.[srvId] ||
            (srv ? details?.serviceCustomizations?.[srv.id] : undefined);

          if (srv) {
            const itemId = `item-srv-${Date.now()}-${idx}`;
            const ws = buildWorkspaceForServiceItem(itemId, srv, srvCustom);
            initialWorkspaces[itemId] = ws;
            initialItems.push({
              id: itemId,
              type: 'service',
              name: srv.name,
              rate: srv.startingPrice,
              quantity: 1,
              amount: srv.startingPrice,
              notes: composeItemNotesFromWorkspace(ws),
            });
          } else if (srvCustom) {
            const itemId = `item-srv-${Date.now()}-${idx}`;
            const ws = buildWorkspaceForServiceItem(itemId, null, srvCustom);
            initialWorkspaces[itemId] = ws;
            initialItems.push({
              id: itemId,
              type: 'service',
              name: srvCustom.serviceName || String(srvId),
              rate: 15000,
              quantity: 1,
              amount: 15000,
              notes: composeItemNotesFromWorkspace(ws),
            });
          }
        });
      }

      if (initialItems.length === 0) {
        const defaultId = `item-default-${Date.now()}`;
        const defaultWs: ItemScopeWorkspace = {
          itemId: defaultId,
          catalogSubtitle: 'Standard Coordination & Production Scope',
          catalogPredefinedInclusions: [
            { text: 'Full Event Directing & Program Coordination', category: 'Additional Services' },
            { text: 'Thematic Stage Styling & Venue Setup', category: 'Decorations' },
            { text: 'On-Site Technical Crew & Supervision', category: 'Equipment' },
          ],
          scopeDescription: 'Standard event directing, stage styling, and technical crew',
          inclusions: [
            {
              id: `${defaultId}-inc-0`,
              text: 'Full Event Directing & Program Coordination',
              category: 'Additional Services',
              isCustom: false,
            },
            {
              id: `${defaultId}-inc-1`,
              text: 'Thematic Stage Styling & Venue Setup',
              category: 'Decorations',
              isCustom: false,
            },
            {
              id: `${defaultId}-inc-2`,
              text: 'On-Site Technical Crew & Supervision',
              category: 'Equipment',
              isCustom: false,
            },
          ],
          preferences: { selectedOptions: [] },
          requirements: {},
          collapsedCategories: {},
          lastRemovedInclusion: null,
        };
        initialWorkspaces[defaultId] = defaultWs;
        initialItems.push({
          id: defaultId,
          type: 'service',
          name: 'Full Event Coordination & Production Setup',
          rate: 35000,
          quantity: 1,
          amount: 35000,
          notes: composeItemNotesFromWorkspace(defaultWs),
        });
      }

      setItems(initialItems);
      setItemWorkspaces(initialWorkspaces);
      setDiscounts([]);
      setAdditionalCharges([]);
    } else {
      // Blank manual quotation
      const defaultDate = computeValidUntilFromDays(30);
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setEventType('Grand Wedding');
      setEventDate(defaultDate);
      setVenue('');
      setGuestCount(100);
      setRequestedStartTime(undefined);
      setRequestedEndTime(undefined);
      setApprovedStartTime('12:00');
      setApprovedEndTime('20:00');
      setValidityDays(14);
      setValidUntilDate(computeValidUntilFromDays(14));
      setAdminComment('');
      setNotes('Official JAD Events Itemized Quotation.');
      const defaultId = `item-${Date.now()}`;
      const defaultWs: ItemScopeWorkspace = {
        itemId: defaultId,
        catalogSubtitle: 'Core Event Production & Directing Bundle',
        catalogPredefinedInclusions: [
          { text: 'Complete Stage & Venue Styling', category: 'Decorations' },
          { text: 'Professional Sound & Dynamic Lighting System', category: 'Equipment' },
          { text: 'Full Event Directing & Technical Crew', category: 'Additional Services' },
        ],
        scopeDescription: 'Complete staging, lighting, sound & directing',
        inclusions: [
          {
            id: `${defaultId}-inc-0`,
            text: 'Complete Stage & Venue Styling',
            category: 'Decorations',
            isCustom: false,
          },
          {
            id: `${defaultId}-inc-1`,
            text: 'Professional Sound & Dynamic Lighting System',
            category: 'Equipment',
            isCustom: false,
          },
          {
            id: `${defaultId}-inc-2`,
            text: 'Full Event Directing & Technical Crew',
            category: 'Additional Services',
            isCustom: false,
          },
        ],
        preferences: { selectedOptions: [] },
        requirements: {},
        collapsedCategories: {},
        lastRemovedInclusion: null,
      };
      setItems([
        {
          id: defaultId,
          type: 'service',
          name: 'Event Production & Coordination Package',
          rate: 45000,
          quantity: 1,
          amount: 45000,
          notes: composeItemNotesFromWorkspace(defaultWs),
        },
      ]);
      setItemWorkspaces({ [defaultId]: defaultWs });
      setDiscounts([]);
      setAdditionalCharges([]);
      setIsRequestDetailsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiry, existingQuotation, isOpen, packages, services]);

  // Clean up programmatic scroll timer on unmount
  useEffect(() => {
    return () => {
      if (programmaticTimeoutRef.current) {
        clearTimeout(programmaticTimeoutRef.current);
      }
    };
  }, []);

  // Scroll-spy for the 4 builder sections inside scrollContainerRef
  const handleScrollContainer = () => {
    if (isProgrammaticScrollRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const triggerTop = containerRect.top + 96;
    let currentCandidate: BuilderSectionId = 'qb-section-review';

    for (const stepObj of BUILDER_NAV_STEPS) {
      const el = document.getElementById(stepObj.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= triggerTop) {
        currentCandidate = stepObj.id;
      }
    }

    setActiveNavSection((prev) => (prev === currentCandidate ? prev : currentCandidate));
  };

  const scrollToBuilderSection = (sectionId: BuilderSectionId) => {
    setActiveNavSection(sectionId);
    const container = scrollContainerRef.current;
    const target = document.getElementById(sectionId);
    if (!container || !target) return;

    isProgrammaticScrollRef.current = true;
    if (programmaticTimeoutRef.current) {
      clearTimeout(programmaticTimeoutRef.current);
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const offsetTop = target.offsetTop - container.offsetTop - 12;
    container.scrollTo({
      top: Math.max(0, offsetTop),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });

    programmaticTimeoutRef.current = setTimeout(
      () => {
        isProgrammaticScrollRef.current = false;
      },
      prefersReducedMotion ? 40 : 500
    );
  };

  // Validate Approved Event Time Range (optional only for legacy records where admin leaves both blank)
  const timeValidation = useMemo(
    () => validateEventTimeRange(approvedStartTime, approvedEndTime, { required: false }),
    [approvedStartTime, approvedEndTime]
  );

  const hasApprovedTime = Boolean(
    approvedStartTime && approvedEndTime && timeValidation.valid
  );

  const isTimeAdjustedFromRequest = Boolean(
    requestedStartTime &&
      requestedEndTime &&
      hasApprovedTime &&
      (requestedStartTime !== approvedStartTime || requestedEndTime !== approvedEndTime)
  );

  // Quick-Add Catalog Categories & Filtered Items
  const serviceCategories = useMemo(() => {
    const cats = new Set<string>();
    services.forEach((s) => {
      if (s.isActive !== false && s.category) {
        cats.add(s.category);
      }
    });
    return Array.from(cats);
  }, [services]);

  const filteredCatalogItems = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    const list: Array<{
      id: string;
      rawId: string;
      catalogType: 'package' | 'service';
      name: string;
      categoryLabel: string;
      price: number;
      defaultNotes: string;
    }> = [];

    if (catalogCategory === 'ALL' || catalogCategory === 'PACKAGES') {
      packages
        .filter((p) => p.isActive !== false)
        .forEach((pkg) => {
          if (!q || pkg.name.toLowerCase().includes(q) || (pkg.tagline || '').toLowerCase().includes(q)) {
            list.push({
              id: `pkg-${pkg.id}`,
              rawId: String(pkg.id),
              catalogType: 'package',
              name: `${pkg.name} (Package)`,
              categoryLabel: `Package • ${pkg.capacity}`,
              price: pkg.price,
              defaultNotes: `Capacity: ${pkg.capacity} — ${pkg.tagline}`,
            });
          }
        });
    }

    if (catalogCategory !== 'PACKAGES') {
      services
        .filter((s) => s.isActive !== false)
        .forEach((srv) => {
          const matchesCat = catalogCategory === 'ALL' || srv.category === catalogCategory;
          const matchesSearch =
            !q ||
            srv.name.toLowerCase().includes(q) ||
            (srv.category || '').toLowerCase().includes(q) ||
            (srv.shortDesc || '').toLowerCase().includes(q);
          if (matchesCat && matchesSearch) {
            list.push({
              id: `srv-${srv.id}`,
              rawId: String(srv.id),
              catalogType: 'service',
              name: srv.name,
              categoryLabel: srv.category || 'Service',
              price: srv.startingPrice,
              defaultNotes: srv.shortDesc,
            });
          }
        });
    }

    return list;
  }, [packages, services, catalogSearch, catalogCategory]);

  // Synchronize a workspace update into both itemWorkspaces and the corresponding QuotationLineItem.notes
  const applyWorkspaceUpdate = (
    itemId: string,
    updater: (prevWs: ItemScopeWorkspace) => ItemScopeWorkspace
  ) => {
    setItemWorkspaces((prevMap) => {
      const existingWs = prevMap[itemId];
      if (!existingWs) return prevMap;
      const updatedWs = updater(existingWs);
      const nextNotes = composeItemNotesFromWorkspace(updatedWs);
      setItems((prevItems) =>
        prevItems.map((it) => (it.id === itemId ? { ...it, notes: nextNotes } : it))
      );
      return { ...prevMap, [itemId]: updatedWs };
    });
  };

  // Add item handlers
  const handleAddCatalogEntry = (entry: (typeof filteredCatalogItems)[number]) => {
    const newId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let ws: ItemScopeWorkspace;

    if (entry.catalogType === 'package') {
      const matchedPkg = packages.find((p) => String(p.id) === entry.rawId);
      const pkgCustom = matchedPkg
        ? resolvePackageCustomizationForItem(
            { id: newId, name: entry.name },
            matchedPkg,
            packages,
            parsedSelection,
            String(matchedPkg.id)
          )
        : null;

      ws = matchedPkg
        ? buildWorkspaceForPackageItem(newId, matchedPkg, pkgCustom, services)
        : {
            itemId: newId,
            catalogSubtitle: entry.categoryLabel,
            catalogPredefinedInclusions: [],
            scopeDescription: entry.defaultNotes,
            inclusions: [],
            preferences: { selectedOptions: [] },
            requirements: {},
            collapsedCategories: {},
            lastRemovedInclusion: null,
          };
    } else {
      const matchedSrv = services.find((s) => String(s.id) === entry.rawId);
      const srvCustom =
        matchedSrv && parsedSelection?.serviceCustomizations
          ? parsedSelection.serviceCustomizations[matchedSrv.id] ||
            Object.values(parsedSelection.serviceCustomizations).find(
              (sc) => sc.serviceName.toLowerCase() === matchedSrv.name.toLowerCase()
            )
          : undefined;

      ws = buildWorkspaceForServiceItem(newId, matchedSrv, srvCustom);
    }

    const composedNotes = composeItemNotesFromWorkspace(ws);
    setItemWorkspaces((prev) => ({ ...prev, [newId]: ws }));
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        type: entry.catalogType,
        name: entry.name,
        rate: entry.price,
        quantity: 1,
        amount: entry.price,
        notes: composedNotes || entry.defaultNotes,
      },
    ]);
    toast.success(`Added "${entry.name}" to quotation`);
  };

  const handleAddCustomItem = () => {
    const newId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const customWs: ItemScopeWorkspace = {
      itemId: newId,
      catalogSubtitle: 'Custom Line Item • Add specific inclusions or scope description below',
      catalogPredefinedInclusions: [],
      scopeDescription: '',
      inclusions: [],
      preferences: { selectedOptions: [] },
      requirements: {},
      collapsedCategories: {},
      lastRemovedInclusion: null,
    };
    setItemWorkspaces((prev) => ({ ...prev, [newId]: customWs }));
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        type: 'custom',
        name: 'Custom Production / Venue Add-on',
        rate: 5000,
        quantity: 1,
        amount: 5000,
        notes: '',
      },
    ]);
    setAddingInclusion({
      itemId: newId,
      text: '',
      category: 'Additional Services',
      categoryManuallySelected: false,
    });
  };

  const handleUpdateItem = (id: string, field: keyof QuotationLineItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'rate' || field === 'quantity') {
          const r = field === 'rate' ? Number(value) || 0 : item.rate;
          const q = field === 'quantity' ? Math.max(1, Number(value) || 1) : item.quantity;
          updated.rate = r;
          updated.quantity = q;
          updated.amount = r * q;
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setItemWorkspaces((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (editingInclusion?.itemId === id) setEditingInclusion(null);
    if (addingInclusion?.itemId === id) setAddingInclusion(null);
  };

  // Structured Inclusion Manager Handlers
  const handleStartAddInclusion = (itemId: string, preferredCategory?: string) => {
    const ws = itemWorkspaces[itemId];
    const defaultCat =
      preferredCategory ||
      (ws && ws.inclusions.length > 0 ? ws.inclusions[0].category : 'Additional Services');
    setAddingInclusion({
      itemId,
      text: '',
      category: defaultCat,
      categoryManuallySelected: Boolean(preferredCategory),
    });
  };

  const handleConfirmAddInclusion = (itemId: string) => {
    if (!addingInclusion || addingInclusion.itemId !== itemId) return;
    const trimmed = addingInclusion.text.trim();
    if (!trimmed) {
      toast.error('Please enter an inclusion description.');
      return;
    }
    const chosenCat = addingInclusion.category || inferInclusionCategory(trimmed);
    const newEntry: StructuredInclusionEntry = {
      id: `${itemId}-inc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      text: trimmed,
      category: chosenCat,
      isCustom: true,
    };

    applyWorkspaceUpdate(itemId, (prevWs) => ({
      ...prevWs,
      inclusions: [...prevWs.inclusions, newEntry],
      collapsedCategories: {
        ...prevWs.collapsedCategories,
        [chosenCat]: false,
      },
      lastRemovedInclusion: null,
    }));

    setAddingInclusion({
      itemId,
      text: '',
      category: chosenCat,
      categoryManuallySelected: addingInclusion.categoryManuallySelected,
    });
  };

  const handleStartEditInclusion = (itemId: string, entry: StructuredInclusionEntry) => {
    setEditingInclusion({
      itemId,
      inclusionId: entry.id,
      text: entry.text,
      category: entry.category,
    });
  };

  const handleConfirmEditInclusion = () => {
    if (!editingInclusion) return;
    const trimmed = editingInclusion.text.trim();
    if (!trimmed) {
      toast.error('Inclusion text cannot be empty.');
      return;
    }
    const { itemId, inclusionId, category } = editingInclusion;
    applyWorkspaceUpdate(itemId, (prevWs) => ({
      ...prevWs,
      inclusions: prevWs.inclusions.map((inc) =>
        inc.id === inclusionId ? { ...inc, text: trimmed, category } : inc
      ),
      collapsedCategories: {
        ...prevWs.collapsedCategories,
        [category]: false,
      },
    }));
    setEditingInclusion(null);
  };

  const handleRemoveInclusionEntry = (itemId: string, inclusionId: string) => {
    applyWorkspaceUpdate(itemId, (prevWs) => {
      const idx = prevWs.inclusions.findIndex((inc) => inc.id === inclusionId);
      if (idx === -1) return prevWs;
      const removed = prevWs.inclusions[idx];
      const nextList = prevWs.inclusions.filter((inc) => inc.id !== inclusionId);
      return {
        ...prevWs,
        inclusions: nextList,
        lastRemovedInclusion: { entry: removed, index: idx },
      };
    });
    if (editingInclusion?.inclusionId === inclusionId) {
      setEditingInclusion(null);
    }
  };

  const handleUndoRemoveInclusion = (itemId: string) => {
    applyWorkspaceUpdate(itemId, (prevWs) => {
      if (!prevWs.lastRemovedInclusion) return prevWs;
      const { entry, index } = prevWs.lastRemovedInclusion;
      const nextList = [...prevWs.inclusions];
      const insertAt = Math.min(Math.max(0, index), nextList.length);
      nextList.splice(insertAt, 0, entry);
      return {
        ...prevWs,
        inclusions: nextList,
        collapsedCategories: {
          ...prevWs.collapsedCategories,
          [entry.category]: false,
        },
        lastRemovedInclusion: null,
      };
    });
  };

  const handleDismissUndoInclusion = (itemId: string) => {
    setItemWorkspaces((prev) => {
      const ws = prev[itemId];
      if (!ws) return prev;
      return {
        ...prev,
        [itemId]: { ...ws, lastRemovedInclusion: null },
      };
    });
  };

  const handleToggleInclusionCategory = (itemId: string, category: string) => {
    setItemWorkspaces((prev) => {
      const ws = prev[itemId];
      if (!ws) return prev;
      return {
        ...prev,
        [itemId]: {
          ...ws,
          collapsedCategories: {
            ...ws.collapsedCategories,
            [category]: !ws.collapsedCategories[category],
          },
        },
      };
    });
  };

  const handleSetAllCategoriesCollapsed = (
    itemId: string,
    categories: string[],
    collapsed: boolean
  ) => {
    setItemWorkspaces((prev) => {
      const ws = prev[itemId];
      if (!ws) return prev;
      const nextCollapsed: Record<string, boolean> = { ...ws.collapsedCategories };
      categories.forEach((cat) => {
        nextCollapsed[cat] = collapsed;
      });
      return {
        ...prev,
        [itemId]: {
          ...ws,
          collapsedCategories: nextCollapsed,
        },
      };
    });
  };

  const handleRestoreCatalogInclusions = (itemId: string) => {
    applyWorkspaceUpdate(itemId, (prevWs) => {
      if (prevWs.catalogPredefinedInclusions.length === 0) return prevWs;
      const existingLower = new Set(prevWs.inclusions.map((i) => i.text.trim().toLowerCase()));
      const missingEntries: StructuredInclusionEntry[] = prevWs.catalogPredefinedInclusions
        .filter((catItem) => !existingLower.has(catItem.text.trim().toLowerCase()))
        .map((catItem, idx) => ({
          id: `${itemId}-inc-restored-${Date.now()}-${idx}`,
          text: catItem.text,
          category: catItem.category,
          isCustom: false,
        }));
      return {
        ...prevWs,
        inclusions: [...prevWs.inclusions, ...missingEntries],
        lastRemovedInclusion: null,
      };
    });
    toast.success('Restored predefined catalog inclusions');
  };

  const handleUpdateScopeDescription = (itemId: string, nextDesc: string) => {
    applyWorkspaceUpdate(itemId, (prevWs) => ({
      ...prevWs,
      scopeDescription: nextDesc,
    }));
  };

  // Discount handlers
  const handleAddDiscount = () => {
    setDiscounts((prev) => [
      ...prev,
      {
        id: `disc-${Date.now()}`,
        label: 'Early Bird / Promo Discount',
        type: 'percentage',
        value: 5,
        amount: 0,
      },
    ]);
  };

  const handleUpdateDiscount = (id: string, field: keyof QuotationDiscount, value: any) => {
    setDiscounts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleRemoveDiscount = (id: string) => {
    setDiscounts((prev) => prev.filter((d) => d.id !== id));
  };

  // Additional Charge handlers
  const handleAddCharge = () => {
    setAdditionalCharges((prev) => [
      ...prev,
      {
        id: `chg-${Date.now()}`,
        label: 'Out-of-Town Logistics / Crew Transport',
        amount: 3500,
      },
    ]);
  };

  const handleUpdateCharge = (id: string, field: keyof QuotationAdditionalCharge, value: any) => {
    setAdditionalCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleRemoveCharge = (id: string) => {
    setAdditionalCharges((prev) => prev.filter((c) => c.id !== id));
  };

  // Validity Preset & Custom Date Handlers
  const handleSelectValidityPreset = (days: number) => {
    setValidityDays(days);
    setValidUntilDate(computeValidUntilFromDays(days));
  };

  const handleCustomValidUntilChange = (dateVal: string) => {
    setValidUntilDate(dateVal);
    if (dateVal) {
      setValidityDays(computeDaysFromValidUntil(dateVal));
    }
  };

  // Financial Calculations (Preserved Exactly)
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [items]);

  const computedDiscounts = useMemo(() => {
    return discounts.map((d) => {
      const calcAmount =
        d.type === 'percentage'
          ? Math.round(subtotal * (Number(d.value || 0) / 100))
          : Number(d.value || 0);
      return { ...d, amount: calcAmount };
    });
  }, [discounts, subtotal]);

  const totalDiscounts = useMemo(() => {
    return computedDiscounts.reduce((sum, d) => sum + d.amount, 0);
  }, [computedDiscounts]);

  const totalAdditionalCharges = useMemo(() => {
    return additionalCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  }, [additionalCharges]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - totalDiscounts + totalAdditionalCharges);
  }, [subtotal, totalDiscounts, totalAdditionalCharges]);

  const requiredDownpayment = useMemo(() => {
    return Math.round(grandTotal * 0.5);
  }, [grandTotal]);

  const remainingBalance = useMemo(() => {
    return Math.max(0, grandTotal - requiredDownpayment);
  }, [grandTotal, requiredDownpayment]);

  // Customer Request Details Summary Count (for collapsed header badge)
  const requestSummaryBadges = useMemo(() => {
    const badges: string[] = [];
    if (parsedSelection?.packageSelection) {
      badges.push(`1 Package (${parsedSelection.packageSelection.packageName})`);
    }
    const srvCount = parsedSelection
      ? Object.keys(parsedSelection.serviceCustomizations || {}).length
      : inquiry?.selectedServices?.length || 0;
    if (srvCount > 0) {
      badges.push(`${srvCount} Service${srvCount === 1 ? '' : 's'}`);
    }
    if (plainCustomerNotes) {
      badges.push('Client Notes Attached');
    }
    return badges;
  }, [parsedSelection, inquiry, plainCustomerNotes]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim()) {
      toast.error('Please enter client name and email address.');
      scrollToBuilderSection('qb-section-review');
      return;
    }
    if (!timeValidation.valid) {
      toast.error('Invalid Event Time Range', {
        description: timeValidation.message || 'End time must be later than start time.',
      });
      scrollToBuilderSection('qb-section-review');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one line item to the quotation.');
      scrollToBuilderSection('qb-section-build');
      return;
    }

    const finalValidUntil = validUntilDate || computeValidUntilFromDays(validityDays);

    const cleanExistingTerms = (existingQuotation?.terms || []).filter(
      (t) => typeof t === 'string' && !t.startsWith('__JAD_EVENT_SCHEDULE__:')
    );

    const newQuote: Quotation = {
      id: existingQuotation?.id || `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      dbId: existingQuotation?.dbId,
      inquiryId: inquiry?.id || existingQuotation?.inquiryId || `INQ-MANUAL`,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone.trim(),
      eventType,
      eventDate,
      startTime: timeValidation.normalizedStartTime || undefined,
      endTime: timeValidation.normalizedEndTime || undefined,
      requestedStartTime: requestedStartTime || undefined,
      requestedEndTime: requestedEndTime || undefined,
      approvedStartTime: timeValidation.normalizedStartTime || undefined,
      approvedEndTime: timeValidation.normalizedEndTime || undefined,
      venue: venue.trim() || 'Sorsogon City (TBD)',
      guestCount,
      items,
      subtotal,
      discounts: computedDiscounts,
      additionalCharges,
      grandTotal,
      requiredDownpayment,
      validUntil: finalValidUntil,
      validityDays,
      status: 'Quotation Sent',
      adminComment: adminComment.trim() ? adminComment.trim() : null,
      notes,
      terms:
        cleanExistingTerms.length > 0
          ? cleanExistingTerms
          : [
              '50% Non-refundable Reservation Downpayment required to lock event calendar & production crew.',
              'Remaining 50% balance must be settled 3 days prior to the target ingress date.',
              'Inclement weather postponement requires minimum 7 days advance notice with zero penalty.',
              'Food & Beverage guest count buffer of +10% included in operational provisions.',
            ],
      createdAt:
        existingQuotation?.createdAt ||
        new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      sentAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };

    onSaveAndSend(newQuote);
    toast.success(`Quotation #${newQuote.id} generated and sent to ${clientEmail}!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-6xl p-0 gap-0 rounded-2xl max-h-[94dvh] overflow-hidden flex flex-col bg-slate-50 border border-slate-200 shadow-2xl">
        {/* ============================================================ */}
        {/* STICKY MODAL HEADER & SECTION JUMP NAVIGATION                */}
        {/* ============================================================ */}
        <div className="shrink-0 bg-[#1E3A8A] text-white px-4 sm:px-6 pt-4 pb-3 border-b border-blue-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pr-8">
            <div>
              <div className="flex items-center gap-2 text-orange-400 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>JAD Events Quotation &amp; Pricing Engine</span>
                {(inquiry?.id || existingQuotation?.id) && (
                  <span className="font-mono text-[11px] bg-white/10 text-blue-100 px-2 py-0.5 rounded">
                    {existingQuotation ? `#${existingQuotation.id}` : `Inquiry #${inquiry?.id}`}
                  </span>
                )}
              </div>
              <DialogTitle className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                {existingQuotation
                  ? `Edit Official Quotation #${existingQuotation.id}`
                  : 'Create Itemized Client Quotation'}
              </DialogTitle>
              <DialogDescription className="text-blue-200 text-xs">
                Review client specifications, build itemized scope, adjust pricing, and send to the customer portal.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs rounded-lg gap-1.5 h-8 font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isPreviewMode ? 'Back to Builder' : 'Preview Print'}</span>
              </Button>
            </div>
          </div>

          {/* Top Section Jump Bar (Hidden in Print Preview Mode) */}
          {!isPreviewMode && (
            <div className="mt-3 pt-2.5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {BUILDER_NAV_STEPS.map((nav) => {
                const isActive = activeNavSection === nav.id;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => scrollToBuilderSection(nav.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-white/10 text-blue-100 hover:bg-white/20'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white text-orange-600' : 'bg-white/20 text-white'
                      }`}
                    >
                      {nav.step}
                    </span>
                    <span className="truncate">{nav.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* PRINTABLE LETTERHEAD PREVIEW MODE                            */}
        {/* ============================================================ */}
        {isPreviewMode ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 bg-white text-slate-900 space-y-6">
            <div className="border-b-2 border-[#1E3A8A] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-[#1E3A8A] tracking-tight">
                  JAD EVENTS PRODUCTION &amp; DIRECTING
                </h2>
                <p className="text-xs text-slate-500">
                  Magsaysay Street, Sorsogon City, 4700 Sorsogon, Philippines
                </p>
                <p className="text-xs text-slate-500">
                  Email: bookings@jadevents.ph • Hotline: +63 (917) 842-9910
                </p>
              </div>
              <div className="text-left sm:text-right">
                <Badge variant="brand" className="mb-1">
                  OFFICIAL QUOTATION
                </Badge>
                <div className="text-xs font-mono text-slate-600">
                  Date Issued: {new Date().toLocaleDateString()}
                </div>
                <div className="text-xs font-bold text-orange-600">
                  Valid Until: {validUntilDate || computeValidUntilFromDays(validityDays)} ({validityDays} Days)
                </div>
              </div>
            </div>

            {/* Client & Event Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <div className="text-slate-400 font-bold uppercase">Prepared For:</div>
                <div className="font-bold text-sm text-slate-900">{clientName || 'Valued Client'}</div>
                <div className="text-slate-600">{clientEmail}</div>
                <div className="text-slate-600">{clientPhone}</div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-400 font-bold uppercase">Event Specifications:</div>
                <div>
                  <span className="text-slate-500">Event Type:</span>{' '}
                  <strong className="text-slate-900">{eventType}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Target Date:</span>{' '}
                  <strong className="text-slate-900">{eventDate}</strong>
                </div>
                {hasApprovedTime && (
                  <div>
                    <span className="text-slate-500">Approved Schedule:</span>{' '}
                    <strong className="text-[#1E3A8A]">
                      {formatEventTimeRange(approvedStartTime, approvedEndTime, {
                        includeDuration: true,
                      })}
                    </strong>
                  </div>
                )}
                {requestedStartTime && requestedEndTime && isTimeAdjustedFromRequest && (
                  <div>
                    <span className="text-slate-500">Requested Time:</span>{' '}
                    <span className="text-slate-700">
                      {formatEventTimeRange(requestedStartTime, requestedEndTime)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Venue:</span>{' '}
                  <strong className="text-slate-900">{venue}</strong> ({guestCount} Pax)
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Description / Scope</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => {
                    const ws = itemWorkspaces[item.id];
                    const hasStructuredDetails = Boolean(
                      ws &&
                        (ws.inclusions.length > 0 ||
                          ws.scopeDescription.trim() ||
                          ws.preferences.preferredDishes ||
                          ws.preferences.preferredActivities ||
                          ws.preferences.stylingThemeNotes ||
                          ws.requirements.dietaryRestrictions ||
                          ws.requirements.customNotes)
                    );
                    return (
                      <tr key={item.id}>
                        <td className="py-3 px-3 align-top">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          {hasStructuredDetails && ws ? (
                            <div className="mt-1 space-y-1 text-[11px] text-slate-600">
                              {ws.scopeDescription.trim() && (
                                <div className="text-slate-600 whitespace-pre-wrap">
                                  {ws.scopeDescription}
                                </div>
                              )}
                              {ws.inclusions.length > 0 && (
                                <div className="text-slate-700 leading-relaxed">
                                  <span className="font-semibold text-slate-800">
                                    Included ({ws.inclusions.length}):{' '}
                                  </span>
                                  <span>{ws.inclusions.map((inc) => inc.text).join(' • ')}</span>
                                </div>
                              )}
                              {(ws.preferences.preferredDishes ||
                                ws.preferences.preferredActivities ||
                                ws.preferences.stylingThemeNotes) && (
                                <div className="text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
                                  {ws.preferences.preferredDishes && (
                                    <span>
                                      <strong>Preferred Dishes:</strong>{' '}
                                      {ws.preferences.preferredDishes}
                                    </span>
                                  )}
                                  {ws.preferences.preferredActivities && (
                                    <span>
                                      <strong>Activities/Program:</strong>{' '}
                                      {ws.preferences.preferredActivities}
                                    </span>
                                  )}
                                  {ws.preferences.stylingThemeNotes && (
                                    <span>
                                      <strong>Theme/Motif:</strong>{' '}
                                      {ws.preferences.stylingThemeNotes}
                                    </span>
                                  )}
                                </div>
                              )}
                              {ws.requirements.dietaryRestrictions && (
                                <div className="text-rose-700 font-semibold">
                                  Dietary / Allergies: {ws.requirements.dietaryRestrictions}
                                </div>
                              )}
                              {ws.requirements.customNotes && (
                                <div className="text-slate-600 italic">
                                  Client Note: {ws.requirements.customNotes}
                                </div>
                              )}
                            </div>
                          ) : (
                            formatQuotationItemNotesForDisplay(item.notes) && (
                              <div className="text-slate-500 text-[11px] mt-0.5 whitespace-pre-wrap">
                                {formatQuotationItemNotesForDisplay(item.notes)}
                              </div>
                            )
                          )}
                        </td>
                        <td className="py-3 px-3 text-right align-top">
                          ₱{item.rate.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center align-top">{item.quantity}</td>
                        <td className="py-3 px-3 text-right font-bold align-top">
                          ₱{item.amount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end">
              <div className="w-full sm:w-80 space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-semibold">₱{subtotal.toLocaleString()} PHP</span>
                </div>
                {computedDiscounts.map((d) => (
                  <div key={d.id} className="flex justify-between text-emerald-700">
                    <span>
                      {d.label} ({d.type === 'percentage' ? `${d.value}%` : 'Fixed'}):
                    </span>
                    <span>-₱{d.amount.toLocaleString()} PHP</span>
                  </div>
                ))}
                {additionalCharges.map((c) => (
                  <div key={c.id} className="flex justify-between text-orange-700">
                    <span>{c.label}:</span>
                    <span>+₱{Number(c.amount).toLocaleString()} PHP</span>
                  </div>
                ))}
                <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-extrabold text-[#1E3A8A]">
                  <span>GRAND TOTAL:</span>
                  <span>₱{grandTotal.toLocaleString()} PHP</span>
                </div>
                <div className="pt-1 flex justify-between text-xs font-bold text-orange-600">
                  <span>Required 50% Downpayment:</span>
                  <span>₱{requiredDownpayment.toLocaleString()} PHP</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Remaining 50% Balance:</span>
                  <span>₱{remainingBalance.toLocaleString()} PHP</span>
                </div>
              </div>
            </div>

            {adminComment.trim() && (
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                <div className="font-bold text-[#1E3A8A] uppercase">Admin Comment / Suggestion:</div>
                <p className="text-slate-800 whitespace-pre-wrap">{adminComment}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={() => window.print()} className="gap-1.5">
                <Printer className="w-4 h-4" />
                <span>Print / Save as PDF</span>
              </Button>
              <Button type="button" variant="brand" onClick={handleSave} className="gap-1.5">
                <Send className="w-4 h-4" />
                <span>Confirm &amp; Send to Client</span>
              </Button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* TWO-COLUMN BUILDER WORKSPACE + FIXED BOTTOM ACTION BAR       */
          /* ============================================================ */
          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div
              ref={scrollContainerRef}
              onScroll={handleScrollContainer}
              className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ====================================================== */}
                {/* LEFT COLUMN: MAIN WORKSPACE (8 Cols on Desktop)        */}
                {/* ====================================================== */}
                <div className="lg:col-span-8 space-y-6">
                  {/* ---------------------------------------------------- */}
                  {/* SECTION 1: REVIEW INQUIRY & EVENT SCHEDULE           */}
                  {/* ---------------------------------------------------- */}
                  <section
                    id="qb-section-review"
                    className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white text-xs font-extrabold flex items-center justify-center">
                          1
                        </span>
                        <div>
                          <h3 className="text-sm font-extrabold text-[#1E3A8A]">
                            Customer &amp; Event Header
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Verify client contact info, event specifications, and approved schedule.
                          </p>
                        </div>
                      </div>
                      {inquiry?.id && (
                        <Badge variant="outline" className="text-[11px] font-mono font-bold text-[#1E3A8A] bg-blue-50 border-blue-200">
                          Inquiry #{inquiry.id}
                        </Badge>
                      )}
                    </div>

                    {/* Compact Customer & Event Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="qb-client-name" className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Client Full Name *</span>
                        </Label>
                        <Input
                          id="qb-client-name"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="e.g. Maria Clara"
                          className="h-9 text-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="qb-client-email" className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>Client Email *</span>
                        </Label>
                        <Input
                          id="qb-client-email"
                          type="email"
                          required
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="client@email.com"
                          className="h-9 text-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="qb-client-phone" className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>Contact Phone</span>
                        </Label>
                        <Input
                          id="qb-client-phone"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="0917-xxx-xxxx"
                          className="h-9 text-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="qb-event-type" className="text-[11px] font-bold text-slate-600">
                          Event Type
                        </Label>
                        <Input
                          id="qb-event-type"
                          value={eventType}
                          onChange={(e) => setEventType(e.target.value)}
                          className="h-9 text-xs bg-white font-semibold text-slate-900"
                        />
                        {inquiry?.customEventDescription &&
                          inquiry.customEventDescription !== eventType && (
                            <span className="text-[10px] text-slate-500 block">
                              Custom Description: {inquiry.customEventDescription}
                            </span>
                          )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="qb-event-date" className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-orange-500" />
                          <span>Event Date *</span>
                        </Label>
                        <Input
                          id="qb-event-date"
                          type="date"
                          required
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="h-9 text-xs bg-white font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="qb-guest-count" className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <Users className="w-3 h-3 text-blue-600" />
                          <span>Guest Count (Pax)</span>
                        </Label>
                        <Input
                          id="qb-guest-count"
                          type="number"
                          min={1}
                          value={guestCount}
                          onChange={(e) => setGuestCount(parseInt(e.target.value, 10) || 50)}
                          className="h-9 text-xs bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                        <Label htmlFor="qb-venue" className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-500" />
                          <span>Reserved Venue / Location *</span>
                        </Label>
                        <Input
                          id="qb-venue"
                          required
                          value={venue}
                          onChange={(e) => setVenue(e.target.value)}
                          placeholder="e.g. Sorsogon Convention Center"
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                    </div>

                    {/* Requested vs Approved Event Time Range Block */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#1E3A8A]" />
                          <span className="text-xs font-extrabold text-[#1E3A8A]">
                            Event Time Schedule (Requested vs. Approved)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {requestedStartTime && requestedEndTime ? (
                            <Badge variant="outline" className="text-[10px] bg-white text-slate-700 border-slate-200">
                              Customer Requested: {formatEventTimeRange(requestedStartTime, requestedEndTime, { includeDuration: true })}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-white text-slate-400 border-slate-200">
                              No Customer Time Recorded
                            </Badge>
                          )}

                          {isTimeAdjustedFromRequest && (
                            <Badge variant="warning" className="text-[10px] font-bold">
                              Adjusted by Admin
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="space-y-1">
                          <Label htmlFor="qb-approved-start-time" className="text-[11px] font-semibold text-slate-600">
                            Approved Start Time
                          </Label>
                          <select
                            id="qb-approved-start-time"
                            value={approvedStartTime}
                            onChange={(e) => setApprovedStartTime(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                          >
                            <option value="">-- Not Specified --</option>
                            {EVENT_TIME_OPTIONS.slice(0, -1).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="qb-approved-end-time" className="text-[11px] font-semibold text-slate-600">
                            Approved End Time
                          </Label>
                          <select
                            id="qb-approved-end-time"
                            value={approvedEndTime}
                            onChange={(e) => setApprovedEndTime(e.target.value)}
                            className={`flex h-9 w-full rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] ${
                              !timeValidation.valid ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                            }`}
                          >
                            <option value="">-- Not Specified --</option>
                            {EVENT_TIME_OPTIONS.slice(1).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs h-9 px-3">
                          <span className="text-slate-500 font-medium">Duration:</span>
                          {hasApprovedTime ? (
                            <span className="font-extrabold text-[#1E3A8A]">
                              {calculateEventDurationLabel(approvedStartTime, approvedEndTime)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not set</span>
                          )}
                        </div>
                      </div>

                      {!timeValidation.valid && (
                        <p className="text-[11px] font-semibold text-rose-600">
                          {timeValidation.message}
                        </p>
                      )}
                    </div>

                    {/* ---------------------------------------------------- */}
                    {/* COLLAPSIBLE CUSTOMER REQUEST DETAILS (REFERENCE ONLY)*/}
                    {/* ---------------------------------------------------- */}
                    {(parsedSelection || plainCustomerNotes) && (
                      <div className="rounded-xl border border-blue-200/90 bg-blue-50/40 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setIsRequestDetailsOpen((prev) => !prev)}
                          aria-expanded={isRequestDetailsOpen}
                          className="w-full p-3.5 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-blue-50/80 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Layers className="w-4 h-4 text-[#1E3A8A] shrink-0" />
                            <span className="text-xs font-extrabold text-[#1E3A8A] uppercase tracking-wider">
                              Customer Request Details (Reference Only)
                            </span>
                            {parsedSelection && (
                              <Badge variant="blue" className="text-[10px]">
                                {formatSelectionModeLabel(parsedSelection.selectionMode)}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {!isRequestDetailsOpen && requestSummaryBadges.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {requestSummaryBadges.map((bText, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-[10px] bg-white text-slate-700 border-blue-200"
                                  >
                                    {bText}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <span className="text-[11px] font-bold text-[#1E3A8A] flex items-center gap-1">
                              <span>{isRequestDetailsOpen ? 'Collapse' : 'Expand'}</span>
                              {isRequestDetailsOpen ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </span>
                          </div>
                        </button>

                        {isRequestDetailsOpen && (
                          <div className="px-3.5 pb-3.5 pt-1 border-t border-blue-200/60 space-y-3 text-xs">
                            {/* Highlighted Overall Customer Notes */}
                            {plainCustomerNotes && (
                              <div className="p-3 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-950 space-y-1">
                                <div className="font-bold text-[11px] uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Customer Overall Notes &amp; Special Instructions</span>
                                </div>
                                <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                  {plainCustomerNotes}
                                </p>
                              </div>
                            )}

                            {/* Package Selection Reference */}
                            {parsedSelection?.packageSelection && (
                              <div className="p-3 rounded-lg bg-white border border-purple-200 space-y-1.5">
                                <div className="font-bold text-purple-950 flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-purple-700" />
                                  <span>
                                    Requested Package: {parsedSelection.packageSelection.packageName}
                                  </span>
                                </div>
                                {parsedSelection.packageSelection.selectedOptions.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {parsedSelection.packageSelection.selectedOptions.map((opt, i) => (
                                      <span
                                        key={i}
                                        className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200 font-medium"
                                      >
                                        ✓ {opt}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {parsedSelection.packageSelection.customNotes && (
                                  <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200/80">
                                    <strong>Package Note:</strong> {parsedSelection.packageSelection.customNotes}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Service Customizations Reference */}
                            {parsedSelection &&
                              Object.values(parsedSelection.serviceCustomizations || {}).length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {Object.values(parsedSelection.serviceCustomizations).map((srvCustom) => (
                                    <div
                                      key={srvCustom.serviceId}
                                      className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900">
                                          {srvCustom.serviceName}
                                        </span>
                                        {srvCustom.category && (
                                          <Badge variant="outline" className="text-[9px]">
                                            {srvCustom.category}
                                          </Badge>
                                        )}
                                      </div>

                                      {srvCustom.selectedOptions && srvCustom.selectedOptions.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {srvCustom.selectedOptions.map((opt, idx) => (
                                            <span
                                              key={idx}
                                              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-[#1E3A8A] border border-blue-200 font-medium"
                                            >
                                              ✓ {opt}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      <div className="space-y-1 text-[11px] text-slate-700">
                                        {srvCustom.preferredDishes && (
                                          <div className="flex items-start gap-1">
                                            <Utensils className="w-3 h-3 text-orange-600 shrink-0 mt-0.5" />
                                            <span>
                                              <strong>Dishes:</strong> {srvCustom.preferredDishes}
                                            </span>
                                          </div>
                                        )}
                                        {srvCustom.dietaryRestrictions && (
                                          <div className="flex items-start gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded border border-rose-200">
                                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />
                                            <span>
                                              <strong>Dietary / Allergies:</strong>{' '}
                                              {srvCustom.dietaryRestrictions}
                                            </span>
                                          </div>
                                        )}
                                        {srvCustom.preferredActivities && (
                                          <div>
                                            <strong>Activities / Program:</strong>{' '}
                                            {srvCustom.preferredActivities}
                                          </div>
                                        )}
                                        {srvCustom.stylingThemeNotes && (
                                          <div>
                                            <strong>Theme / Motif:</strong> {srvCustom.stylingThemeNotes}
                                          </div>
                                        )}
                                        {srvCustom.customNotes && (
                                          <div className="italic text-slate-600">
                                            <strong>Note:</strong> &ldquo;{srvCustom.customNotes}&rdquo;
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  {/* ---------------------------------------------------- */}
                  {/* SECTION 2: BUILD QUOTATION (CATALOG + LINE ITEMS)    */}
                  {/* ---------------------------------------------------- */}
                  <section
                    id="qb-section-build"
                    className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white text-xs font-extrabold flex items-center justify-center">
                          2
                        </span>
                        <div>
                          <h3 className="text-sm font-extrabold text-[#1E3A8A]">
                            Build Itemized Quotation
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Quick-add from the JAD Events catalog or customize individual line items below.
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustomItem}
                        className="h-8 text-xs font-bold border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Custom Line Item</span>
                      </Button>
                    </div>

                    {/* Searchable & Categorized Quick-Add Catalog */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-orange-500" />
                          <span>Quick-Add Quotation Catalog</span>
                        </span>

                        <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          <Input
                            type="text"
                            value={catalogSearch}
                            onChange={(e) => setCatalogSearch(e.target.value)}
                            placeholder="Search packages or services..."
                            className="h-8 pl-8 text-xs bg-white"
                          />
                        </div>
                      </div>

                      {/* Category Filter Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <button
                          type="button"
                          onClick={() => setCatalogCategory('ALL')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                            catalogCategory === 'ALL'
                              ? 'bg-[#1E3A8A] text-white'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          All Items
                        </button>
                        <button
                          type="button"
                          onClick={() => setCatalogCategory('PACKAGES')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                            catalogCategory === 'PACKAGES'
                              ? 'bg-purple-700 text-white'
                              : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                          }`}
                        >
                          Packages ({packages.filter((p) => p.isActive !== false).length})
                        </button>
                        {serviceCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCatalogCategory(cat)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                              catalogCategory === cat
                                ? 'bg-[#1E3A8A] text-white'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Catalog Cards Grid */}
                      {filteredCatalogItems.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
                          No matching catalog items found. Try another search term or click{' '}
                          <strong>&ldquo;Add Custom Line Item&rdquo;</strong>.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {filteredCatalogItems.map((entry) => (
                            <div
                              key={entry.id}
                              className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-blue-300 flex items-center justify-between gap-2 transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate" title={entry.name}>
                                  {entry.name}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-500 truncate">
                                    {entry.categoryLabel}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[11px] font-extrabold text-[#1E3A8A]">
                                    ₱{entry.price.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddCatalogEntry(entry)}
                                className="h-7 px-2.5 text-[11px] font-bold text-[#1E3A8A] border-blue-200 bg-blue-50/60 hover:bg-blue-100 shrink-0 gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Itemized Quotation Line Items List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                          Itemized Quotation Scope ({items.length}{' '}
                          {items.length === 1 ? 'Item' : 'Items'})
                        </span>
                        <span className="text-xs font-bold text-[#1E3A8A]">
                          Items Subtotal: ₱{subtotal.toLocaleString()} PHP
                        </span>
                      </div>

                      {items.length === 0 ? (
                        <div className="p-8 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center space-y-2">
                          <FileText className="w-7 h-7 text-slate-400 mx-auto" />
                          <div className="text-xs font-bold text-slate-700">
                            No Quotation Line Items Added Yet
                          </div>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                            Select a package or service from the Quick-Add Catalog above, or add a custom line item to start building the quotation.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleAddCustomItem}
                            className="mt-1 text-xs font-bold"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            <span>Add First Line Item</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {items.map((item, index) => {
                            const ws = itemWorkspaces[item.id] || {
                              itemId: item.id,
                              catalogSubtitle: undefined,
                              catalogPredefinedInclusions: [],
                              scopeDescription: formatQuotationItemNotesForDisplay(item.notes),
                              inclusions: [],
                              preferences: { selectedOptions: [] },
                              requirements: {},
                              collapsedCategories: {},
                              lastRemovedInclusion: null,
                            };

                            // Group inclusions by category preserving insertion order
                            const groupedInclusionsMap = new Map<string, StructuredInclusionEntry[]>();
                            ws.inclusions.forEach((inc) => {
                              const cat = inc.category || 'Other Inclusions';
                              const list = groupedInclusionsMap.get(cat) || [];
                              list.push(inc);
                              groupedInclusionsMap.set(cat, list);
                            });
                            const categoryEntries = Array.from(groupedInclusionsMap.entries());
                            const categoryNames = categoryEntries.map(([catName]) => catName);
                            const allCategoriesCollapsed =
                              categoryNames.length > 1 &&
                              categoryNames.every((c) => Boolean(ws.collapsedCategories[c]));

                            const existingInclusionTextsLower = new Set(
                              ws.inclusions.map((i) => i.text.trim().toLowerCase())
                            );
                            const missingCatalogCount = ws.catalogPredefinedInclusions.filter(
                              (c) => !existingInclusionTextsLower.has(c.text.trim().toLowerCase())
                            ).length;

                            const hasCustomerPreferences = Boolean(
                              ws.preferences.preferredDishes ||
                                ws.preferences.preferredActivities ||
                                ws.preferences.stylingThemeNotes ||
                                ws.preferences.selectedOptions.length > 0
                            );
                            const hasSpecialRequirements = Boolean(
                              ws.requirements.dietaryRestrictions || ws.requirements.customNotes
                            );

                            const isAddingToThisItem = addingInclusion?.itemId === item.id;

                            return (
                              <div
                                key={item.id}
                                className="rounded-xl bg-white border border-slate-200/90 hover:border-blue-300/80 shadow-2xs overflow-hidden transition-colors"
                              >
                                {/* ================================================== */}
                                {/* AREA A: ITEM INFORMATION HEADER                    */}
                                {/* ================================================== */}
                                <div className="p-3.5 sm:p-4 bg-slate-50/90 border-b border-slate-200/80 flex items-start gap-2.5">
                                  <span className="w-6 h-6 rounded-md bg-[#1E3A8A] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-1">
                                    {index + 1}
                                  </span>

                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] uppercase font-bold ${
                                          item.type === 'package'
                                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                                            : item.type === 'service'
                                            ? 'bg-blue-50 text-[#1E3A8A] border-blue-200'
                                            : 'bg-orange-50 text-orange-800 border-orange-200'
                                        }`}
                                      >
                                        {item.type}
                                      </Badge>
                                      <span className="text-[11px] font-semibold text-slate-500">
                                        Item Name / Title
                                      </span>
                                      {ws.catalogSubtitle && (
                                        <span className="text-[11px] text-slate-500 truncate max-w-md">
                                          • {ws.catalogSubtitle}
                                        </span>
                                      )}
                                    </div>

                                    <Input
                                      value={item.name}
                                      onChange={(e) =>
                                        handleUpdateItem(item.id, 'name', e.target.value)
                                      }
                                      placeholder="Line item title or service name"
                                      className="h-9 text-xs sm:text-sm font-bold text-slate-900 bg-white"
                                    />
                                  </div>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 mt-1"
                                    title="Remove line item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>

                                <div className="p-3.5 sm:p-4 space-y-4">
                                  {/* ================================================== */}
                                  {/* AREA B: INCLUDED OPTIONS / INCLUSIONS MANAGER      */}
                                  {/* ================================================== */}
                                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                                    {/* Inclusion Manager Header */}
                                    <div className="px-3.5 py-2.5 bg-slate-100/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <CheckSquare className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                                        <span className="text-xs font-extrabold text-[#1E3A8A]">
                                          Included Options &amp; Inclusions
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] font-bold bg-white text-slate-700 border-slate-200"
                                        >
                                          {ws.inclusions.length}{' '}
                                          {ws.inclusions.length === 1 ? 'Inclusion' : 'Inclusions'}
                                        </Badge>
                                        {categoryNames.length > 0 && (
                                          <span className="text-[10px] text-slate-500 font-medium">
                                            ({categoryNames.length}{' '}
                                            {categoryNames.length === 1 ? 'Category' : 'Categories'})
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {categoryNames.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleSetAllCategoriesCollapsed(
                                                item.id,
                                                categoryNames,
                                                !allCategoriesCollapsed
                                              )
                                            }
                                            className="px-2 py-1 rounded text-[10px] font-bold text-slate-600 hover:text-[#1E3A8A] hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                                          >
                                            {allCategoriesCollapsed ? 'Expand All' : 'Collapse All'}
                                          </button>
                                        )}

                                        {missingCatalogCount > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => handleRestoreCatalogInclusions(item.id)}
                                            className="px-2 py-1 rounded text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                                            title="Restore predefined catalog inclusions"
                                          >
                                            <RefreshCw className="w-2.5 h-2.5" />
                                            <span>Restore Defaults (+{missingCatalogCount})</span>
                                          </button>
                                        )}

                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            isAddingToThisItem
                                              ? setAddingInclusion(null)
                                              : handleStartAddInclusion(item.id)
                                          }
                                          className="h-7 px-2.5 text-[11px] font-bold text-[#1E3A8A] border-blue-200 bg-white hover:bg-blue-50 gap-1"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Add Inclusion</span>
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Safe Undo Banner when an inclusion was just removed */}
                                    {ws.lastRemovedInclusion && (
                                      <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
                                        <span className="truncate">
                                          Removed inclusion:{' '}
                                          <strong>&ldquo;{ws.lastRemovedInclusion.entry.text}&rdquo;</strong>
                                        </span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleUndoRemoveInclusion(item.id)}
                                            className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                          >
                                            <RefreshCw className="w-3 h-3" />
                                            <span>Undo</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDismissUndoInclusion(item.id)}
                                            className="p-0.5 text-amber-700 hover:text-amber-950 rounded cursor-pointer"
                                            title="Dismiss"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Inline Add Inclusion Input Bar */}
                                    {isAddingToThisItem && addingInclusion && (
                                      <div className="p-3 bg-blue-50/70 border-b border-blue-200/80 space-y-2">
                                        <div className="text-[11px] font-bold text-[#1E3A8A] flex items-center justify-between">
                                          <span>Add New / Custom Inclusion</span>
                                          <span className="text-[10px] font-normal text-slate-500">
                                            Press Enter to save
                                          </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                          <Input
                                            value={addingInclusion.text}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setAddingInclusion((prev) => {
                                                if (!prev) return null;
                                                const nextCat = prev.categoryManuallySelected
                                                  ? prev.category
                                                  : inferInclusionCategory(val, prev.category);
                                                return {
                                                  ...prev,
                                                  text: val,
                                                  category: nextCat,
                                                };
                                              });
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleConfirmAddInclusion(item.id);
                                              } else if (e.key === 'Escape') {
                                                e.preventDefault();
                                                setAddingInclusion(null);
                                              }
                                            }}
                                            placeholder="e.g. 3-Course Managed Buffet, LED Wall 9x12ft, Acoustic Band..."
                                            className="h-8 text-xs bg-white flex-1"
                                            autoFocus
                                          />

                                          <select
                                            value={addingInclusion.category}
                                            onChange={(e) =>
                                              setAddingInclusion((prev) =>
                                                prev
                                                  ? {
                                                      ...prev,
                                                      category: e.target.value,
                                                      categoryManuallySelected: true,
                                                    }
                                                  : null
                                              )
                                            }
                                            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shrink-0"
                                            aria-label="Inclusion category"
                                          >
                                            {Array.from(
                                              new Set([...INCLUSION_CATEGORIES, ...categoryNames])
                                            ).map((catOpt) => (
                                              <option key={catOpt} value={catOpt}>
                                                {catOpt}
                                              </option>
                                            ))}
                                          </select>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="brand"
                                              onClick={() => handleConfirmAddInclusion(item.id)}
                                              className="h-8 px-3 text-xs font-bold gap-1"
                                            >
                                              <Check className="w-3.5 h-3.5" />
                                              <span>Save</span>
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() => setAddingInclusion(null)}
                                              className="h-8 px-2.5 text-xs font-semibold bg-white"
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Categorized Inclusion Groups or Empty State */}
                                    {categoryEntries.length === 0 ? (
                                      <div className="p-4 text-center space-y-2 bg-white">
                                        <p className="text-xs font-semibold text-slate-600">
                                          No individual inclusions listed for this line item yet.
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                          Add specific deliverables or custom inclusions so the scope is clear and itemized.
                                        </p>
                                        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleStartAddInclusion(item.id)}
                                            className="h-7 text-[11px] font-bold text-[#1E3A8A] border-blue-200 bg-blue-50/60 hover:bg-blue-100 gap-1"
                                          >
                                            <Plus className="w-3 h-3" />
                                            <span>Add First Inclusion</span>
                                          </Button>
                                          {ws.catalogPredefinedInclusions.length > 0 && (
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() =>
                                                handleRestoreCatalogInclusions(item.id)
                                              }
                                              className="h-7 text-[11px] font-bold gap-1"
                                            >
                                              <RefreshCw className="w-3 h-3" />
                                              <span>
                                                Load Catalog Inclusions (
                                                {ws.catalogPredefinedInclusions.length})
                                              </span>
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="divide-y divide-slate-200/80 bg-white">
                                        {categoryEntries.map(([catName, catItems]) => {
                                          const isCollapsed = Boolean(
                                            ws.collapsedCategories[catName]
                                          );
                                          return (
                                            <div key={catName} className="bg-white">
                                              {/* Category Collapsible Header */}
                                              <div className="px-3.5 py-2 bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between gap-2 transition-colors">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleToggleInclusionCategory(item.id, catName)
                                                  }
                                                  aria-expanded={!isCollapsed}
                                                  className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
                                                >
                                                  {isCollapsed ? (
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                  ) : (
                                                    <ChevronUp className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                                                  )}
                                                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 truncate">
                                                    {catName}
                                                  </span>
                                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-[#1E3A8A] border border-blue-200/80 shrink-0">
                                                    {catItems.length}
                                                  </span>
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleStartAddInclusion(item.id, catName)
                                                  }
                                                  className="text-[10px] font-bold text-[#1E3A8A] hover:text-orange-600 px-1.5 py-0.5 rounded hover:bg-blue-50 flex items-center gap-0.5 shrink-0 cursor-pointer"
                                                  title={`Add inclusion to ${catName}`}
                                                >
                                                  <Plus className="w-3 h-3" />
                                                  <span className="hidden sm:inline">Add here</span>
                                                </button>
                                              </div>

                                              {/* Category Inclusion Checklist Rows */}
                                              {!isCollapsed && (
                                                <div className="divide-y divide-slate-100 px-3.5 py-1">
                                                  {catItems.map((inc) => {
                                                    const isEditingThisRow =
                                                      editingInclusion?.itemId === item.id &&
                                                      editingInclusion?.inclusionId === inc.id;

                                                    if (isEditingThisRow && editingInclusion) {
                                                      return (
                                                        <div
                                                          key={inc.id}
                                                          className="py-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-blue-50/40 -mx-2 px-2 rounded-lg"
                                                        >
                                                          <Input
                                                            value={editingInclusion.text}
                                                            onChange={(e) =>
                                                              setEditingInclusion((prev) =>
                                                                prev
                                                                  ? {
                                                                      ...prev,
                                                                      text: e.target.value,
                                                                    }
                                                                  : null
                                                              )
                                                            }
                                                            onKeyDown={(e) => {
                                                              if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleConfirmEditInclusion();
                                                              } else if (e.key === 'Escape') {
                                                                e.preventDefault();
                                                                setEditingInclusion(null);
                                                              }
                                                            }}
                                                            className="h-8 text-xs bg-white flex-1"
                                                            autoFocus
                                                          />
                                                          <select
                                                            value={editingInclusion.category}
                                                            onChange={(e) =>
                                                              setEditingInclusion((prev) =>
                                                                prev
                                                                  ? {
                                                                      ...prev,
                                                                      category: e.target.value,
                                                                    }
                                                                  : null
                                                              )
                                                            }
                                                            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shrink-0"
                                                            aria-label="Edit inclusion category"
                                                          >
                                                            {Array.from(
                                                              new Set([
                                                                ...INCLUSION_CATEGORIES,
                                                                ...categoryNames,
                                                              ])
                                                            ).map((catOpt) => (
                                                              <option key={catOpt} value={catOpt}>
                                                                {catOpt}
                                                              </option>
                                                            ))}
                                                          </select>
                                                          <div className="flex items-center gap-1 shrink-0">
                                                            <Button
                                                              type="button"
                                                              size="sm"
                                                              variant="brand"
                                                              onClick={handleConfirmEditInclusion}
                                                              className="h-8 px-2.5 text-xs font-bold gap-1"
                                                            >
                                                              <Check className="w-3.5 h-3.5" />
                                                              <span>Save</span>
                                                            </Button>
                                                            <Button
                                                              type="button"
                                                              size="sm"
                                                              variant="outline"
                                                              onClick={() =>
                                                                setEditingInclusion(null)
                                                              }
                                                              className="h-8 px-2 text-xs bg-white"
                                                            >
                                                              <X className="w-3.5 h-3.5" />
                                                            </Button>
                                                          </div>
                                                        </div>
                                                      );
                                                    }

                                                    return (
                                                      <div
                                                        key={inc.id}
                                                        className="py-1.5 flex items-center justify-between gap-2 group"
                                                      >
                                                        <div className="flex items-start gap-2 min-w-0 flex-1">
                                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                          <span className="text-xs text-slate-800 font-medium break-words">
                                                            {inc.text}
                                                          </span>
                                                          {inc.isCustom && (
                                                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                                                              Custom
                                                            </span>
                                                          )}
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                          <button
                                                            type="button"
                                                            onClick={() =>
                                                              handleStartEditInclusion(item.id, inc)
                                                            }
                                                            className="p-1 text-slate-400 hover:text-[#1E3A8A] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                                            title="Edit inclusion"
                                                          >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={() =>
                                                              handleRemoveInclusionEntry(
                                                                item.id,
                                                                inc.id
                                                              )
                                                            }
                                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                                            title="Remove inclusion"
                                                          >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  {/* ================================================== */}
                                  {/* AREA C: CUSTOMER PREFERENCES & SPECIAL REQUIREMENTS */}
                                  {/* ================================================== */}
                                  <div className="space-y-3">
                                    {(hasCustomerPreferences || hasSpecialRequirements) ? (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Customer Preferences Subcard */}
                                        <div className="p-3 rounded-xl bg-blue-50/40 border border-blue-200/80 space-y-2">
                                          <div className="flex items-center justify-between gap-1.5">
                                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1E3A8A] flex items-center gap-1.5">
                                              <Utensils className="w-3.5 h-3.5 text-[#1E3A8A]" />
                                              <span>Customer Preferences</span>
                                            </span>
                                            {ws.preferences.selectedOptions.length > 0 && (
                                              <Badge
                                                variant="outline"
                                                className="text-[9px] bg-white text-[#1E3A8A] border-blue-200"
                                              >
                                                {ws.preferences.selectedOptions.length} Requested{' '}
                                                {ws.preferences.selectedOptions.length === 1
                                                  ? 'Option'
                                                  : 'Options'}
                                              </Badge>
                                            )}
                                          </div>

                                          {!hasCustomerPreferences ? (
                                            <p className="text-[11px] text-slate-500 italic">
                                              No specific dish, theme, or program preferences submitted for this item.
                                            </p>
                                          ) : (
                                            <div className="space-y-1.5 text-xs text-slate-700">
                                              {ws.preferences.preferredDishes && (
                                                <div className="p-2 rounded-lg bg-white border border-blue-100">
                                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                    Preferred Dishes / Menu
                                                  </span>
                                                  <span className="font-semibold text-slate-900">
                                                    {ws.preferences.preferredDishes}
                                                  </span>
                                                </div>
                                              )}
                                              {ws.preferences.preferredActivities && (
                                                <div className="p-2 rounded-lg bg-white border border-blue-100">
                                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                    Requested Activities / Program
                                                  </span>
                                                  <span className="font-semibold text-slate-900">
                                                    {ws.preferences.preferredActivities}
                                                  </span>
                                                </div>
                                              )}
                                              {ws.preferences.stylingThemeNotes && (
                                                <div className="p-2 rounded-lg bg-white border border-blue-100">
                                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                    Styling Theme / Motif / Variants
                                                  </span>
                                                  <span className="font-semibold text-slate-900">
                                                    {ws.preferences.stylingThemeNotes}
                                                  </span>
                                                </div>
                                              )}
                                              {ws.preferences.selectedOptions.length > 0 &&
                                                !ws.preferences.preferredDishes &&
                                                !ws.preferences.preferredActivities &&
                                                !ws.preferences.stylingThemeNotes && (
                                                  <div className="text-[11px] text-slate-600">
                                                    Customer selected{' '}
                                                    <strong>
                                                      {ws.preferences.selectedOptions.length}
                                                    </strong>{' '}
                                                    predefined catalog{' '}
                                                    {ws.preferences.selectedOptions.length === 1
                                                      ? 'option'
                                                      : 'options'}{' '}
                                                    (listed in the Inclusions Manager above).
                                                  </div>
                                                )}
                                            </div>
                                          )}
                                        </div>

                                        {/* Special Requirements Subcard */}
                                        <div
                                          className={`p-3 rounded-xl border space-y-2 ${
                                            ws.requirements.dietaryRestrictions
                                              ? 'bg-rose-50/50 border-rose-200'
                                              : 'bg-amber-50/40 border-amber-200/80'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-1.5">
                                            <span
                                              className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                                                ws.requirements.dietaryRestrictions
                                                  ? 'text-rose-800'
                                                  : 'text-amber-900'
                                              }`}
                                            >
                                              <AlertTriangle
                                                className={`w-3.5 h-3.5 ${
                                                  ws.requirements.dietaryRestrictions
                                                    ? 'text-rose-600'
                                                    : 'text-amber-600'
                                                }`}
                                              />
                                              <span>Special Requirements</span>
                                            </span>
                                            {ws.requirements.dietaryRestrictions && (
                                              <Badge
                                                variant="destructive"
                                                className="text-[9px] font-bold uppercase"
                                              >
                                                Allergy / Dietary Alert
                                              </Badge>
                                            )}
                                          </div>

                                          {!hasSpecialRequirements ? (
                                            <p className="text-[11px] text-slate-500 italic">
                                              No dietary restrictions, allergies, or special instructions recorded for this item.
                                            </p>
                                          ) : (
                                            <div className="space-y-2 text-xs">
                                              {ws.requirements.dietaryRestrictions && (
                                                <div className="p-2.5 rounded-lg bg-rose-100/80 border border-rose-300 text-rose-950 space-y-0.5">
                                                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3 text-rose-700 shrink-0" />
                                                    <span>Dietary Restrictions &amp; Allergies</span>
                                                  </div>
                                                  <p className="font-bold text-xs text-rose-950">
                                                    {ws.requirements.dietaryRestrictions}
                                                  </p>
                                                </div>
                                              )}
                                              {ws.requirements.customNotes && (
                                                <div className="p-2 rounded-lg bg-white border border-amber-200 text-slate-800">
                                                  <span className="text-[10px] font-bold uppercase text-amber-800 block">
                                                    Special Instructions / Client Note
                                                  </span>
                                                  <p className="text-xs whitespace-pre-wrap mt-0.5">
                                                    {ws.requirements.customNotes}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span>
                                            No item-specific customer preferences or dietary restrictions submitted for this line item.
                                          </span>
                                        </span>
                                      </div>
                                    )}

                                    {/* Readable Editable Scope Description / Preserved Legacy Text Field */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <Label className="text-[11px] font-semibold text-slate-600">
                                          Scope Summary / Additional Operational Description
                                        </Label>
                                        <span className="text-[10px] text-slate-400">
                                          Preserves general scope &amp; legacy descriptions
                                        </span>
                                      </div>
                                      {ws.scopeDescription.includes('\n') ? (
                                        <Textarea
                                          rows={2}
                                          value={ws.scopeDescription}
                                          onChange={(e) =>
                                            handleUpdateScopeDescription(item.id, e.target.value)
                                          }
                                          placeholder="General item summary, capacity note, or additional scope description..."
                                          className="min-h-[36px] py-1.5 text-xs bg-white resize-y"
                                        />
                                      ) : (
                                        <Input
                                          value={ws.scopeDescription}
                                          onChange={(e) =>
                                            handleUpdateScopeDescription(item.id, e.target.value)
                                          }
                                          placeholder="General item summary, capacity note, or additional scope description..."
                                          className="h-8 text-xs bg-white"
                                        />
                                      )}
                                    </div>
                                  </div>

                                  {/* ================================================== */}
                                  {/* AREA D: PRICING DETAILS                            */}
                                  {/* ================================================== */}
                                  <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-semibold text-slate-600">
                                        Unit Rate (PHP)
                                      </Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={item.rate}
                                        onChange={(e) =>
                                          handleUpdateItem(item.id, 'rate', e.target.value)
                                        }
                                        className="h-9 text-xs font-semibold bg-white"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-semibold text-slate-600">
                                        Quantity / Units
                                      </Label>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={item.quantity}
                                        onChange={(e) =>
                                          handleUpdateItem(item.id, 'quantity', e.target.value)
                                        }
                                        className="h-9 text-xs font-semibold bg-white"
                                      />
                                    </div>

                                    <div className="p-2 px-3 rounded-lg bg-blue-50/60 border border-blue-200/80 flex items-center justify-between h-9">
                                      <span className="text-[11px] font-bold text-slate-600">
                                        Line Total:
                                      </span>
                                      <span className="text-xs sm:text-sm font-extrabold text-[#1E3A8A]">
                                        ₱{item.amount.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* ---------------------------------------------------- */}
                  {/* SECTION 3: ADJUST PRICING (DISCOUNTS & CHARGES)      */}
                  {/* ---------------------------------------------------- */}
                  <section
                    id="qb-section-pricing"
                    className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white text-xs font-extrabold flex items-center justify-center">
                        3
                      </span>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#1E3A8A]">
                          Adjust Pricing: Discounts &amp; Additional Charges
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Apply promotional discounts or add logistical surcharges separately.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Discounts Card */}
                      <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/90 space-y-3 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                                <Percent className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Discounts &amp; Rebates</span>
                              </span>
                              <span className="text-[10px] text-emerald-700 block">
                                Deducted from subtotal (-₱{totalDiscounts.toLocaleString()})
                              </span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleAddDiscount}
                              className="h-7 px-2.5 text-[11px] font-bold border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-100 gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Discount</span>
                            </Button>
                          </div>

                          {computedDiscounts.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic py-2">
                              No discounts applied to this quotation.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {computedDiscounts.map((disc) => (
                                <div
                                  key={disc.id}
                                  className="p-2.5 rounded-lg bg-white border border-emerald-200 space-y-2"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      value={disc.label}
                                      onChange={(e) =>
                                        handleUpdateDiscount(disc.id, 'label', e.target.value)
                                      }
                                      placeholder="Discount reason / promo label"
                                      className="h-8 text-xs flex-1"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDiscount(disc.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                                      title="Remove discount"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={disc.type}
                                        onChange={(e) =>
                                          handleUpdateDiscount(disc.id, 'type', e.target.value)
                                        }
                                        className="h-8 rounded-md border border-slate-200 px-2 text-xs bg-slate-50 font-semibold text-slate-700"
                                      >
                                        <option value="percentage">% Percentage</option>
                                        <option value="fixed">₱ Fixed PHP</option>
                                      </select>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={disc.value}
                                        onChange={(e) =>
                                          handleUpdateDiscount(disc.id, 'value', e.target.value)
                                        }
                                        className="h-8 text-xs w-24 font-semibold"
                                      />
                                    </div>
                                    <span className="text-xs font-extrabold text-emerald-700">
                                      -₱{disc.amount.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Charges Card */}
                      <div className="p-4 rounded-xl bg-orange-50/40 border border-orange-200/90 space-y-3 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-extrabold text-orange-950 flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-orange-600" />
                                <span>Additional Charges</span>
                              </span>
                              <span className="text-[10px] text-orange-800 block">
                                Added to total (+₱{totalAdditionalCharges.toLocaleString()})
                              </span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleAddCharge}
                              className="h-7 px-2.5 text-[11px] font-bold border-orange-300 text-orange-800 bg-white hover:bg-orange-100 gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Charge</span>
                            </Button>
                          </div>

                          {additionalCharges.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic py-2">
                              No extra logistical or transport fees added.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {additionalCharges.map((chg) => (
                                <div
                                  key={chg.id}
                                  className="p-2.5 rounded-lg bg-white border border-orange-200 space-y-2"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      value={chg.label}
                                      onChange={(e) =>
                                        handleUpdateCharge(chg.id, 'label', e.target.value)
                                      }
                                      placeholder="Charge description (e.g. Generator / Transport)"
                                      className="h-8 text-xs flex-1"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCharge(chg.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                                      title="Remove charge"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] font-semibold text-slate-500">
                                        Amount (PHP):
                                      </span>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={chg.amount}
                                        onChange={(e) =>
                                          handleUpdateCharge(chg.id, 'amount', e.target.value)
                                        }
                                        className="h-8 text-xs w-28 font-semibold"
                                      />
                                    </div>
                                    <span className="text-xs font-extrabold text-orange-700">
                                      +₱{Number(chg.amount || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ---------------------------------------------------- */}
                  {/* SECTION 4: REVIEW & SEND (VALIDITY + ADMIN COMMENT)  */}
                  {/* ---------------------------------------------------- */}
                  <section
                    id="qb-section-send"
                    className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white text-xs font-extrabold flex items-center justify-center">
                        4
                      </span>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#1E3A8A]">
                          Quotation Validity &amp; Admin Comment
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Set the quotation expiration date and add optional recommendations for the client.
                        </p>
                      </div>
                    </div>

                    {/* Quotation Validity Controls */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-orange-500" />
                          <span>Quotation Validity Period</span>
                        </Label>
                        <Badge variant="outline" className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                          Expires On: {validUntilDate || computeValidUntilFromDays(validityDays)} ({validityDays}{' '}
                          {validityDays === 1 ? 'Day' : 'Days'})
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[7, 14, 30].map((presetDays) => {
                            const isSelected = validityDays === presetDays;
                            return (
                              <button
                                key={presetDays}
                                type="button"
                                onClick={() => handleSelectValidityPreset(presetDays)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                                  isSelected
                                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {presetDays} Days
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2">
                          <Label htmlFor="qb-valid-until" className="text-[11px] font-semibold text-slate-600 shrink-0">
                            Custom Date:
                          </Label>
                          <Input
                            id="qb-valid-until"
                            type="date"
                            value={validUntilDate}
                            onChange={(e) => handleCustomValidUntilChange(e.target.value)}
                            className="h-9 text-xs bg-white font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Admin Comment / Suggestion Textarea */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <Label htmlFor="qb-admin-comment" className="text-xs font-bold text-[#1E3A8A]">
                          Admin Comment / Suggestion
                        </Label>
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <Info className="w-3 h-3 text-blue-600" />
                          <span>Optional — visible to customer on official quotation</span>
                        </span>
                      </div>
                      <Textarea
                        id="qb-admin-comment"
                        rows={4}
                        value={adminComment}
                        onChange={(e) => setAdminComment(e.target.value)}
                        placeholder="Add personalized recommendations, package adjustment explanations, or scheduling notes for the customer..."
                        className="text-xs bg-white resize-y min-h-[88px]"
                      />
                    </div>

                    {/* Scope Summary / Internal Proposal Notes */}
                    <div className="space-y-1.5">
                      <Label htmlFor="qb-scope-notes" className="text-xs font-semibold text-slate-700">
                        Quotation Scope Summary / Cover Note
                      </Label>
                      <Input
                        id="qb-scope-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Summary note included with the quotation..."
                        className="h-9 text-xs bg-white"
                      />
                    </div>
                  </section>
                </div>

                {/* ====================================================== */}
                {/* RIGHT COLUMN: STICKY LIVE QUOTATION SUMMARY (4 Cols)   */}
                {/* ====================================================== */}
                <div className="lg:col-span-4 lg:sticky lg:top-0 space-y-4">
                  <div className="rounded-xl bg-[#1E3A8A] text-white p-5 shadow-lg border border-blue-900 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/15">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-orange-400" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
                          Live Quotation Summary
                        </h4>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-white/10 text-blue-100 border-white/20">
                        {items.length} {items.length === 1 ? 'Item' : 'Items'}
                      </Badge>
                    </div>

                    {/* Event & Schedule Snapshot */}
                    <div className="p-3 rounded-lg bg-white/10 border border-white/10 space-y-1.5 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-blue-200">Client:</span>
                        <span className="font-bold text-white truncate">
                          {clientName || 'Not specified'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-blue-200">Event Date:</span>
                        <span className="font-bold text-white">{eventDate || 'TBD'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-blue-200">Event Time:</span>
                        <span className="font-bold text-orange-300 text-right">
                          {hasApprovedTime
                            ? formatEventTimeRange(approvedStartTime, approvedEndTime, {
                                includeDuration: true,
                              })
                            : 'Not set'}
                        </span>
                      </div>
                      {requestedStartTime && requestedEndTime && isTimeAdjustedFromRequest && (
                        <div className="flex justify-between gap-2 text-[11px] pt-1 border-t border-white/10">
                          <span className="text-blue-200">Requested Time:</span>
                          <span className="text-blue-100">
                            {formatEventTimeRange(requestedStartTime, requestedEndTime)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quotation Breakdown */}
                    <div className="space-y-2 text-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                        Quotation Breakdown
                      </div>
                      <div className="flex justify-between text-blue-100">
                        <span>Items Subtotal:</span>
                        <span className="font-semibold text-white">
                          ₱{subtotal.toLocaleString()} PHP
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-300">
                        <span>Discounts ({computedDiscounts.length}):</span>
                        <span className="font-semibold">
                          -₱{totalDiscounts.toLocaleString()} PHP
                        </span>
                      </div>
                      <div className="flex justify-between text-orange-300">
                        <span>Additional Charges ({additionalCharges.length}):</span>
                        <span className="font-semibold">
                          +₱{totalAdditionalCharges.toLocaleString()} PHP
                        </span>
                      </div>
                    </div>

                    {/* Prominent Grand Total */}
                    <div className="pt-3 border-t border-white/20 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">
                        Grand Total Contract Amount
                      </span>
                      <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        ₱{grandTotal.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-blue-200">PHP</span>
                      </div>
                    </div>

                    {/* Payment Milestones Summary (50% Downpayment + 50% Remaining Balance) */}
                    <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 space-y-2 text-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-orange-300">
                        Payment Schedule Breakdown
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-100 font-medium">Required 50% Downpayment:</span>
                        <span className="font-extrabold text-sm text-orange-400">
                          ₱{requiredDownpayment.toLocaleString()} PHP
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                        <span className="text-blue-200">Remaining 50% Balance:</span>
                        <span className="font-bold text-white">
                          ₱{remainingBalance.toLocaleString()} PHP
                        </span>
                      </div>
                    </div>

                    {/* Quotation Validity Footer */}
                    <div className="flex items-center justify-between text-[11px] text-blue-200 pt-1">
                      <span>Quotation Valid Until:</span>
                      <span className="font-bold text-white">
                        {validUntilDate || computeValidUntilFromDays(validityDays)} ({validityDays}d)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* STICKY BOTTOM ACTION FOOTER                                  */}
            {/* ============================================================ */}
            <div className="shrink-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Grand Total: <strong className="text-[#1E3A8A]">₱{grandTotal.toLocaleString()} PHP</strong> • 50% Deposit:{' '}
                  <strong className="text-orange-600">₱{requiredDownpayment.toLocaleString()} PHP</strong>
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="text-xs font-semibold h-9 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPreviewMode(true)}
                  className="text-xs font-bold text-[#1E3A8A] border-blue-200 bg-blue-50/50 hover:bg-blue-100 h-9 px-4 gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Preview Print</span>
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  className="text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white h-9 px-5 gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Quotation to Client</span>
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
