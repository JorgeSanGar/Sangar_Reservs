import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Calendar, Settings, BarChart3, Wrench, Plus } from 'lucide-react';
import HomeView from '@/components/HomeView';
import CalendarView from '@/components/CalendarView';
import ServicesView from '@/components/ServicesView';
import ResourcesView from '@/components/ResourcesView';
import KPIView from '@/components/KPIView';
import SettingsView from '@/components/SettingsView';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';

const Dashboard = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [shopData, setShopData] = useState(null);

  const defaultWorkingHours = {
    mon: { open: "09:00", close: "18:00", breaks: [] },
    tue: { open: "09:00", close: "18:00", breaks: [] },
    wed: { open: "09:00", close: "18:00", breaks: [] },
    thu: { open: "09:00", close: "18:00", breaks: [] },
    fri: { open: "09:00", close: "18:00", breaks: [] },
    sat: { open: "10:00", close: "14:00", breaks: [] },
    sun: { open: null, close: null, breaks: [] }
  };
  
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

  useEffect(() => {
    loadShopData();
  }, [user]);

  const loadShopData = () => {
    const shops = JSON.parse(localStorage.getItem('tire_shops') || '{}');
    let shop = Object.values(shops).find(s => s.id === user.shopId);
    
    if (shop) {
      if (!shop.workingHours) {
        shop.workingHours = defaultWorkingHours;
      } else {
        Object.keys(defaultWorkingHours).forEach(day => {
          if (!shop.workingHours[day]) {
             shop.workingHours[day] = defaultWorkingHours[day];
          }
          if (!shop.workingHours[day].breaks) {
            shop.workingHours[day].breaks = [];
          }
        });
      }
      if (!shop.audit) shop.audit = [];
      if (!shop.services) shop.services = [];
      if (!shop.resources) shop.resources = [];
      if (!shop.bookings) shop.bookings = [];

      setShopData(shop);
    }
  };

  const updateShopData = (updatedShop) => {
    const shops = JSON.parse(localStorage.getItem('tire_shops') || '{}');
    const shopKey = Object.keys(shops).find(key => shops[key].id === user.shopId);
    if (shopKey) {
      shops[shopKey] = updatedShop;
      localStorage.setItem('tire_shops', JSON.stringify(shops));
      setShopData(updatedShop);
    }
  };

  if (!shopData) {
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

  const TABS_CONFIG = [
    { value: 'home', label: 'Inicio', icon: Home, component: HomeView },
    { value: 'disponibilidad', label: 'Disponibilidad', icon: Calendar, component: CalendarView },
    { value: 'services', label: 'Servicios', icon: Plus, component: ServicesView },
    { value: 'resources', label: 'Recursos', icon: Wrench, component: ResourcesView },
    { value: 'kpis', label: 'KPIs', icon: BarChart3, component: KPIView, directorOnly: true },
    { value: 'settings', label: 'Configuración', icon: Settings, component: SettingsView, directorOnly: true },
  ];

  const visibleTabs = TABS_CONFIG.filter(tab => !tab.directorOnly || user.role === 'director');
  const ActiveComponent = TABS_CONFIG.find(tab => tab.value === activeTab)?.component || HomeView;

  return (
    <ResponsiveLayout
      user={user}
      shopName={shopData.name}
      onLogout={onLogout}
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
        <ActiveComponent 
          user={user} 
          shopData={shopData} 
          onUpdateShop={updateShopData}
          setActiveTab={handleTabChange}
        />
      </motion.div>
    </ResponsiveLayout>
  );
};

export default Dashboard;