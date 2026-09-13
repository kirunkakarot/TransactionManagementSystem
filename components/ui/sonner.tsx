import * as React from 'react';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:pr-10',
          description: 'group-[.toast]:text-slate-600 group-[.toast]:text-xs',
          actionButton:
            'group-[.toast]:bg-[#1E3A8A] group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-700',
          closeButton:
            'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600 group-[.toast]:border-slate-300 group-[.toast]:hover:bg-slate-200 group-[.toast]:hover:text-slate-900 group-[.toast]:transition-colors group-[.toast]:cursor-pointer group-[.toast]:shadow-xs group-[.toast]:w-6 group-[.toast]:h-6 group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center group-[.toast]:rounded-full',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
