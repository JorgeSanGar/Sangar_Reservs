import { supabase } from '@/lib/customSupabaseClient';

// ==================== AUTHENTICATION ====================
export const authService = {
  async signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return { data, error };
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  }
};

// ==================== ORGANIZATIONS ====================
export const orgService = {
  async createOrganization(orgData) {
    const { data, error } = await supabase
      .from('orgs')
      .insert([{
        name: orgData.name,
        timezone: 'Europe/Madrid',
        est_margin_pct: 7.5,
        est_hist_weight: 0.40,
        est_outlier_sigma: 2.5,
        est_min_samples: 5
      }])
      .select()
      .single();
    
    return { data, error };
  },

  async getOrganization(orgId) {
    const { data, error } = await supabase
      .from('orgs')
      .select('*')
      .eq('id', orgId)
      .single();
    
    return { data, error };
  },

  async getUserOrganizations(userId) {
    const { data, error } = await supabase
      .from('org_members')
      .select(`
        org_id,
        role,
        orgs (
          id,
          name,
          timezone,
          created_at
        )
      `)
      .eq('user_id', userId);
    
    return { data, error };
  }
};

// ==================== ORGANIZATION MEMBERS ====================
export const memberService = {
  async addMember(orgId, userId, role = 'worker') {
    const { data, error } = await supabase
      .from('org_members')
      .insert([{
        org_id: orgId,
        user_id: userId,
        role: role
      }])
      .select()
      .single();
    
    return { data, error };
  },

  async getOrgMembers(orgId) {
    const { data, error } = await supabase
      .from('org_members')
      .select(`
        user_id,
        role,
        joined_at,
        users (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('org_id', orgId);
    
    return { data, error };
  },

  async removeMember(orgId, userId) {
    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', userId);
    
    return { error };
  }
};

// ==================== SERVICES ====================
export const serviceService = {
  async getServices(orgId) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('org_id', orgId)
      .order('name');
    
    return { data, error };
  },

  async createService(serviceData) {
    const { data, error } = await supabase
      .from('services')
      .insert([serviceData])
      .select()
      .single();
    
    return { data, error };
  },

  async updateService(serviceId, updates) {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', serviceId)
      .select()
      .single();
    
    return { data, error };
  },

  async deleteService(serviceId) {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);
    
    return { error };
  }
};

// ==================== RESOURCES ====================
export const resourceService = {
  async getResources(orgId) {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('org_id', orgId)
      .order('name');
    
    return { data, error };
  },

  async createResource(resourceData) {
    const { data, error } = await supabase
      .from('resources')
      .insert([resourceData])
      .select()
      .single();
    
    return { data, error };
  },

  async updateResource(resourceId, updates) {
    const { data, error } = await supabase
      .from('resources')
      .update(updates)
      .eq('id', resourceId)
      .select()
      .single();
    
    return { data, error };
  },

  async deleteResource(resourceId) {
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId);
    
    return { error };
  }
};

// ==================== BOOKINGS ====================
export const bookingService = {
  async getBookings(orgId, startDate = null, endDate = null) {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        services (
          id,
          name,
          category
        ),
        booking_resources (
          resource_id,
          resources (
            id,
            name,
            type
          )
        )
      `)
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('start_time');

    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('start_time', endDate);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async createBooking(orgId, serviceId, startTime, customerData, payload = null) {
    const { data, error } = await supabase.rpc('create_booking_locked', {
      p_org_id: orgId,
      p_service_id: serviceId,
      p_start: startTime,
      p_customer: customerData,
      p_payload: payload
    });
    
    return { data, error };
  },

  async updateBooking(bookingId, serviceId = null, startTime = null, customerData = null, payload = null) {
    const { data, error } = await supabase.rpc('update_booking', {
      p_b: bookingId,
      p_s: serviceId,
      p_st: startTime,
      p_c: customerData,
      p_p: payload
    });
    
    return { data, error };
  },

  async deleteBooking(bookingId, reason = null) {
    const { data, error } = await supabase.rpc('soft_delete_booking', {
      p_b: bookingId,
      p_reason: reason
    });
    
    return { data, error };
  },

  async checkAvailability(orgId, serviceId, date, payload = null, resourceScope = null, stepMin = 15) {
    const { data, error } = await supabase.rpc('check_availability', {
      p_org_id: orgId,
      p_service_id: serviceId,
      p_date: date,
      p_payload: payload,
      p_resource_scope: resourceScope,
      p_step_min: stepMin
    });
    
    return { data, error };
  },

  async checkResourceAvailability(resourceId, startTime, endTime) {
    // Esta consulta aprovechará el índice GiST compuesto optimizado
    // Utiliza el índice idx_booking_resources_gist (resource_id, timespan)
    const { data, error } = await supabase
      .from('booking_resources')
      .select(`
        booking_id, 
        timespan,
        bookings (
          id,
          customer_name,
          start_time,
          end_time,
          status
        )
      `)
      .eq('resource_id', resourceId)
      .overlaps('timespan', `[${startTime.toISOString()},${endTime.toISOString()})`);
    
    return { data, error };
  },

  async getResourceUtilization(orgId, startDate, endDate) {
    // Consulta optimizada que aprovecha índices GiST para rangos temporales
    const { data, error } = await supabase
      .from('booking_resources')
      .select(`
        resource_id,
        timespan,
        resources (
          id,
          name,
          type,
          org_id
        ),
        bookings (
          id,
          customer_name,
          status,
          start_time,
          end_time,
          services (
            id,
            name
          )
        )
      `)
      .eq('resources.org_id', orgId)
      .overlaps('timespan', `[${startDate.toISOString()},${endDate.toISOString()}]`);
    
    return { data, error };
  },

  async checkMultipleResourcesAvailability(resourceIds, startTime, endTime) {
    // Consulta optimizada para verificar disponibilidad de múltiples recursos
    // Aprovecha el índice GiST para cada resource_id
    const { data, error } = await supabase
      .from('booking_resources')
      .select(`
        resource_id,
        booking_id,
        timespan,
        bookings (
          customer_name,
          status
        )
      `)
      .in('resource_id', resourceIds)
      .overlaps('timespan', `[${startTime.toISOString()},${endTime.toISOString()})`);
    
    return { data, error };
  }
};

// ==================== WORKING HOURS ====================
export const workingHoursService = {
  async getWorkingHours(orgId, date) {
    const { data, error } = await supabase.rpc('get_working_hours', {
      p_org_id: orgId,
      p_date: date
    });
    
    return { data, error };
  },

  async setWorkingHours(orgId, effectiveFrom, items, effectiveTo = null, force = false) {
    const { data, error } = await supabase.rpc('set_working_hours', {
      p_org_id: orgId,
      p_effective_from: effectiveFrom,
      p_effective_to: effectiveTo,
      p_items: items,
      p_force: force
    });
    
    return { data, error };
  }
};

// ==================== DURATION ESTIMATION ====================
export const estimationService = {
  async estimateDuration(serviceId, payload) {
    const { data, error } = await supabase.rpc('estimate_duration', {
      p_service_id: serviceId,
      payload: payload
    });
    
    return { data, error };
  },

  async estimateDurationLearned(serviceId, payload) {
    const { data, error } = await supabase.rpc('estimate_duration_learned', {
      p_service_id: serviceId,
      p_payload: payload
    });
    
    return { data, error };
  },

  async recordActualDuration(bookingId, actualMinutes) {
    const { data, error } = await supabase.rpc('record_actual_duration', {
      p_booking_id: bookingId,
      p_actual_minutes: actualMinutes
    });
    
    return { data, error };
  }
};

// ==================== INVITE CODES ====================
export const inviteService = {
  async createInviteCode(orgId, createdBy, expiresAt = null) {
    const code = Math.random().toString(36).substr(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('invite_codes')
      .insert([{
        code: code,
        org_id: orgId,
        created_by: createdBy,
        expires_at: expiresAt,
        used: false
      }])
      .select()
      .single();
    
    return { data, error };
  },

  async getInviteCodes(orgId) {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('org_id', orgId)
      .eq('used', false)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  async useInviteCode(code, userId) {
    const { data, error } = await supabase
      .from('invite_codes')
      .update({ 
        used: true, 
        used_by: userId, 
        used_at: new Date().toISOString() 
      })
      .eq('code', code)
      .eq('used', false)
      .select()
      .single();
    
    return { data, error };
  },

  async revokeInviteCode(codeId) {
    const { error } = await supabase
      .from('invite_codes')
      .delete()
      .eq('id', codeId);
    
    return { error };
  }
};

// ==================== ARRIVAL RECOMMENDATIONS ====================
export const arrivalService = {
  async getArrivalRecommendation(bookingId, mode = null) {
    const { data, error } = await supabase.rpc('recommend_arrival', {
      p_booking: bookingId,
      p_mode: mode
    });
    
    return { data, error };
  },

  formatArrivalMessage(recommendation) {
    if (!recommendation || recommendation.status !== 'ok') {
      return 'No se pudo calcular la recomendación de llegada';
    }

    const start = new Date(recommendation.recommended_start);
    const end = new Date(recommendation.recommended_end);
    const startTime = start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    if (recommendation.mode === 'wait') {
      return `Para no hacerte esperar, llega entre ${startTime} y ${endTime}. Te atenderemos nada más terminar el vehículo anterior.`;
    } else {
      return `Puedes dejar el coche entre ${startTime} y ${endTime}. Lo tendremos listo para tu franja reservada.`;
    }
  }
};

// ==================== UTILITY FUNCTIONS ====================
export const utilService = {
  async handleSupabaseError(error) {
    console.error('Supabase Error:', error);
    
    if (error?.code === 'PGRST116') {
      return 'No se encontraron datos';
    }
    if (error?.code === '23505') {
      return 'Ya existe un registro con estos datos';
    }
    if (error?.code === '23503') {
      return 'Error de referencia: datos relacionados no encontrados';
    }
    if (error?.message?.includes('slot_taken')) {
      return 'El horario seleccionado ya no está disponible';
    }
    if (error?.message?.includes('forbidden')) {
      return 'No tienes permisos para realizar esta acción';
    }
    
    return error?.message || 'Error desconocido';
  }
};