import React from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import SideNav from '@/components/layout/SideNav';
import AppNavbar from '@/components/layout/AppNavbar';
import BottomTabs from '@/components/layout/BottomTabs';

const ResponsiveLayout = ({ children, user, shopName, userRole, onLogout, navItems, activeTab, onTabChange }) => {
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
          userRole={userRole}
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