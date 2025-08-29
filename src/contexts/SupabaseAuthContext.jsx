import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { authService, utilService } from '@/lib/supabaseService';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    
    if (session?.user) {
      // Sync user data with our users table
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .upsert({
            id: session.user.id,
            email: session.user.email,
            raw_user_meta_data: session.user.user_metadata
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error syncing user data:', error);
        }
        
        setUser(userData || session.user);
      } catch (error) {
        console.error('Error in user sync:', error);
        setUser(session.user);
      }
    } else {
      setUser(null);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signUp = useCallback(async (email, password, options = {}) => {
    const { data, error } = await authService.signUp(email, password, options);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error de Registro",
        description: await utilService.handleSupabaseError(error),
      });
    } else {
      toast({
        title: "Registro Exitoso",
        description: "Revisa tu correo para confirmar tu cuenta.",
      });
    }

    return { data, error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await authService.signIn(email, password);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error de Inicio de Sesión",
        description: await utilService.handleSupabaseError(error),
      });
    }

    return { data, error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await authService.signOut();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error al Cerrar Sesión",
        description: await utilService.handleSupabaseError(error),
      });
    }

    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }), [user, session, loading, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};