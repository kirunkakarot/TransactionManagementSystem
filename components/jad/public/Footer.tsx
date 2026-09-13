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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="contact" className="relative bg-[#0F172A] border-t border-slate-800 text-slate-300 pt-16 sm:pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-14 border-b border-slate-800">
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

            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              Full-service event management and technical production company. Providing weddings, debuts, milestone anniversaries, and corporate galas with reliable web transaction workflows.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-orange-500 hover:text-white border border-slate-700 flex items-center justify-center text-slate-300 transition-all cursor-pointer"
                aria-label="Facebook"
              >
                <Globe className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-orange-500 hover:text-white border border-slate-700 flex items-center justify-center text-slate-300 transition-all cursor-pointer"
                aria-label="Instagram"
              >
                <Globe className="w-4 h-4" />
              </a>
              <a
                href="https://jadevents.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-orange-500 hover:text-white border border-slate-700 flex items-center justify-center text-slate-300 transition-all cursor-pointer"
                aria-label="Website"
              >
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Quick Navigation
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {['Home', 'Services', 'Packages', 'Availability', 'Contact'].map((item) => (
                <li key={item}>
                  <button
                    onClick={() => onNavigate(item === 'Home' ? 'hero' : item.toLowerCase())}
                    className="hover:text-white transition-colors cursor-pointer"
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
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate('services')} className="hover:text-white transition-colors">
                  Entertainment & Hosts
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('services')} className="hover:text-white transition-colors">
                  Banquet Catering
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('services')} className="hover:text-white transition-colors">
                  Thematic Event Styling
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('services')} className="hover:text-white transition-colors">
                  Photo Booth & 360 Spin
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('services')} className="hover:text-white transition-colors">
                  Photo & SDE Video
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('services')} className="hover:text-white transition-colors">
                  LED Wall & Sound System
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Headquarters */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Contact & Booking Hub
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Metro Manila • Cavite • Tagaytay • Central Luzon, Philippines</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                <span>+63 (02) 8923-JAD / 0917-889-JAD</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-400 shrink-0" />
                <span>inquiry@jadevents.ph</span>
              </div>
              <div className="pt-2">
                <button
                  onClick={onOpenInquiryModal}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-orange-400 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Request Official Callback
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Â© 2026 JAD Events. All rights reserved.</span>
            <span>•</span>
            <span>Web-Based Transaction Management System</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1 text-orange-400 hover:text-orange-300 font-semibold cursor-pointer"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};


