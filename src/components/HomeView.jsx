import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppData } from '@/contexts/AppDataContext';

const HomeView = () => {
  const { orgData, bookings, services, resources, members, loading } = useAppData();

  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    const todayBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      return bookingDate.toDateString() === todayStr && booking.status !== 'cancelled';
    });

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6); // Sunday

    const weekBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      return bookingDate >= thisWeekStart && 
             bookingDate <= thisWeekEnd && 
             booking.status !== 'cancelled';
    });

    const activeResources = resources.filter(r => r.is_active);
    const totalRevenue = weekBookings.reduce((sum, booking) => {
      const service = services.find(s => s.id === booking.service_id);
      return sum + (service?.price || 0);
    }, 0);

    return {
      todayBookings: todayBookings.length,
      weekBookings: weekBookings.length,
      totalServices: services.length,
      activeResources: activeResources.length,
      totalMembers: members.length,
      weekRevenue: totalRevenue,
      nextBooking: todayBookings
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
        .find(booking => new Date(booking.start_time) > today)
    };
  }, [bookings, services, resources, members]);

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
          <h1 className="text-2xl font-bold text-gray-900">
            ¡Bienvenido a {orgData?.name || 'tu taller'}!
          </h1>
          <p className="text-gray-600">
            Resumen de actividad y métricas principales
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservas Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayBookings}</div>
              <p className="text-xs text-muted-foreground">
                {stats.nextBooking ? (
                  <>Próxima: {new Date(stats.nextBooking.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</>
                ) : (
                  'No hay más reservas hoy'
                )}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weekBookings}</div>
              <p className="text-xs text-muted-foreground">
                €{stats.weekRevenue.toFixed(2)} en ingresos
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recursos Activos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeResources}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalServices} servicios disponibles
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equipo</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                miembros activos
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Today's Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Agenda de Hoy
            </CardTitle>
            <CardDescription>
              Reservas programadas para hoy
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.todayBookings === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay reservas programadas para hoy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings
                  .filter(booking => {
                    const bookingDate = new Date(booking.start_time);
                    return bookingDate.toDateString() === new Date().toDateString() && 
                           booking.status !== 'cancelled';
                  })
                  .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                  .slice(0, 5)
                  .map((booking) => {
                    const service = services.find(s => s.id === booking.service_id);
                    const startTime = new Date(booking.start_time);
                    const endTime = new Date(booking.end_time);
                    const isPast = endTime < new Date();
                    const isCurrent = startTime <= new Date() && endTime >= new Date();
                    
                    return (
                      <div
                        key={booking.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isCurrent ? 'bg-blue-50 border-blue-200' : 
                          isPast ? 'bg-gray-50 border-gray-200 opacity-75' : 
                          'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            isCurrent ? 'bg-blue-500' : 
                            isPast ? 'bg-gray-400' : 
                            'bg-green-500'
                          }`} />
                          <div>
                            <p className="font-medium text-sm">
                              {booking.customer_name || 'Cliente sin nombre'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {service?.name || 'Servicio desconocido'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - 
                            {endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {booking.status === 'confirmed' ? 'Confirmada' : 
                             booking.status === 'in_service' ? 'En servicio' : 
                             booking.status}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>
              Tareas comunes para gestionar tu taller
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                <Calendar className="h-6 w-6 text-blue-600 mb-2" />
                <h3 className="font-medium">Nueva Reserva</h3>
                <p className="text-sm text-gray-600">Crear una nueva cita</p>
              </button>
              
              <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                <Users className="h-6 w-6 text-green-600 mb-2" />
                <h3 className="font-medium">Gestionar Equipo</h3>
                <p className="text-sm text-gray-600">Invitar trabajadores</p>
              </button>
              
              <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                <TrendingUp className="h-6 w-6 text-purple-600 mb-2" />
                <h3 className="font-medium">Ver Reportes</h3>
                <p className="text-sm text-gray-600">Analizar rendimiento</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default HomeView;