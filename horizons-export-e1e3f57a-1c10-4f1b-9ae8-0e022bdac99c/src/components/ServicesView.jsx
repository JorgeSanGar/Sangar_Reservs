import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Calendar, Clock, Users } from 'lucide-react';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import { ResponsiveSheet } from '@/components/sheets/ResponsiveSheet';
import NewBookingWizard from '@/components/wizards/NewBookingWizard';

const ServicesView = ({ user, shopData, onUpdateShop }) => {
  const { toast } = useToast();
  const [showBookingWizard, setShowBookingWizard] = useState(false);

  const handleBookingSuccess = () => {
    setShowBookingWizard(false);
    toast({
      title: "¡Reserva creada!",
      description: "El nuevo servicio ha sido programado exitosamente.",
    });
  };

  const upcomingServices = shopData.bookings
    .filter(booking => {
      const bookingDate = new Date(booking.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return bookingDate >= today && !['done', 'no_show', 'cancelled'].includes(booking.status);
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA - dateB;
    });

  const columns = [
    { accessor: 'customerName', Header: 'Cliente' },
    { accessor: 'serviceName', Header: 'Servicio' },
    { accessor: 'date', Header: 'Fecha', Cell: ({ value }) => new Date(value).toLocaleDateString('es-ES') },
    { accessor: 'startTime', Header: 'Hora' },
    { accessor: 'status', Header: 'Estado', Cell: ({ value }) => (
      <span className={`status-badge status-${value.replace(' ', '_')}`}>{value}</span>
    )},
    { accessor: 'actions', Header: 'Acciones', Cell: ({ row }) => (
      <Button variant="outline" size="sm" onClick={() => toast({ title: "Próximamente", description: "La edición de reservas estará disponible pronto." })}>
        Ver/Editar
      </Button>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Servicios</h1>
        <Button onClick={() => setShowBookingWizard(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva Reserva
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Próximos Servicios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable columns={columns} data={upcomingServices} />
        </CardContent>
      </Card>

      <ResponsiveSheet open={showBookingWizard} onOpenChange={setShowBookingWizard} title="Crear Nueva Reserva">
        <NewBookingWizard 
          user={user}
          shopData={shopData}
          onUpdateShop={onUpdateShop}
          onSuccess={handleBookingSuccess}
          initialDate={new Date()}
          initialTime={null}
        />
      </ResponsiveSheet>
    </div>
  );
};

export default ServicesView;