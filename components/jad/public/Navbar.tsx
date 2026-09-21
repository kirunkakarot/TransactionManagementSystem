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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        className={`pointer-events-auto w-full max-w-6xl transition-all duration-300 rounded-md border ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-2xl border-slate-200 shadow-[0_15px_35px_rgba(30,58,138,0.12)] py-2 sm:py-2.5 px-3 sm:px-5' 
            : 'bg-white/85 backdrop-blur-xl border-blue-50/80 shadow-[0_10px_30px_rgba(30,58,138,0.08)] py-2.5 sm:py-3 px-3.5 sm:px-6'
        }`}
      >
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <button 
            id="nav-logo-btn"
            onClick={() => handleNavClick('hero')}
            className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none"
          >
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
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
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium tracking-tight -mt-0.5">
                Making Moments Memorable
              </span>
            </div>
          </button>

          {/* Desktop Center Navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-md border border-slate-200/60 shadow-inner">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative flex items-center px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'text-white bg-[#1E3A8A] shadow-[0_2px_10px_rgba(30,58,138,0.25)]'
                      : 'text-slate-600 hover:text-[#1E3A8A] hover:bg-white/80'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <Button
                  id="nav-user-dashboard-btn"
                  variant={currentUser.role === 'admin' ? 'brand' : 'default'}
                  size="sm"
                  onClick={onOpenDashboard}
                  className="font-bold gap-1.5 shadow-xs"
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
                  className="w-8 h-8 rounded-md text-slate-500 hover:text-red-600"
                  title="Sign Out"
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
                  className="text-[#1E3A8A] hover:bg-blue-50 font-bold"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  <span>Sign In</span>
                </Button>

                <Button
                  id="nav-get-started-btn"
                  variant="brand"
                  size="sm"
                  onClick={onOpenInquiryModal}
                  className="font-bold gap-1.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </Button>
              </>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex sm:hidden items-center gap-1.5">
            <Button
              id="nav-mobile-cta"
              variant="brand"
              size="sm"
              onClick={currentUser ? onOpenDashboard : onOpenInquiryModal}
              className="rounded-md text-xs font-bold px-3 py-1"
            >
              {currentUser ? 'Dashboard' : 'Inquire'}
            </Button>
            <Button
              id="nav-mobile-menu-btn"
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-md text-slate-700 hover:text-[#1E3A8A]"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Sheet */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-200 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-1.5 pb-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    id={`mobile-nav-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors text-left cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-[#1E3A8A] border border-blue-200'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              {currentUser ? (
                <>
                  <Button
                    variant={currentUser.role === 'admin' ? 'brand' : 'default'}
                    size="sm"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenDashboard) onOpenDashboard();
                    }}
                    className="flex-1 rounded-md text-xs font-bold"
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
                    className="rounded-md text-xs text-red-600"
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
                    className="flex-1 rounded-md text-xs font-semibold"
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
                    className="flex-1 rounded-md text-xs font-bold"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Start Inquiry</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

