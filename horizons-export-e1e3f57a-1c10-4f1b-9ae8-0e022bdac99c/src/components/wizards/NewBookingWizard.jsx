import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowRight, Clock } from 'lucide-react';
import { computeFreeIntervals } from '@/lib/availability';
import CategoryChips from '@/components/services/CategoryChips';
import ServiceList from '@/components/services/ServiceList';
import WheelOptionsDrawer from '@/components/services/WheelOptionsDrawer';

const NewBookingWizard = ({ user, shopData, onUpdateShop, onSuccess, initialDate, initialTime }) => {
  const { toast } = useToast();
  const [step, setStep] = useState(initialTime ? 2 : 1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [customerData, setCustomerData] = useState({ name: '', phone: '' });
  const [bookingDate] = useState(initialDate);
  const [bookingTime, setBookingTime] = useState(initialTime);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [wheelConfig, setWheelConfig] = useState(null);
  
  const availableSlots = useMemo(() => {
    if (step !== 1) return [];
    return computeFreeIntervals({
      date: bookingDate,
      workingHours: shopData.workingHours,
      bookings: shopData.bookings,
      slotGranularityMin: 15
    });
  }, [step, bookingDate, shopData.workingHours, shopData.bookings]);

  const handleCreateBooking = () => {
    if (!selectedService || !customerData.name || !bookingTime || !wheelConfig) {
      toast({ title: "Datos incompletos", description: "Completa todos los campos para crear la reserva.", variant: "destructive" });
      return;
    }
    const estimatedDuration = wheelConfig.minutes;
    const endTime = new Date(new Date(`${bookingDate.toISOString().split('T')[0]}T${bookingTime}`).getTime() + estimatedDuration * 60000).toTimeString().slice(0, 5);
    const newBooking = {
      id: `booking_${Date.now()}`, serviceId: selectedService.id, serviceName: selectedService.name, category: selectedCategory,
      customerName: customerData.name, phone: customerData.phone, date: bookingDate.toISOString().split('T')[0], startTime: bookingTime,
      endTime: endTime, duration: estimatedDuration, status: 'pending', createdBy: user.name,
      createdAt: new Date().toISOString(), notes: '', wheelConfig: wheelConfig.payload
    };
    onUpdateShop({ ...shopData, bookings: [...shopData.bookings, newBooking] });
    onSuccess();
  };
  
  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setIsDrawerOpen(true);
  };

  const handleDrawerContinue = (config) => {
    setWheelConfig(config);
    setIsDrawerOpen(false);
    setStep(3);
  };
  
  const STEPS = [
    { id: 1, title: "Selecciona hueco" },
    { id: 2, title: "Elige servicio" },
    { id: 3, title: "Confirma datos" }
  ];

  const renderContent = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4">
            <p>Selecciona la hora de inicio para la reserva el día {bookingDate.toLocaleDateString('es-ES')}.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-lg">
              {availableSlots.length > 0 ? availableSlots.map(slot => (
                <Button key={slot.start.toISOString()} variant="outline" onClick={() => { setBookingTime(slot.start.toTimeString().slice(0,5)); setStep(2); }}>
                  {slot.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </Button>
              )) : <p className="col-span-full text-center text-gray-500">No hay huecos disponibles.</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
             <CategoryChips services={shopData.services} selectedCategory={selectedCategory} onSelectCategory={cat => { setSelectedCategory(cat); setSelectedService(null); setWheelConfig(null); }} />
            {selectedCategory && (
                <ServiceList 
                    services={shopData.services} 
                    category={selectedCategory}
                    onSelectService={handleServiceSelect}
                />
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-lg mb-2">Resumen de la Reserva</h4>
              <p><strong>Servicio:</strong> {selectedService.name} ({selectedCategory})</p>
              <p><strong>Fecha:</strong> {bookingDate.toLocaleDateString('es-ES')} a las {bookingTime}</p>
              <div className="flex items-center gap-2 mt-2"><Clock className="w-4 h-4 text-blue-700" /><span className="font-medium text-blue-800">Duración estimada: {wheelConfig?.minutes || 'N/A'} min</span></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label htmlFor="cName">Nombre Cliente *</Label><Input id="cName" value={customerData.name} onChange={e => setCustomerData(p => ({...p, name: e.target.value}))}/></div>
              <div><Label htmlFor="cPhone">Teléfono</Label><Input id="cPhone" value={customerData.phone} onChange={e => setCustomerData(p => ({...p, phone: e.target.value}))}/></div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <>
      <div className="p-1">
        <div className="flex justify-between items-center mb-4">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= s.id ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{s.id}</div>
                <span className={`font-medium hidden sm:inline ${step >= s.id ? 'text-gray-900' : 'text-gray-500'}`}>{s.title}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-300 mx-2 sm:mx-4"></div>}
            </React.Fragment>
          ))}
        </div>

        <div className="min-h-[250px] p-4 bg-white rounded-lg">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={() => setStep(p => p - 1)} disabled={step === 1 || (initialTime && step === 2)}>Anterior</Button>
          {step < 3 ? 
            <Button onClick={() => setStep(p => p + 1)} disabled={(step === 2 && !wheelConfig)}>Siguiente <ArrowRight className="w-4 h-4 ml-2"/></Button> : 
            <Button onClick={handleCreateBooking}>Confirmar Reserva</Button>
          }
        </div>
      </div>
      {selectedService && (
        <WheelOptionsDrawer 
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          service={selectedService}
          orgId={shopData.id}
          onContinue={handleDrawerContinue}
        />
      )}
    </>
  );
};

export default NewBookingWizard;