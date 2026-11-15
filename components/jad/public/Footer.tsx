import React from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Globe,
  ArrowUp
} from 'lucide-react';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
  onOpenInquiryModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenInquiryModal }) => {
  const scrollToTop = () => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <footer
      id="contact"
      className="scroll-mt-24 relative bg-[#0F172A] border-t border-slate-800 text-slate-300 pt-14 sm:pt-20 pb-10 sm:pb-12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-9 lg:gap-8 pb-12 sm:pb-14 border-b border-slate-800">
          {/* Brand Col (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center">
                <img
                  src="/jadlogo.png"
                  alt="JAD Events Logo"
                  className="w-full h-full object-contain drop-shadow-md brightness-110"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-lg text-white tracking-wider">
                  JAD EVENTS
                </span>
                <span className="text-xs text-orange-400 font-medium -mt-1">
                  Making Moments Memorable
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-sm leading-relaxed">
              Full-service event management and technical production company. Providing weddings, debuts, milestone anniversaries, and corporate galas with reliable web transaction workflows.
            </p>

            {/* Distinct Social & Official Website Links */}
            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-orange-500 hover:text-white border border-slate-700 flex items-center justify-center text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                aria-label="JAD Events on Facebook"
                title="Facebook"
              >
                <svg
                  className="w-4 h-4 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-orange-500 hover:text-white border border-slate-700 flex items-center justify-center text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                aria-label="JAD Events on Instagram"
                title="Instagram"
              >
                <svg
                  className="w-4 h-4 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>

              <a
                href="https://jadevents.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-orange-500 hover:text-white border border-slate-700 flex items-center justify-center text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                aria-label="JAD Events Official Website"
                title="Official Website"
              >
                <Globe className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Quick Navigation
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              {['Home', 'Services', 'Packages', 'Availability', 'Contact'].map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item === 'Home' ? 'hero' : item.toLowerCase())}
                    className="py-1 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-xs"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Event Services
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              {[
                'Entertainment & Hosts',
                'Banquet Catering',
                'Thematic Event Styling',
                'Photo Booth & 360 Spin',
                'Photo & SDE Video',
                'LED Wall & Sound System',
              ].map((srvName) => (
                <li key={srvName}>
                  <button
                    type="button"
                    onClick={() => onNavigate('services')}
                    className="py-1 text-left hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-xs"
                  >
                    {srvName}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Headquarters */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Contact & Booking Hub
            </h4>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>275 Alegre Street, Balogo, Sorsogon City</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                <a
                  href="tel:+639491152443"
                  className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-xs"
                >
                  +63 9491152443
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                <a
                  href="mailto:inquiry@jadevents.ph"
                  className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-xs"
                >
                  inquiry@jadevents.ph
                </a>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenInquiryModal}
                  className="w-full min-h-10 py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-orange-400 hover:text-orange-300 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  Request Official Callback
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
            <span>© 2026 JAD Events. All rights reserved.</span>
            <span className="hidden sm:inline" aria-hidden="true">•</span>
            <span>Web-Based Transaction Management System</span>
          </div>

          <div className="flex items-center gap-5 sm:gap-6">
            <button
              type="button"
              onClick={() => onNavigate('hero')}
              className="hover:text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-xs"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onNavigate('hero')}
              className="hover:text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-xs"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1 text-orange-400 hover:text-orange-300 font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-xs py-1"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
