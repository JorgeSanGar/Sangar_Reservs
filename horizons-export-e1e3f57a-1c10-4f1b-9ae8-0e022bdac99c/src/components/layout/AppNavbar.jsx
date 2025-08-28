import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Wrench } from 'lucide-react';

const AppNavbar = ({ onMenuClick, shopName }) => {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 md:hidden">
      <div className="px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 truncate">{shopName}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <Menu className="w-6 h-6" />
        </Button>
      </div>
    </header>
  );
};

export default AppNavbar;