import React from 'react';
import { Menu, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AppNavbar = ({ onMenuClick, shopName }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between md:hidden">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-lg font-bold text-gray-900">{shopName}</h1>
      </div>
      
      <Button variant="ghost" size="sm" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>
    </header>
  );
};

export default AppNavbar;