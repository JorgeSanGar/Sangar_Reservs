import React from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import { AppDataProvider } from '@/contexts/AppDataContext';
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';

function AppContent() {
  const { user, loading } = useAuth();

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
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence mode="wait">
        {!user ? (
          <AuthPage key="auth" />
        ) : (
          <AppDataProvider>
            <Dashboard key="dashboard" />
          </AppDataProvider>
        )}
      </AnimatePresence>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <>
      <Helmet>
        <title>ReservaSangar - Planificación Inteligente de Talleres</title>
        <meta name="description" content="Sistema completo de planificación y gestión para talleres de neumáticos con calendario inteligente, gestión de recursos y KPIs." />
        <meta property="og:title" content="ReservaSangar - Planificación Inteligente de Talleres" />
        <meta property="og:description" content="Sistema completo de planificación y gestión para talleres de neumáticos con calendario inteligente, gestión de recursos y KPIs." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Helmet>
      
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </>
  );
}

export default App;