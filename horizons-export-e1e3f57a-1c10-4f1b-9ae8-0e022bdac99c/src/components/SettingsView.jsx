import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Clock, Users, Wrench } from 'lucide-react';
import ShopInfoSettings from '@/components/settings/ShopInfoSettings';
import WorkingHoursSettings from '@/components/settings/WorkingHoursSettings';
import WorkerSettings from '@/components/settings/WorkerSettings';
import ServiceSettings from '@/components/settings/ServiceSettings';

const SettingsView = ({ user, shopData, onUpdateShop }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Configuración del Taller</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Información del Taller
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ShopInfoSettings shopData={shopData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horario del Taller
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WorkingHoursSettings 
              user={user} 
              shopData={shopData} 
              onUpdateShop={onUpdateShop} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gestión de Trabajadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WorkerSettings
              user={user}
              shopData={shopData}
              onUpdateShop={onUpdateShop}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Gestión de Servicios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceSettings
              shopData={shopData}
              onUpdateShop={onUpdateShop}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default SettingsView;