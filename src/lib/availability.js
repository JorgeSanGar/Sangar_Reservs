import { bookingService } from '@/lib/supabaseService';

export function computeFreeIntervals({ date, workingHours, bookings, slotGranularityMin = 30 }) {
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Get working hours for the specific day
  const dayIndex = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0 format
  const dayKey = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][dayIndex];
  const dayWorkingHours = workingHours[dayKey];

  if (!dayWorkingHours || !dayWorkingHours.open || !dayWorkingHours.close) {
    return [];
  }

  // Convert working hours to minutes
  const startMinutes = timeToMinutes(dayWorkingHours.open);
  const endMinutes = timeToMinutes(dayWorkingHours.close);

  if (startMinutes === null || endMinutes === null) {
    return [];
  }

  // Convert bookings to minute intervals and sort them
  const bookedIntervals = bookings
    .filter(booking => {
      const bookingDate = new Date(booking.start_time);
      return bookingDate.toDateString() === date.toDateString() && 
             ['pending', 'confirmed', 'in_service'].includes(booking.status);
    })
    .map(booking => ({
      start: timeToMinutes(new Date(booking.start_time).toTimeString().slice(0, 5)),
      end: timeToMinutes(new Date(booking.end_time).toTimeString().slice(0, 5))
    }))
    .filter(interval => interval.start !== null && interval.end !== null)
    .sort((a, b) => a.start - b.start);

  // Add breaks to booked intervals
  const breaks = (dayWorkingHours.breaks || []).map(b => ({
    start: timeToMinutes(b.start),
    end: timeToMinutes(b.end)
  }));

  const allBusyIntervals = [...bookedIntervals, ...breaks].sort((a, b) => a.start - b.start);

  // Merge overlapping intervals
  const mergedIntervals = [];
  for (const interval of allBusyIntervals) {
    if (mergedIntervals.length === 0 || mergedIntervals[mergedIntervals.length - 1].end < interval.start) {
      mergedIntervals.push(interval);
    } else {
      mergedIntervals[mergedIntervals.length - 1].end = Math.max(mergedIntervals[mergedIntervals.length - 1].end, interval.end);
    }
  }

  // Find free intervals
  const freeIntervals = [];
  let currentStart = startMinutes;

  // If it's today, don't allow booking in the past
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    currentStart = Math.max(currentStart, currentMinutes);
  }

  for (const bookedInterval of mergedIntervals) {
    if (currentStart < bookedInterval.start) {
      freeIntervals.push({
        start: currentStart,
        end: bookedInterval.start
      });
    }
    currentStart = Math.max(currentStart, bookedInterval.end);
  }

  // Add final interval if there's time left
  if (currentStart < endMinutes) {
    freeIntervals.push({
      start: currentStart,
      end: endMinutes
    });
  }

  // Generate time slots based on granularity
  const freeSlots = [];
  for (const interval of freeIntervals) {
    for (let time = interval.start; time + slotGranularityMin <= interval.end; time += slotGranularityMin) {
      const start = new Date(date);
      start.setHours(Math.floor(time / 60), time % 60, 0, 0);
      
      const end = new Date(date);
      const endTime = time + slotGranularityMin;
      end.setHours(Math.floor(endTime / 60), endTime % 60, 0, 0);

      freeSlots.push({
        start,
        end,
        durationMin: slotGranularityMin
      });
    }
  }

  return freeSlots;
}

/**
 * Función optimizada para verificar disponibilidad usando Supabase RPC
 * Utiliza el índice GiST compuesto (resource_id, timespan) para consultas eficientes
 * de solapamiento por recurso específico
 */
export async function checkAvailabilityOptimized(orgId, serviceId, date, payload = null, resourceScope = null, stepMin = 15) {
  try {
    const { data, error } = await bookingService.checkAvailability(
      orgId, 
      serviceId, 
      date, 
      payload, 
      resourceScope, 
      stepMin
    );
    
    if (error) {
      console.error('Error checking availability:', error);
      return [];
    }
    
    // Convertir los resultados a formato compatible con la UI
    return data
      .filter(slot => slot.ok)
      .map(slot => ({
        start: new Date(slot.start_at),
        end: new Date(slot.end_at),
        durationMin: Math.round((new Date(slot.end_at) - new Date(slot.start_at)) / (1000 * 60))
      }));
  } catch (error) {
    console.error('Error in checkAvailabilityOptimized:', error);
    return [];
  }
}

/**
 * Función para verificar conflictos de recursos usando el índice GiST compuesto optimizado
 * Esta función aprovecha el índice idx_booking_resources_gist para consultas eficientes
 */
export async function checkResourceConflicts(resourceId, startTime, endTime) {
  try {
    // Esta consulta aprovechará el índice GiST compuesto idx_booking_resources_gist
    // para una búsqueda eficiente por resource_id + solapamiento temporal
    const { data, error } = await bookingService.checkResourceAvailability(
      resourceId, 
      startTime, 
      endTime
    );
    
    if (error) {
      console.error('Error checking resource conflicts:', error);
      return { hasConflict: false, conflicts: [] };
    }
    
    return {
      hasConflict: data.length > 0,
      conflicts: data,
      conflictDetails: data.map(conflict => ({
        bookingId: conflict.booking_id,
        customerName: conflict.bookings?.customer_name,
        timespan: conflict.timespan,
        status: conflict.bookings?.status
      }))
    };
  } catch (error) {
    console.error('Error in checkResourceConflicts:', error);
    return { hasConflict: false, conflicts: [] };
  }
}

/**
 * Función para verificar disponibilidad de múltiples recursos simultáneamente
 * Optimizada para usar el índice GiST en consultas batch
 */
export async function checkMultipleResourcesAvailability(resourceIds, startTime, endTime) {
  try {
    const { data, error } = await bookingService.checkMultipleResourcesAvailability(
      resourceIds,
      startTime,
      endTime
    );
    
    if (error) {
      console.error('Error checking multiple resources availability:', error);
      return { available: [], conflicts: [] };
    }
    
    const conflictingResourceIds = new Set(data.map(conflict => conflict.resource_id));
    const availableResourceIds = resourceIds.filter(id => !conflictingResourceIds.has(id));
    
    return {
      available: availableResourceIds,
      conflicts: data,
      summary: {
        total: resourceIds.length,
        available: availableResourceIds.length,
        conflicting: conflictingResourceIds.size
      }
    };
  } catch (error) {
    console.error('Error in checkMultipleResourcesAvailability:', error);
    return { available: [], conflicts: [] };
  }
}