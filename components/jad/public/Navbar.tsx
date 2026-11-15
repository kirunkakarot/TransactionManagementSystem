"use client";
import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Layers, 
  Package, 
  Calendar, 
  PhoneCall, 
  Menu, 
  X, 
  LogIn, 
  ArrowRight,
  User,
  Building2,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  onOpenInquiryModal: () => void;
  onOpenAuthModal: (mode: 'login' | 'signup') => void;
  currentUser?: { role: 'client' | 'admin'; email: string } | null;
  onOpenDashboard?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
  onOpenInquiryModal,
  onOpenAuthModal,
  currentUser,
  onOpenDashboard,
  onLogout
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile/tablet menu on Escape key
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const navItems = [
    { id: 'hero', label: 'Home', icon: Home },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'availability', label: 'Availability', icon: Calendar },
    { id: 'contact', label: 'Contact', icon: PhoneCall },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-3 sm:top-5 left-0 right-0 z-50 flex justify-center px-3 sm:px-6 pointer-events-none">
      <div 
        id="jad-navbar"
        className={`pointer-events-auto w-full max-w-6xl transition-all duration-300 motion-reduce:transition-none rounded-xl border ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-2xl border-slate-200 shadow-[0_15px_35px_rgba(30,58,138,0.12)] py-2 sm:py-2.5 px-3 sm:px-5' 
            : 'bg-white/90 backdrop-blur-xl border-blue-100/80 shadow-[0_10px_30px_rgba(30,58,138,0.08)] py-2.5 sm:py-3 px-3.5 sm:px-6'
        }`}
      >
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <button 
            id="nav-logo-btn"
            type="button"
            onClick={() => handleNavClick('hero')}
            aria-label="JAD Events Home"
            className="flex items-center gap-2.5 group text-left cursor-pointer rounded-lg p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2"
          >
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center transition-transform duration-300 motion-reduce:transition-none group-hover:scale-105">
              <img 
                src="/jadlogo.png" 
                alt="JAD Events Logo" 
                className="w-full h-full object-contain drop-shadow-sm" 
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-sm sm:text-base tracking-wider text-[#1E3A8A] group-hover:text-blue-700 transition-colors">
                JAD EVENTS
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-600 font-medium tracking-tight -mt-0.5">
                Making Moments Memorable
              </span>
            </div>
          </button>

          {/* Desktop Center Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60 shadow-inner"
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'location' : undefined}
                  className={`relative flex items-center px-4 py-1.5 min-h-8 rounded-md text-xs font-semibold transition-all duration-200 motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-1 ${
                    isActive
                      ? 'text-white bg-[#1E3A8A] shadow-[0_2px_10px_rgba(30,58,138,0.25)]'
                      : 'text-slate-700 hover:text-[#1E3A8A] hover:bg-white/80'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons & Tablet/Mobile Menu Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Desktop & Tablet Auth / CTA Controls (640px+) */}
            <div className="hidden sm:flex items-center gap-2">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <Button
                    id="nav-user-dashboard-btn"
                    variant={currentUser.role === 'admin' ? 'brand' : 'default'}
                    size="sm"
                    onClick={onOpenDashboard}
                    className="font-bold gap-1.5 shadow-xs min-h-9"
                  >
                    {currentUser.role === 'admin' ? (
                      <>
                        <Building2 className="w-3.5 h-3.5 text-white" />
                        <span>Admin Dashboard</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3.5 h-3.5 text-white" />
                        <span>Customer Portal</span>
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onLogout}
                    className="w-9 h-9 rounded-lg text-slate-500 hover:text-red-600"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    id="nav-login-btn"
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenAuthModal('login')}
                    className="text-[#1E3A8A] hover:bg-blue-50 font-bold min-h-9"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#1E3A8A]" />
                    <span>Sign In</span>
                  </Button>

                  <Button
                    id="nav-get-started-btn"
                    variant="brand"
                    size="sm"
                    onClick={onOpenInquiryModal}
                    className="font-bold gap-1.5 min-h-9"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Primary Action (<640px) */}
            <Button
              id="nav-mobile-cta"
              variant="brand"
              size="sm"
              onClick={currentUser ? onOpenDashboard : onOpenInquiryModal}
              className="sm:hidden rounded-lg text-xs font-bold px-3 min-h-9"
            >
              {currentUser ? 'Dashboard' : 'Inquire'}
            </Button>

            {/* Hamburger Menu Toggle (<1024px: Mobile & Tablet) */}
            <Button
              id="nav-mobile-menu-btn"
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-9 h-9 rounded-lg text-slate-700 hover:text-[#1E3A8A] hover:bg-slate-100"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-sheet"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile & Tablet Dropdown Sheet (<1024px) */}
        {mobileMenuOpen && (
          <nav
            id="mobile-nav-sheet"
            aria-label="Mobile Navigation"
            className="lg:hidden mt-3 pt-3 border-t border-slate-200 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 pb-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    id={`mobile-nav-${item.id}`}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'location' : undefined}
                    className={`flex items-center gap-2 px-3 py-2.5 min-h-10 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${
                      isActive
                        ? 'bg-blue-50 text-[#1E3A8A] border border-blue-200'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Mobile-only Auth Row (<640px; on 640px+ these buttons are already in the header bar) */}
            <div className="flex sm:hidden items-center gap-2 pt-2 border-t border-slate-100">
              {currentUser ? (
                <>
                  <Button
                    variant={currentUser.role === 'admin' ? 'brand' : 'default'}
                    size="sm"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenDashboard) onOpenDashboard();
                    }}
                    className="flex-1 rounded-lg text-xs font-bold min-h-9"
                  >
                    <span>View {currentUser.role === 'admin' ? 'Admin' : 'Client'} Dashboard</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="rounded-lg text-xs text-red-600 min-h-9"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    id="mobile-nav-login"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuthModal('login');
                    }}
                    className="flex-1 rounded-lg text-xs font-semibold min-h-9"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Portal Login</span>
                  </Button>
                  <Button
                    id="mobile-nav-portal"
                    variant="brand"
                    size="sm"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenInquiryModal();
                    }}
                    className="flex-1 rounded-lg text-xs font-bold min-h-9"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Start Inquiry</span>
                  </Button>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};
