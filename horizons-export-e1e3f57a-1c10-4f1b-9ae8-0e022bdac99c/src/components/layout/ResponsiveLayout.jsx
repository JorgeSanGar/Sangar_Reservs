import React from 'react';
import AppNavbar from '@/components/layout/AppNavbar';
import SideNav from '@/components/layout/SideNav';
import BottomTabs from '@/components/layout/BottomTabs';
import { useMediaQuery } from '@/hooks/use-media-query';

const ResponsiveLayout = ({ children, user, shopName, onLogout, navItems, activeTab, onTabChange }) => {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isSideNavOpen, setIsSideNavOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {isDesktop ? (
        <SideNav 
          navItems={navItems} 
          activeTab={activeTab} 
          onTabChange={onTabChange} 
          user={user}
          shopName={shopName}
          onLogout={onLogout}
        />
      ) : (
        <AppNavbar 
          onMenuClick={() => setIsSideNavOpen(true)} 
          shopName={shopName}
        />
      )}
      
      <main className="flex-1 md:ml-64">
        {children}
      </main>

      {!isDesktop && (
        <BottomTabs 
          navItems={navItems} 
          activeTab={activeTab} 
          onTabChange={onTabChange} 
        />
      )}
    </div>
  );
};

export default ResponsiveLayout;