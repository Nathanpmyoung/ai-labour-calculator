import { useState } from 'react';
import type { ReactNode } from 'react';

interface CollapsibleProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  badge?: ReactNode;
}

export function Collapsible({ 
  title, 
  subtitle, 
  defaultOpen = false, 
  children,
  badge,
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="bg-[#12121a] rounded-xl border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg 
            className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
            {subtitle && (
              <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {badge && (
          <div className="flex-shrink-0">{badge}</div>
        )}
      </button>
      
      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-zinc-800/50">
          {children}
        </div>
      )}
    </div>
  );
}

interface CollapsibleGroupProps {
  children: ReactNode;
}

export function CollapsibleGroup({ children }: CollapsibleGroupProps) {
  return (
    <div className="space-y-3">
      {children}
    </div>
  );
}

