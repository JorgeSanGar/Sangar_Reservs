import React from 'react';
import { cn } from '@/lib/utils';

const BottomTabs = ({ navItems, activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-t-md z-50 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto">
        {navItems.slice(0, 5).map(item => (
          <button
            key={item.value}
            type="button"
            className="inline-flex flex-col items-center justify-center px-2 hover:bg-gray-50"
            onClick={() => onTabChange(item.value)}
          >
            <item.icon className={cn(
              "w-6 h-6 mb-1",
              activeTab === item.value ? 'text-blue-600' : 'text-gray-500'
            )} />
            <span className={cn(
              "text-xs",
              activeTab === item.value ? 'text-blue-600 font-semibold' : 'text-gray-500'
            )}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomTabs;