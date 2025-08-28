import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const SideNav = ({ navItems, activeTab, onTabChange, user, shopName, onLogout }) => {
  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-40">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{shopName}</h1>
            <p className="text-xs text-gray-600">
              {user.role === 'director' ? 'Director' : 'Trabajador'} - {user.name}
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(item => (
          <Button
            key={item.value}
            variant={activeTab === item.value ? 'secondary' : 'ghost'}
            className={cn(
              "w-full justify-start",
              activeTab === item.value && "font-bold"
            )}
            onClick={() => onTabChange(item.value)}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <Button variant="outline" onClick={onLogout} className="w-full flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          Salir
        </Button>
      </div>
    </aside>
  );
};

export default SideNav;