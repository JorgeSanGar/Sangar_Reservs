@@ .. @@
 import { useToast } from '@/components/ui/use-toast';
 import { ArrowRight, Clock } from 'lucide-react';
 import { computeFreeIntervals } from '@/lib/availability';
import { arrivalService, estimationService } from '@/lib/supabaseService';
import { useAppData } from '@/contexts/AppDataContext';
 import CategoryChips from '@/components/services/CategoryChips';
 import ServiceList from '@/components/services/ServiceList';
 import WheelOptionsDrawer from '@/components/services/WheelOptionsDrawer';

@@ .. @@
   const [bookingTime, setBookingTime] = useState(initialTime);
  const [bookingTime, setBookingTime] = useState(null);
   const [wheelConfig, setWheelConfig] = useState(null);
const NewBookingWizard = ({ isOpen, onClose, initialDate = null }) => {
  const { services, workingHours, bookings, createBooking } = useAppData();
+  const [arrivalRecommendation, setArrivalRecommendation] = useState(null);
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [estimatedDuration, setEstimatedDuration] = useState(null);
   
   const availableSlots = useMemo(() => {
    if (!selectedService) return [];
    
    return computeFreeIntervals({
      date: selectedDate,
      workingHours,
      bookings,
      slotGranularityMin: 30
    });
  }, [selectedDate, workingHours, bookings, selectedService]);

  const categories = useMemo(() => {
    return [...new Set(services.map(s => s.category))];
  }, [services]);

  const filteredServices = useMemo(() => {
    return selectedCategory 
      ? services.filter(s => s.category === selectedCategory)
      : services;
  }, [services, selectedCategory]);

  // Estimate duration when service or wheel config changes
  useEffect(() => {
    if (selectedService && wheelConfig) {
      const estimatePayload = {
        serviceId: selectedService.id,
        category: selectedService.category.toLowerCase(),
        wheels: wheelConfig.values.wheels,
        options: wheelConfig.values
      };
      
      estimationService.estimateDuration(selectedService.id, estimatePayload)
        .then(({ data, error }) => {
          if (!error && data) {
            setEstimatedDuration(data.minutes);
          }
        })
        .catch(console.error);
    }
  }, [selectedService, wheelConfig]);

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    if (service.category.toLowerCase().includes('neumático') || service.category.toLowerCase().includes('rueda')) {
      setIsDrawerOpen(true);
    } else {
      setStep(3); // Skip wheel configuration for non-tire services
    }
  };

  const handleWheelConfigComplete = (config) => {
    setWheelConfig(config);
    setIsDrawerOpen(false);
    setStep(3);
  };

  const handleTimeSelect = (slot) => {
    setBookingTime(slot.start);
    setStep(4);
  };

  const handleBookingSubmit = async () => {
    if (!selectedService || !bookingTime || !customerData.name) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      const bookingData = {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        visitMode
      };

      const payload = wheelConfig ? {
        category: selectedService.category.toLowerCase(),
        wheels: wheelConfig.values.wheels,
        options: wheelConfig.values
      } : null;

      const { error } = await createBooking(
        selectedService.id,
        bookingTime.toISOString(),
        bookingData,
        payload
      );

      if (!error) {
        toast({
          title: "Reserva creada",
          description: "La reserva ha sido creada exitosamente"
        });
        onClose();
        resetWizard();
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la reserva",
        variant: "destructive"
      });
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedCategory('');
    setSelectedService(null);
    setCustomerData({ name: '', email: '', phone: '' });
    setBookingTime(null);
    setWheelConfig(null);
    setVisitMode('wait');
    setArrivalRecommendation(null);
    setEstimatedDuration(null);
  };

  const handleClose = () => {
    onClose();
    resetWizard();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Nueva Reserva</h2>
          <p className="text-gray-600">Paso {step} de 4</p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Selecciona una categoría</h3>
              <CategoryChips
                categories={categories}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
              />
              {selectedCategory && (
                <Button onClick={() => setStep(2)} className="w-full">
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Selecciona un servicio</h3>
              <ServiceList
                services={filteredServices}
                onServiceSelect={handleServiceSelect}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Selecciona horario</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleTimeSelect(slot)}
                    className="p-3 text-center"
                  >
                    <div>
                      <div className="font-medium">
                        {slot.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {estimatedDuration ? `${estimatedDuration} min` : `${selectedService.duration_min} min`}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
              {availableSlots.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay horarios disponibles para este día</p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Datos del cliente</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Nombre *</Label>
                  <Input
                    id="customerName"
                    value={customerData.name}
                    onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                    placeholder="Nombre del cliente"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="customerPhone">Teléfono</Label>
                  <Input
                    id="customerPhone"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                    placeholder="Teléfono de contacto"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                  placeholder="email@ejemplo.com"
                />
              </div>

              {/* Visit Mode */}
              <div>
                <Label>Modalidad de visita</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={visitMode === 'wait' ? 'default' : 'outline'}
                    onClick={() => setVisitMode('wait')}
                  >
                    Cliente espera
                  </Button>
                  <Button
                    type="button"
                    variant={visitMode === 'dropoff' ? 'default' : 'outline'}
                    onClick={() => setVisitMode('dropoff')}
                  >
                    Dejar vehículo
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Resumen de la reserva</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Servicio:</strong> {selectedService?.name}</p>
                  <p><strong>Fecha:</strong> {bookingTime?.toLocaleDateString('es-ES')}</p>
                  <p><strong>Hora:</strong> {bookingTime?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p><strong>Duración:</strong> {estimatedDuration || selectedService?.duration_min} minutos</p>
                  <p><strong>Cliente:</strong> {customerData.name}</p>
                  {wheelConfig && (
                    <p><strong>Configuración:</strong> {wheelConfig.breakdown.join(', ')}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Anterior
              </Button>
            )}
            
            {step === 4 ? (
              <Button onClick={handleBookingSubmit}>
                Crear Reserva
              </Button>
            ) : step < 3 && (
              <Button 
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !selectedCategory) ||
                  (step === 2 && !selectedService)
                }
              >
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Wheel Options Drawer */}
      <WheelOptionsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        serviceName={selectedService?.name}
        onSubmitSuccess={handleWheelConfigComplete}
      />
    </div>
  );
};

export default NewBookingWizard;
   }
   )