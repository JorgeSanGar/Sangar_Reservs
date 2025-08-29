import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppData } from '@/contexts/AppDataContext';
import NewBookingWizard from '@/components/wizards/NewBookingWizard';

const CalendarView = () => {
  const { bookings, services, loading } = useAppData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewBooking, setShowNewBooking] = useState(false);

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Start from Monday
    
    const days = [];
    const current = new Date(startDate);
    
    // Generate 6 weeks (42 days) to fill the calendar grid
    for (let i = 0; i < 42; i++) {
      const dayBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        return bookingDate.toDateString() === current.toDateString() && 
               booking.status !== 'cancelled';
      });
      
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString(),
        bookings: dayBookings
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [selectedDate, bookings]);

  const selectedDayBookings = useMemo(() => {
    return bookings
      .filter(booking => {
        const bookingDate = new Date(booking.start_time);
        return bookingDate.toDateString() === selectedDate.toDateString() && 
               booking.status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [bookings, selectedDate]);

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Calendario de Reservas
          </h1>
          <p className="text-gray-600">
            Gestiona las citas y disponibilidad del taller
          </p>
        </div>
        <Button onClick={() => setShowNewBooking(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Reserva
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth(-1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
                  >
                    Hoy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth(1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {dayNames.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(day.date)}
                    className={`
                      p-2 text-sm rounded-lg transition-colors relative
                      ${!day.isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                      ${day.isToday ? 'bg-blue-100 text-blue-900 font-bold' : ''}
                      ${selectedDate.toDateString() === day.date.toDateString() ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
                    `}
                  >
                    {day.date.getDate()}
                    {day.bookings.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          selectedDate.toDateString() === day.date.toDateString() ? 'bg-white' : 'bg-blue-500'
                        }`} />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate.toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDayBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay reservas este día</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayBookings.map((booking) => {
                    const service = services.find(s => s.id === booking.service_id);
                    const startTime = new Date(booking.start_time);
                    const endTime = new Date(booking.end_time);
                    
                    return (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {booking.customer_name || 'Cliente sin nombre'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {service?.name || 'Servicio desconocido'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - 
                              {endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            booking.status === 'in_service' ? 'bg-blue-100 text-blue-800' :
                            booking.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.status === 'confirmed' ? 'Confirmada' :
                             booking.status === 'in_service' ? 'En servicio' :
                             booking.status === 'completed' ? 'Completada' :
                             booking.status}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Booking Wizard */}
      {showNewBooking && (
        <NewBookingWizard
          isOpen={showNewBooking}
          onClose={() => setShowNewBooking(false)}
          initialDate={selectedDate}
        />
      )}
    </div>
  );
};

export default CalendarView;