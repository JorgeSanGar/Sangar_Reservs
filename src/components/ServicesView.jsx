import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, DollarSign, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/components/ui/use-toast';

const ServicesView = () => {
  const { services, createService, updateService, deleteService, userRole } = useAppData();
  const { toast } = useToast();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    duration_min: '',
    price: '',
    buffer_before_min: '0',
    buffer_after_min: '0'
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      duration_min: '',
      price: '',
      buffer_before_min: '0',
      buffer_after_min: '0'
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    const serviceData = {
      name: formData.name,
      category: formData.category,
      duration_min: parseInt(formData.duration_min),
      price: parseFloat(formData.price),
      buffer_before_min: parseInt(formData.buffer_before_min),
      buffer_after_min: parseInt(formData.buffer_after_min)
    };

    const { error } = await createService(serviceData);
    
    if (!error) {
      setShowCreateDialog(false);
      resetForm();
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category: service.category,
      duration_min: service.duration_min.toString(),
      price: service.price.toString(),
      buffer_before_min: service.buffer_before_min?.toString() || '0',
      buffer_after_min: service.buffer_after_min?.toString() || '0'
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    const updates = {
      name: formData.name,
      category: formData.category,
      duration_min: parseInt(formData.duration_min),
      price: parseFloat(formData.price),
      buffer_before_min: parseInt(formData.buffer_before_min),
      buffer_after_min: parseInt(formData.buffer_after_min)
    };

    const { error } = await updateService(editingService.id, updates);
    
    if (!error) {
      setEditingService(null);
      resetForm();
    }
  };

  const handleDelete = async (serviceId) => {
    await deleteService(serviceId);
  };

  const categories = [...new Set(services.map(s => s.category))];

  const isManager = userRole === 'manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-6 w-6" />
            Servicios del Taller
          </h1>
          <p className="text-gray-600">
            Gestiona los servicios que ofrece tu taller
          </p>
        </div>
        {isManager && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Servicio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Servicio</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Servicio</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Cambio de neumáticos"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="Ej: Neumáticos"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duración (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration_min}
                      onChange={(e) => setFormData({...formData, duration_min: e.target.value})}
                      placeholder="60"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="price">Precio (€)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="50.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bufferBefore">Buffer Antes (min)</Label>
                    <Input
                      id="bufferBefore"
                      type="number"
                      value={formData.buffer_before_min}
                      onChange={(e) => setFormData({...formData, buffer_before_min: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bufferAfter">Buffer Después (min)</Label>
                    <Input
                      id="bufferAfter"
                      type="number"
                      value={formData.buffer_after_min}
                      onChange={(e) => setFormData({...formData, buffer_after_min: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Crear Servicio
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{service.category}</p>
                  </div>
                  {isManager && (
                    <div className="flex items-center gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Servicio</DialogTitle>
                          </DialogHeader>
                          {editingService && (
                            <form onSubmit={handleUpdate} className="space-y-4">
                              <div>
                                <Label htmlFor="editName">Nombre del Servicio</Label>
                                <Input
                                  id="editName"
                                  value={formData.name}
                                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                                  required
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="editCategory">Categoría</Label>
                                <Input
                                  id="editCategory"
                                  value={formData.category}
                                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                                  required
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="editDuration">Duración (min)</Label>
                                  <Input
                                    id="editDuration"
                                    type="number"
                                    value={formData.duration_min}
                                    onChange={(e) => setFormData({...formData, duration_min: e.target.value})}
                                    required
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="editPrice">Precio (€)</Label>
                                  <Input
                                    id="editPrice"
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                                    required
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="editBufferBefore">Buffer Antes (min)</Label>
                                  <Input
                                    id="editBufferBefore"
                                    type="number"
                                    value={formData.buffer_before_min}
                                    onChange={(e) => setFormData({...formData, buffer_before_min: e.target.value})}
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="editBufferAfter">Buffer Después (min)</Label>
                                  <Input
                                    id="editBufferAfter"
                                    type="number"
                                    value={formData.buffer_after_min}
                                    onChange={(e) => setFormData({...formData, buffer_after_min: e.target.value})}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setEditingService(null)}>
                                  Cancelar
                                </Button>
                                <Button type="submit">
                                  Guardar Cambios
                                </Button>
                              </div>
                            </form>
                          )}
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente el servicio "{service.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(service.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{service.duration_min} minutos</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <DollarSign className="h-4 w-4" />
                      <span>€{service.price}</span>
                    </div>
                  </div>
                  
                  {(service.buffer_before_min > 0 || service.buffer_after_min > 0) && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      {service.buffer_before_min > 0 && (
                        <div>Buffer antes: {service.buffer_before_min} min</div>
                      )}
                      {service.buffer_after_min > 0 && (
                        <div>Buffer después: {service.buffer_after_min} min</div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12">
          <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay servicios configurados</h3>
          <p className="text-gray-600 mb-4">
            Comienza añadiendo los servicios que ofrece tu taller
          </p>
          {isManager && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Servicio
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ServicesView;