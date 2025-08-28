import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';
import { useMediaQuery } from '@/hooks/use-media-query';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    const savedUser = localStorage.getItem('tire_shop_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.shopId) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('tire_shop_user');
        }
      } catch (error) {
        localStorage.removeItem('tire_shop_user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('tire_shop_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('tire_shop_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>ReservaSangar - Planificación Inteligente de Talleres</title>
        <meta name="description" content="Sistema completo de planificación y gestión para talleres de neumáticos con calendario inteligente, gestión de recursos y KPIs." />
        <meta property="og:title" content="ReservaSangar - Planificación Inteligente de Talleres" />
        <meta property="og:description" content="Sistema completo de planificación y gestión para talleres de neumáticos con calendario inteligente, gestión de recursos y KPIs." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Helmet>
      
      <div className="min-h-screen bg-gray-50">
        <AnimatePresence mode="wait">
          {!user ? (
            <AuthPage key="auth" onLogin={handleLogin} />
          ) : (
            <Dashboard key="dashboard" user={user} onLogout={handleLogout} />
          )}
        </AnimatePresence>
        <Toaster />
      </div>
    </>
  );
}

export default App;