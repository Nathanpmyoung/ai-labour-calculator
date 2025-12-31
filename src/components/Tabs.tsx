import { useState } from 'react';
import type { ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  
  const activeContent = tabs.find(t => t.id === activeTab)?.content;
  
  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all
              ${activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }
            `}
          >
            {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeContent}
      </div>
    </div>
  );
}

