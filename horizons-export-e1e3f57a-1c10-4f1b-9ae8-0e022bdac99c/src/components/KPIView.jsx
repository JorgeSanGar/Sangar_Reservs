import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle,
  Download
} from 'lucide-react';

const KPIView = ({ user, shopData }) => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('week'); // week, month, quarter

  const kpiData = useMemo(() => {
    const now = new Date();
    let startDate;
    
    switch (dateRange) {
      case 'month': startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); break;
      case 'quarter': startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); break;
      case 'week':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    }

    const filteredBookings = shopData.bookings.filter(b => new Date(b.date) >= startDate);
    const completedServices = filteredBookings.filter(b => b.status === 'done');
    const noShowServices = filteredBookings.filter(b => b.status === 'no_show');
    const totalRevenue = completedServices.reduce((sum, b) => {
      const service = shopData.services.find(s => s.id === b.serviceId);
      return sum + (service ? service.price : 0);
    }, 0);

    return {
      totalServices: filteredBookings.length,
      completionRate: filteredBookings.length > 0 ? (completedServices.length / filteredBookings.length * 100) : 0,
      noShowRate: filteredBookings.length > 0 ? (noShowServices.length / filteredBookings.length * 100) : 0,
      totalRevenue,
      averageServiceValue: completedServices.length > 0 ? totalRevenue / completedServices.length : 0,
    };
  }, [shopData, dateRange]);

  const exportData = (format) => {
    toast({
      title: "🚧 Función en desarrollo",
      description: `¡La exportación a ${format.toUpperCase()} estará disponible pronto! 🚀`
    });
  };

  const kpiCards = [
    { title: 'Total Servicios', value: kpiData.totalServices, icon: BarChart3, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { title: 'Tasa Finalización', value: `${kpiData.completionRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-100' },
    { title: 'Ingresos Totales', value: `€${kpiData.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { title: 'Tasa No-Show', value: `${kpiData.noShowRate.toFixed(1)}%`, icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">KPIs y Análisis</h1>
        <div className="flex items-center space-x-2 md:space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
          >
            <option value="week">Última Semana</option>
            <option value="month">Último Mes</option>
            <option value="quarter">Último Trimestre</option>
          </select>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => exportData('csv')} className="flex items-center gap-2"><Download className="w-4 h-4" /> <span className="hidden sm:inline">CSV</span></Button>
            <Button variant="outline" onClick={() => exportData('pdf')} className="flex items-center gap-2"><Download className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span></Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpiCards.map((kpi, index) => (
          <motion.div key={kpi.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card className="kpi-card">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">{kpi.title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">{kpi.value}</p>
                  </div>
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 ${kpi.bgColor} rounded-lg flex items-center justify-center`}>
                    <kpi.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Rendimiento por Categoría (Próximamente)</CardTitle></CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-gray-500">Gráfica en desarrollo</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Utilización de Recursos (Próximamente)</CardTitle></CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-gray-500">Gráfica en desarrollo</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KPIView;