import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, ChevronRight, Clock, Plus, Calendar, BarChart, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { computeFreeIntervals } from '@/lib/availability';
import NewBookingWizard from '@/components/wizards/NewBookingWizard';
import { ResponsiveSheet } from '@/components/sheets/ResponsiveSheet';

const HomeView = ({ user, shopData, onUpdateShop }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBookingWizard, setShowBookingWizard] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const dailySummary = useMemo(() => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const bookingsToday = shopData.bookings.filter(b => b.date === dateStr);

    return {
      pending: bookingsToday.filter(b => b.status === 'pending').length,
      in_service: bookingsToday.filter(b => b.status === 'in_service').length,
      done: bookingsToday.filter(b => b.status === 'done').length,
      no_show: bookingsToday.filter(b => b.status === 'no_show').length,
    };
  }, [currentDate, shopData.bookings]);

  const freeSlots = useMemo(() => {
    return computeFreeIntervals({
      date: currentDate,
      workingHours: shopData.workingHours,
      bookings: shopData.bookings,
      slotGranularityMin: 30
    });
  }, [currentDate, shopData.workingHours, shopData.bookings]);

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };
  
  const handleBookingSuccess = () => {
    setShowBookingWizard(false);
    setSelectedSlot(null);
    toast({
      title: "¡Reserva creada!",
      description: "El nuevo servicio ha sido programado exitosamente.",
    });
  };
  
  const openWizardForSlot = (slot) => {
    setSelectedSlot(slot);
    setShowBookingWizard(true);
  };

  const kpiCards = [
    { title: 'Pendientes', value: dailySummary.pending, icon: Loader2, color: 'text-yellow-600' },
    { title: 'En Servicio', value: dailySummary.in_service, icon: Clock, color: 'text-blue-600' },
    { title: 'Completados', value: dailySummary.done, icon: CheckCircle, color: 'text-green-600' },
    { title: 'No Presentado', value: dailySummary.no_show, icon: AlertCircle, color: 'text-red-600' },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Resumen: <span className="whitespace-nowrap">{currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate(-1)} disabled={currentDate <= today}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate(1)} disabled={currentDate >= endOfWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {kpiCards.map((kpi, index) => (
            <motion.div key={kpi.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="kpi-card"><CardContent className="p-4 md:p-6"><div className="flex items-center justify-between">
                <kpi.icon className={`w-6 h-6 md:w-8 md:h-8 ${kpi.color}`} />
                <div className="text-right"><p className="text-2xl md:text-3xl font-bold text-gray-900">{kpi.value}</p><p className="text-xs md:text-sm font-medium text-gray-600">{kpi.title}</p></div>
              </div></CardContent></Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center justify-between"><span>Huecos Libres Hoy ({freeSlots.length})</span>
                <Button className="hidden md:flex items-center gap-2" onClick={() => openWizardForSlot(null)}><Plus className="w-4 h-4" />Nueva Reserva</Button>
              </CardTitle></CardHeader>
              <CardContent>
                {freeSlots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-3">
                    {freeSlots.slice(0, 10).map((slot, index) => (
                      <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                        <Button variant="outline" className="w-full" onClick={() => openWizardForSlot(slot)}>
                          {slot.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </Button>
                      </motion.div>
                    ))}
                    {freeSlots.length > 10 && <Button variant="ghost" className="w-full" onClick={() => navigate('/disponibilidad')}>Ver más...</Button>}
                  </div>
                ) : (<div className="text-center py-8 text-gray-500"><p>No hay huecos libres para hoy.</p></div>)}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Acciones Rápidas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full flex items-center justify-center gap-2" onClick={() => navigate('/disponibilidad')}><Calendar className="w-4 h-4" />Ver Disponibilidad</Button>
              <Button variant="secondary" className="w-full flex items-center justify-center gap-2" onClick={() => navigate('/services')}><Plus className="w-4 h-4" />Gestionar Servicios</Button>
              {user.role === 'director' && <Button variant="secondary" className="w-full flex items-center justify-center gap-2" onClick={() => navigate('/kpis')}><BarChart className="w-4 h-4" />Ver KPIs</Button>}
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <Button size="lg" className="rounded-full shadow-lg" onClick={() => openWizardForSlot(null)}>
          <Plus className="w-6 h-6" />
        </Button>
      </div>
      <ResponsiveSheet open={showBookingWizard} onOpenChange={setShowBookingWizard}>
        <NewBookingWizard 
          user={user}
          shopData={shopData}
          onUpdateShop={onUpdateShop}
          onSuccess={handleBookingSuccess}
          initialDate={selectedSlot ? selectedSlot.start : currentDate}
          initialTime={selectedSlot ? selectedSlot.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null}
        />
      </ResponsiveSheet>
    </>
  );
};

export default HomeView;