@@ .. @@
+import { bookingService, workingHoursService } from '@/lib/supabaseService';
+
-export function computeFreeIntervals({ date, workingHours, bookings, slotGranularityMin = 30 }) {
+export async function computeFreeIntervals({ orgId, date, slotGranularityMin = 30 }) {
+  try {
+    // Get working hours from Supabase
+    const { data: workingHoursData, error: whError } = await workingHoursService.getWorkingHours(orgId, date);
+    if (whError) {
+      console.error('Error fetching working hours:', whError);
+      return [];
+    }
+
+    // Get bookings for the date from Supabase
+    const startOfDay = new Date(date);
+    startOfDay.setHours(0, 0, 0, 0);
+    const endOfDay = new Date(date);
+    endOfDay.setHours(23, 59, 59, 999);
+    
+    const { data: bookingsData, error: bookingsError } = await bookingService.getBookings(
+      orgId, 
+      startOfDay.toISOString(), 
+      endOfDay.toISOString()
+    );
+    if (bookingsError) {
+      console.error('Error fetching bookings:', bookingsError);
+      return [];
+    }
+
+    // Convert Supabase data to the format expected by the existing logic
+    const workingHours = {};
+    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
+    
+    workingHoursData.forEach(wh => {
+      const dayKey = dayNames[wh.weekday];
+      if (!workingHours[dayKey]) {
+        workingHours[dayKey] = {
+          open: wh.open_time,
+          close: wh.close_time,
+          breaks: wh.breaks || []
+        };
+      }
+    });
+
+    const bookings = bookingsData.map(booking => ({
+      date: booking.start_time.split('T')[0],
+      startTime: booking.start_time.split('T')[1].substring(0, 5),
+      endTime: booking.end_time.split('T')[1].substring(0, 5),
+      status: booking.status
+    }));
+
+    // Use existing logic with Supabase data
+    return computeFreeIntervalsLocal({ date, workingHours, bookings, slotGranularityMin });
+  } catch (error) {
+    console.error('Error in computeFreeIntervals:', error);
+    return [];
+  }
+}
+
+// Renamed original function for local computation
+function computeFreeIntervalsLocal({ date, workingHours, bookings, slotGranularityMin = 30 }) {
   const timeToMinutes = (timeStr) => {
     if (!timeStr) return null;
     const [hours, minutes] = timeStr.split(':').map(Number);
     return hours * 60 + minutes;
   };
 
   const dayIndex = (date.getDay() + 6) % 7;
   const dayKey = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][dayIndex];
   const dayWorkingHours = workingHours[dayKey];
 
   if (!dayWorkingHours || !dayWorkingHours.open || !dayWorkingHours.close) {
     return [];
   }
 
   const startOfDay = timeToMinutes(dayWorkingHours.open);
   const endOfDay = timeToMinutes(dayWorkingHours.close);
   const breaks = (dayWorkingHours.breaks || []).map(b => ({ start: timeToMinutes(b.start), end: timeToMinutes(b.end) }));
   
   const relevantBookings = bookings
     .filter(b => b.date === date.toISOString().split('T')[0] && ['pending', 'in_service'].includes(b.status))
     .map(b => ({ start: timeToMinutes(b.startTime), end: timeToMinutes(b.endTime) }));
 
   const busyTimes = [...breaks, ...relevantBookings].sort((a, b) => a.start - b.start);
 
   const freeIntervals = [];
   let lastBusyEnd = startOfDay;
 
   const now = new Date();
   const isToday = date.toDateString() === now.toDateString();
   const currentMinutes = now.getHours() * 60 + now.getMinutes();
 
   if (isToday && lastBusyEnd < currentMinutes) {
     lastBusyEnd = currentMinutes;
   }
 
   busyTimes.forEach(busySlot => {
     if (busySlot.start > lastBusyEnd) {
       freeIntervals.push({ start: lastBusyEnd, end: busySlot.start });
     }
     lastBusyEnd = Math.max(lastBusyEnd, busySlot.end);
   });
 
   if (endOfDay > lastBusyEnd) {
     freeIntervals.push({ start: lastBusyEnd, end: endOfDay });
   }
 
   const freeSlots = [];
   freeIntervals.forEach(interval => {
     let currentSlotStart = Math.ceil(interval.start / slotGranularityMin) * slotGranularityMin;
     while (currentSlotStart + slotGranularityMin <= interval.end) {
       const start = new Date(date);
       start.setHours(Math.floor(currentSlotStart / 60), currentSlotStart % 60, 0, 0);
       
       const end = new Date(date);
       const endMinutes = currentSlotStart + slotGranularityMin;
       end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
 
       freeSlots.push({
         start,
         end,
         durationMin: slotGranularityMin,
       });
       currentSlotStart += slotGranularityMin;
     }
   });
 
   return freeSlots;
 }