import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Settings, Plus, Wrench, Gauge, Droplets, Car, AlertCircle } from 'lucide-react';
import { ResponsiveSheet } from '@/components/sheets/ResponsiveSheet';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';

const ResourcesView = ({ user, shopData, onUpdateShop }) => {
  const { toast } = useToast();
  const [showAddResource, setShowAddResource] = useState(false);
  const [newResource, setNewResource] = useState({
    name: '',
    type: 'elevador',
    capacity: 1
  });

  const resourceTypes = [
    { id: 'elevador', name: 'Elevador', icon: Car, color: 'bg-blue-500' },
    { id: 'equilibradora', name: 'Equilibradora', icon: Gauge, color: 'bg-green-500' },
    { id: 'desmontadora', name: 'Desmontadora', icon: Wrench, color: 'bg-purple-500' },
    { id: 'agua', name: 'Estación de Agua', icon: Droplets, color: 'bg-cyan-500' },
    { id: 'gato', name: 'Gato Hidráulico', icon: Settings, color: 'bg-orange-500' }
  ];

  const handleAddResource = () => {
    if (!newResource.name.trim()) {
      toast({ title: "Error", description: "El nombre del recurso es requerido", variant: "destructive" });
      return;
    }
    const resource = {
      id: `res_${Date.now()}`, name: newResource.name, type: newResource.type,
      capacity: newResource.capacity, available: true, createdAt: new Date().toISOString()
    };
    onUpdateShop({ ...shopData, resources: [...shopData.resources, resource] });
    toast({ title: "¡Recurso añadido!", description: `${newResource.name} ha sido añadido.` });
    setNewResource({ name: '', type: 'elevador', capacity: 1 });
    setShowAddResource(false);
  };

  const toggleResourceAvailability = (resourceId) => {
    const updatedResources = shopData.resources.map(r => r.id === resourceId ? { ...r, available: !r.available } : r);
    onUpdateShop({ ...shopData, resources: updatedResources });
    const resource = shopData.resources.find(r => r.id === resourceId);
    toast({ title: "Estado actualizado", description: `${resource.name} marcado como ${resource.available ? 'no disponible' : 'disponible'}` });
  };

  const removeResource = (resourceId) => {
    if (user.role !== 'director') {
      toast({ title: "Sin permisos", description: "Solo el director puede eliminar recursos", variant: "destructive" });
      return;
    }
    onUpdateShop({ ...shopData, resources: shopData.resources.filter(r => r.id !== resourceId) });
    toast({ title: "Recurso eliminado" });
  };

  const columns = [
    { accessor: 'name', Header: 'Nombre' },
    { accessor: 'type', Header: 'Tipo', Cell: ({ value }) => resourceTypes.find(rt => rt.id === value)?.name || value },
    { accessor: 'capacity', Header: 'Capacidad' },
    { accessor: 'available', Header: 'Estado', Cell: ({ value }) => (
      <span className={`status-badge ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {value ? 'Disponible' : 'En Uso'}
      </span>
    )},
    { accessor: 'actions', Header: 'Acciones', Cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant={row.available ? "destructive" : "default"} onClick={() => toggleResourceAvailability(row.id)}>
          {row.available ? 'Ocupar' : 'Liberar'}
        </Button>
        {user.role === 'director' && (
          <Button size="sm" variant="outline" onClick={() => removeResource(row.id)}>Eliminar</Button>
        )}
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Recursos</h1>
        {user.role === 'director' && (
          <Button className="flex items-center gap-2" onClick={() => setShowAddResource(true)}>
            <Plus className="w-4 h-4" /> Añadir Recurso
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {resourceTypes.map(type => {
          const typeResources = shopData.resources.filter(r => r.type === type.id);
          const availableCount = typeResources.filter(r => r.available).length;
          return (
            <Card key={type.id}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${type.color} rounded-lg flex items-center justify-center`}>
                    <type.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{type.name}</h3>
                    <p className="text-sm text-gray-600">{availableCount}/{typeResources.length} disp.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Listado de Recursos</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveTable columns={columns} data={shopData.resources} />
        </CardContent>
      </Card>

      <ResponsiveSheet open={showAddResource} onOpenChange={setShowAddResource} title="Añadir Nuevo Recurso">
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="resourceName">Nombre del Recurso</Label>
            <Input id="resourceName" value={newResource.name} onChange={(e) => setNewResource({...newResource, name: e.target.value})} placeholder="Ej: Elevador Principal" />
          </div>
          <div>
            <Label htmlFor="resourceType">Tipo de Recurso</Label>
            <select id="resourceType" value={newResource.type} onChange={(e) => setNewResource({...newResource, type: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md bg-white">
              {resourceTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="resourceCapacity">Capacidad</Label>
            <Input id="resourceCapacity" type="number" min="1" value={newResource.capacity} onChange={(e) => setNewResource({...newResource, capacity: parseInt(e.target.value)})} />
          </div>
          <Button onClick={handleAddResource} className="w-full">Añadir Recurso</Button>
        </div>
      </ResponsiveSheet>
    </div>
  );
};

export default ResourcesView;