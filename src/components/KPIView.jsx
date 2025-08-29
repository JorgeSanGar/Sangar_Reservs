import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Clock, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppData } from '@/contexts/AppDataContext';

const KPIView = () => {
  const { bookings, services, resources, members } = useAppData();

  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      return bookingDate >= thisMonth && booking.status !== 'cancelled';
    });

    const lastMonthBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      return bookingDate >= lastMonth && bookingDate <= lastMonthEnd && booking.status !== 'cancelled';
    });

    const completedThisMonth = thisMonthBookings.filter(b => b.status === 'completed');
    const completedLastMonth = lastMonthBookings.filter(b => b.status === 'completed');

    const revenueThisMonth = completedThisMonth.reduce((sum, booking) => {
      const service = services.find(s => s.id === booking.service_id);
      return sum + (service?.price || 0);
    }, 0);

    const revenueLastMonth = completedLastMonth.reduce((sum, booking) => {
      const service = services.find(s => s.id === booking.service_id);
      return sum + (service?.price || 0);
    }, 0);

    const avgDurationThisMonth = completedThisMonth.length > 0 
      ? completedThisMonth.reduce((sum, booking) => {
          return sum + (booking.actual_minutes || 0);
        }, 0) / completedThisMonth.length
      : 0;

    const utilizationRate = resources.length > 0 
      ? (thisMonthBookings.length / (resources.length * 30)) * 100 // Simplified calculation
      : 0;

    const revenueGrowth = lastMonthBookings.length > 0 
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 
      : 0;

    const bookingGrowth = lastMonthBookings.length > 0 
      ? ((thisMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length) * 100 
      : 0;

    return {
      thisMonthBookings: thisMonthBookings.length,
      lastMonthBookings: lastMonthBookings.length,
      revenueThisMonth,
      revenueLastMonth,
      avgDurationThisMonth,
      utilizationRate,
      revenueGrowth,
      bookingGrowth,
      completedThisMonth: completedThisMonth.length,
      completedLastMonth: completedLastMonth.length
    };
  }, [bookings, services, resources]);

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{subtitle}</span>
          {trend && (
            <div className={`flex items-center gap-1 ${
              trendValue > 0 ? 'text-green-600' : trendValue < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trendValue > 0 ? <TrendingUp className="h-3 w-3" /> : 
               trendValue < 0 ? <TrendingDown className="h-3 w-3" /> : null}
              <span>{Math.abs(trendValue).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Indicadores de Rendimiento
        </h1>
        <p className="text-gray-600">
          Métricas y análisis del rendimiento del taller
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StatCard
            title="Reservas Este Mes"
            value={kpis.thisMonthBookings}
            subtitle="vs mes anterior"
            icon={Calendar}
            trend={true}
            trendValue={kpis.bookingGrowth}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatCard
            title="Ingresos Este Mes"
            value={`€${kpis.revenueThisMonth.toFixed(0)}`}
            subtitle="vs mes anterior"
            icon={DollarSign}
            trend={true}
            trendValue={kpis.revenueGrowth}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StatCard
            title="Duración Promedio"
            value={`${Math.round(kpis.avgDurationThisMonth)} min`}
            subtitle="servicios completados"
            icon={Clock}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StatCard
            title="Tasa de Utilización"
            value={`${kpis.utilizationRate.toFixed(1)}%`}
            subtitle="capacidad utilizada"
            icon={TrendingUp}
          />
        </motion.div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Resumen Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Reservas totales</span>
                  <span className="font-medium">{kpis.thisMonthBookings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Servicios completados</span>
                  <span className="font-medium">{kpis.completedThisMonth}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tasa de finalización</span>
                  <span className="font-medium">
                    {kpis.thisMonthBookings > 0 
                      ? `${((kpis.completedThisMonth / kpis.thisMonthBookings) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ingresos promedio por servicio</span>
                  <span className="font-medium">
                    €{kpis.completedThisMonth > 0 
                      ? (kpis.revenueThisMonth / kpis.completedThisMonth).toFixed(2)
                      : '0.00'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Servicios Más Populares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {services
                  .map(service => ({
                    ...service,
                    bookingCount: bookings.filter(b => 
                      b.service_id === service.id && 
                      b.status !== 'cancelled' &&
                      new Date(b.start_time) >= new Date(now.getFullYear(), now.getMonth(), 1)
                    ).length
                  }))
                  .sort((a, b) => b.bookingCount - a.bookingCount)
                  .slice(0, 5)
                  .map((service, index) => (
                    <div key={service.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <span className="text-sm">{service.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{service.bookingCount}</span>
                        <span className="text-xs text-gray-500">reservas</span>
                      </div>
                    </div>
                  ))}
                {services.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay datos de servicios disponibles
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default KPIView;