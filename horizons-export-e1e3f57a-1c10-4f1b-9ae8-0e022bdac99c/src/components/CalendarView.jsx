import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, ChevronRight, Clock, Plus, XCircle } from 'lucide-react';
import { computeFreeIntervals } from '@/lib/availability';
import NewBookingWizard from '@/components/wizards/NewBookingWizard';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ResponsiveSheet } from '@/components/sheets/ResponsiveSheet';

const CalendarView = ({ user, shopData, onUpdateShop }) => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBookingWizard, setShowBookingWizard] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const isMobile = !useMediaQuery("(min-width: 768px)");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const freeSlots = useMemo(() => {
    return computeFreeIntervals({
      date: currentDate,
      workingHours: shopData.workingHours,
      bookings: shopData.bookings,
      slotGranularityMin: 15
    });
  }, [currentDate, shopData.workingHours, shopData.bookings]);

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const handleBookSlot = (slot) => {
    setSelectedSlot(slot);
    setShowBookingWizard(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingWizard(false);
    setSelectedSlot(null);
    toast({
      title: "¡Reserva creada!",
      description: "El nuevo servicio ha sido programado exitosamente.",
    });
  };

  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: freeSlots.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Disponibilidad</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => navigateDate(-1)} disabled={currentDate <= today}>
              <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline ml-2">Anterior</span>
            </Button>
            <span className="font-medium text-lg w-48 md:w-64 text-center">
              {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <Button variant="outline" onClick={() => navigateDate(1)} disabled={currentDate >= endOfWeek}>
              <span className="hidden md:inline mr-2">Siguiente</span> <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Huecos de Disponibilidad del Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            {freeSlots.length > 0 ? (
              isMobile ? (
                <div ref={parentRef} className="h-[50vh] overflow-y-auto">
                  <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                      const slot = freeSlots[virtualItem.index];
                      return (
                        <div
                          key={virtualItem.key}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)` }}
                          className="px-1 py-1"
                        >
                          <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => handleBookSlot(slot)}>
                            <Plus className="w-4 h-4" />
                            {slot.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {freeSlots.map((slot, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => handleBookSlot(slot)}>
                        <Plus className="w-4 h-4" />
                        {slot.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-48 text-gray-500">
                <XCircle className="w-12 h-12 mb-4" />
                <h3 className="text-lg font-semibold">Taller Cerrado o sin huecos</h3>
                <p className="text-sm">No hay horario de apertura definido o no hay huecos disponibles para este día.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ResponsiveSheet open={showBookingWizard} onOpenChange={setShowBookingWizard}>
        {selectedSlot && (
          <NewBookingWizard 
            user={user}
            shopData={shopData}
            onUpdateShop={onUpdateShop}
            onSuccess={handleBookingSuccess}
            initialDate={selectedSlot.start}
            initialTime={selectedSlot.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          />
        )}
      </ResponsiveSheet>
    </>
  );
};

export default CalendarView;