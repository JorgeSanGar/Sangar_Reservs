import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { ResponsiveSheet } from '@/components/sheets/ResponsiveSheet';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';

const ServiceSettings = ({ shopData, onUpdateShop }) => {
  const { toast } = useToast();
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({
    name: '', category: 'Coche', duration: 45, price: 25
  });
  const categories = ['Coche', '4x4/SUV', 'Camión', 'Tractor', 'Industrial'];

  const handleAddService = () => {
    if (!newService.name.trim()) {
      toast({ title: "Error", description: "El nombre del servicio es requerido", variant: "destructive" });
      return;
    }
    const service = { id: `service_${Date.now()}`, ...newService, createdAt: new Date().toISOString() };
    onUpdateShop({ ...shopData, services: [...shopData.services, service] });
    toast({ title: "¡Servicio añadido!", description: `${newService.name} ha sido añadido.` });
    setNewService({ name: '', category: 'Coche', duration: 45, price: 25 });
    setShowAddService(false);
  };

  const removeService = (serviceId) => {
    onUpdateShop({ ...shopData, services: shopData.services.filter(s => s.id !== serviceId) });
    toast({ title: "Servicio eliminado" });
  };

  const columns = [
    { accessor: 'name', Header: 'Nombre' },
    { accessor: 'category', Header: 'Categoría' },
    { accessor: 'duration', Header: 'Duración (min)' },
    { accessor: 'price', Header: 'Precio (€)' },
    { accessor: 'actions', Header: 'Acciones', Cell: ({ row }) => (
      <Button size="sm" variant="destructive" onClick={() => removeService(row.id)}>
        <Trash2 className="w-4 h-4" />
      </Button>
    )}
  ];

  return (
    <div className="space-y-4">
      <Button className="w-full flex items-center gap-2" onClick={() => setShowAddService(true)}>
        <Plus className="w-4 h-4" />Añadir Servicio
      </Button>
      
      <ResponsiveTable columns={columns} data={shopData.services} />

      <ResponsiveSheet open={showAddService} onOpenChange={setShowAddService} title="Añadir Nuevo Servicio">
        <div className="p-4 space-y-4">
          <div><Label htmlFor="sName">Nombre</Label><Input id="sName" value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} /></div>
          <div><Label htmlFor="sCat">Categoría</Label><select id="sCat" value={newService.category} onChange={(e) => setNewService({...newService, category: e.target.value})} className="w-full p-2 border rounded-md bg-white"><option>Coche</option><option>4x4/SUV</option><option>Camión</option><option>Tractor</option><option>Industrial</option></select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label htmlFor="sDur">Duración (min)</Label><Input id="sDur" type="number" value={newService.duration} onChange={(e) => setNewService({...newService, duration: parseInt(e.target.value)})} /></div>
            <div><Label htmlFor="sPrice">Precio (€)</Label><Input id="sPrice" type="number" value={newService.price} onChange={(e) => setNewService({...newService, price: parseFloat(e.target.value)})} /></div>
          </div>
          <Button onClick={handleAddService} className="w-full">Añadir</Button>
        </div>
      </ResponsiveSheet>
    </div>
  );
};

export default ServiceSettings;