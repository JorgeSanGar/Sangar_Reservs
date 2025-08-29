import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Calendar, Settings, BarChart3, Wrench, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import HomeView from '@/components/HomeView';
import CalendarView from '@/components/CalendarView';
import ServicesView from '@/components/ServicesView';
import ResourcesView from '@/components/ResourcesView';
import KPIView from '@/components/KPIView';
import SettingsView from '@/components/SettingsView';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { loading, orgData, userRole } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const path = location.pathname.substring(1);
    return path === '' ? 'home' : path;
  };

  const [activeTab, setActiveTab] = useState(getActiveTab);

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  const handleTabChange = (tabValue) => {
    setActiveTab(tabValue);
    navigate(tabValue === 'home' ? '/' : `/${tabValue}`);
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!orgData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No tienes acceso a ningún taller</h2>
          <p className="text-gray-600 mb-6">Contacta con un administrador para que te invite a un taller.</p>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  const TABS_CONFIG = [
    { value: 'home', label: 'Inicio', icon: Home, component: HomeView },
    { value: 'disponibilidad', label: 'Disponibilidad', icon: Calendar, component: CalendarView },
    { value: 'services', label: 'Servicios', icon: Plus, component: ServicesView },
    { value: 'resources', label: 'Recursos', icon: Wrench, component: ResourcesView },
    { value: 'kpis', label: 'KPIs', icon: BarChart3, component: KPIView, managerOnly: true },
    { value: 'settings', label: 'Configuración', icon: Settings, component: SettingsView, managerOnly: true },
  ];

  const visibleTabs = TABS_CONFIG.filter(tab => !tab.managerOnly || userRole === 'manager');
  const ActiveComponent = TABS_CONFIG.find(tab => tab.value === activeTab)?.component || HomeView;

  return (
    <ResponsiveLayout
      user={user}
      shopName={orgData.name}
      userRole={userRole}
      onLogout={handleLogout}
      navItems={visibleTabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.3 }}
        className="p-4 md:p-6"
      >
        <ActiveComponent />
      </motion.div>
    </ResponsiveLayout>
  );
};

export default Dashboard;