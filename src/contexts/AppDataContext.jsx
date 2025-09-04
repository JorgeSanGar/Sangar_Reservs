import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { 
  orgService, 
  memberService, 
  serviceService, 
  resourceService, 
  bookingService,
  workingHoursService,
  utilService 
} from '@/lib/supabaseService';
import { useToast } from '@/components/ui/use-toast';

const AppDataContext = createContext(undefined);

export const AppDataProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [services, setServices] = useState([]);
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [workingHours, setWorkingHours] = useState({});
  const [members, setMembers] = useState([]);

  // Load user's organization data
  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      resetData();
    }
  }, [user]);

  const resetData = () => {
    setOrgData(null);
    setUserRole(null);
    setServices([]);
    setResources([]);
    setBookings([]);
    setWorkingHours({});
    setMembers([]);
    setLoading(false);
  };

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Get user's organizations
      const { data: userOrgs, error: orgsError } = await orgService.getUserOrganizations(user.id);
      if (orgsError) {
        console.error('Error loading user organizations:', orgsError);
        toast({
          title: "Error",
          description: await utilService.handleSupabaseError(orgsError),
          variant: "destructive"
        });
        return;
      }

      if (!userOrgs || userOrgs.length === 0) {
        // User has no organizations
        setLoading(false);
        return;
      }

      // For now, use the first organization
      const userOrg = userOrgs[0];
      setOrgData(userOrg.orgs);
      setUserRole(userOrg.role);

      // Load organization data
      await Promise.all([
        loadServices(userOrg.org_id),
        loadResources(userOrg.org_id),
        loadBookings(userOrg.org_id),
        loadWorkingHours(userOrg.org_id),
        loadMembers(userOrg.org_id)
      ]);

    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos del usuario",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async (orgId) => {
    const { data, error } = await serviceService.getServices(orgId);
    if (error) {
      console.error('Error loading services:', error);
      return;
    }
    setServices(data || []);
  };

  const loadResources = async (orgId) => {
    const { data, error } = await resourceService.getResources(orgId);
    if (error) {
      console.error('Error loading resources:', error);
      return;
    }
    setResources(data || []);
  };

  const loadBookings = async (orgId, startDate = null, endDate = null) => {
    const { data, error } = await bookingService.getBookings(orgId, startDate, endDate);
    if (error) {
      console.error('Error loading bookings:', error);
      return;
    }
    setBookings(data || []);
  };

  const loadWorkingHours = async (orgId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await workingHoursService.getWorkingHours(orgId, today);
    if (error) {
      console.error('Error loading working hours:', error);
      return;
    }
    
    // Convert to the format expected by the UI
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const formattedHours = {};
    
    dayNames.forEach((day, index) => {
      const dayData = data?.find(wh => wh.weekday === index);
      formattedHours[day] = dayData ? {
        open: dayData.open_time,
        close: dayData.close_time,
        breaks: dayData.breaks || []
      } : {
        open: null,
        close: null,
        breaks: []
      };
    });
    
    setWorkingHours(formattedHours);
  };

  const loadMembers = async (orgId) => {
    const { data, error } = await memberService.getOrgMembers(orgId);
    if (error) {
      console.error('Error loading members:', error);
      return;
    }
    setMembers(data || []);
  };

  // CRUD operations
  const createService = async (serviceData) => {
    if (!orgData) return { error: 'No organization selected' };
    
    const { data, error } = await serviceService.createService({
      ...serviceData,
      org_id: orgData.id
    });
    
    if (!error && data) {
      setServices(prev => [...prev, data]);
      toast({
        title: "Servicio creado",
        description: `${data.name} ha sido añadido exitosamente.`
      });
    } else if (error) {
      toast({
        title: "Error",
        description: await utilService.handleSupabaseError(error),
        variant: "destructive"
      });
    }
    
    return { data, error };
  };

  const updateService = async (serviceId, updates) => {
    const { data, error } = await serviceService.updateService(serviceId, updates);
    
    if (!error && data) {
      setServices(prev => prev.map(s => s.id === serviceId ? data : s));
      toast({
        title: "Servicio actualizado",
        description: "Los cambios han sido guardados."
      });
    } else if (error) {
      toast({
        title: "Error",
        description: await utilService.handleSupabaseError(error),
        variant: "destructive"
      });
    }
    
    return { data, error };
  };

  const deleteService = async (serviceId) => {
    const { error } = await serviceService.deleteService(serviceId);
    
    if (!error) {
      setServices(prev => prev.filter(s => s.id !== serviceId));
      toast({
        title: "Servicio eliminado",
        description: "El servicio ha sido eliminado exitosamente."
      });
    } else {
      toast({
        title: "Error",
        description: await utilService.handleSupabaseError(error),
        variant: "destructive"
      });
    }
    
    return { error };
  };

  const createResource = async (resourceData) => {
    if (!orgData) return { error: 'No organization selected' };
    
    const { data, error } = await resourceService.createResource({
      ...resourceData,
      org_id: orgData.id
    });
    
    if (!error && data) {
      setResources(prev => [...prev, data]);
      toast({
        title: "Recurso creado",
        description: `${data.name} ha sido añadido exitosamente.`
      });
    } else if (error) {
      toast({
        title: "Error",
        description: await utilService.handleSupabaseError(error),
        variant: "destructive"
      });
    }
    
    return { data, error };
  };

  const updateResource = async (resourceId, updates) => {
    const { data, error } = await resourceService.updateResource(resourceId, updates);
    
    if (!error && data) {
      setResources(prev => prev.map(r => r.id === resourceId ? data : r));
      toast({
        title: "Recurso actualizado",
        description: "Los cambios han sido guardados."
      });
    } else if (error) {
      toast({
        title: "Error",
        description: await utilService.handleSupabaseError(error),
        variant: "destructive"
      });
    }
    
    return { data, error };
  };

  const deleteResource = async (resourceId) => {
    const { error } = await resourceService.deleteResource(resourceId);
    
    if (!error) {
      setResources(prev => prev.filter(r => r.id !== resourceId));
      toast({
        title: "Recurso eliminado",
        description: "El recurso ha sido eliminado exitosamente."
      });
    } else {
      toast({
        title: "Error",
        description: await utilService.handleSupabaseError(error),
        variant: "destructive"
      });
    }
    
    return { error };
  };

  const createBooking = async (serviceId, startTime, customerData, payload = null) => {
    if (!orgData) return { error: 'No organization selected' };
    
    const bookingData = {
      name: customerData.name,
      email: customerData.email || '',
      phone: customerData.phone || '',
      visit_mode: customerData.visitMode || 'wait'
    };
    
    const { data, error } = await bookingService.createBooking(
      orgData.id,
      serviceId,
      startTime,
      bookingData,
      payload
    );
    
    if (!error) {
      // Reload bookings to get the complete data
      await loadBookings(orgData.id);
      toast({
        title: "Reserva creada",
        description: "La reserva ha sido creada exitosamente."
      });
    } else {
      toast({
        title: "Error",
        description: await utilService.handleSupabaseError(error),
        variant: "destructive"
      });
    }
    
    return { data, error };
  };

  const updateBooking = async (bookingId, serviceId = null, startTime = null, customerData = null, payload = null) => {
    const { data, error } = await bookingService.updateBooking(
      bookingId,
      serviceId,
      startTime,
      customerData,
      payload
    );
    
    if (!error) {
      // Reload bookings to get the updated data
      await loadBookings(orgData.id);
      toast({
        title: "Reserva actualizada",
        description: "Los cambios han sido guardados."
      });
    } else {
      toast({
        title: "Error",
        description: await utilService.handleSupabaseError(error),
        variant: "destructive"
      });
    }
    
    return { data, error };
  };

  const deleteBooking = async (bookingId, reason = null) => {
    const { data, error } = await bookingService.deleteBooking(bookingId, reason);
    
    if (!error) {
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      toast({
        title: "Reserva cancelada",
        description: "La reserva ha sido cancelada exitosamente."
      });
    } else {
      toast({
        title: "Error",
        description: await utilService.handleSupabaseError(error),
        variant: "destructive"
      });
    }
    
    return { data, error };
  };

  const saveWorkingHours = async (workingHoursData) => {
    if (!orgData) return { error: 'No organization selected' };
    
    // Convert UI format to Supabase format
    const items = [];
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    
    dayNames.forEach((day, weekday) => {
      const dayData = workingHoursData[day];
      if (dayData && dayData.open && dayData.close) {
        items.push({
          weekday,
          open_time: dayData.open,
          close_time: dayData.close,
          breaks: dayData.breaks || [],
          resource_id: null
        });
      }
    });
    
    const { data, error } = await workingHoursService.setWorkingHours(
      orgData.id,
      new Date().toISOString().split('T')[0], // effective_from: today
      null, // effective_to
      items
    );
    
    if (!error) {
      setWorkingHours(workingHoursData);
      toast({
        title: "Horario guardado",
        description: "El horario del taller ha sido actualizado."
      });
    } else {
      toast({
        title: "Error",
        description: await utilService.handleSupabaseError(error),
        variant: "destructive"
      });
    }
    
    return { data, error };
  };

  const value = {
    loading,
    orgData,
    userRole,
    services,
    resources,
    bookings,
    workingHours,
    members,
    
    // CRUD operations
    createService,
    updateService,
    deleteService,
    createResource,
    updateResource,
    deleteResource,
    createBooking,
    updateBooking,
    deleteBooking,
    saveWorkingHours,
    
    // Refresh functions
    refreshServices: () => orgData && loadServices(orgData.id),
    refreshResources: () => orgData && loadResources(orgData.id),
    refreshBookings: () => orgData && loadBookings(orgData.id),
    refreshWorkingHours: () => orgData && loadWorkingHours(orgData.id),
    refreshMembers: () => orgData && loadMembers(orgData.id),
    refreshAll: loadUserData
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};