import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Wrench, User, Car, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAppData } from '@/contexts/AppDataContext';

const ResourcesView = () => {
  const { resources, createResource, updateResource, deleteResource, userRole } = useAppData();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    is_active: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      is_active: true
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    const { error } = await createResource(formData);
    
    if (!error) {
      setShowCreateDialog(false);
      resetForm();
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      type: resource.type,
      is_active: resource.is_active
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    const { error } = await updateResource(editingResource.id, formData);
    
    if (!error) {
      setEditingResource(null);
      resetForm();
    }
  };

  const handleDelete = async (resourceId) => {
    await deleteResource(resourceId);
  };

  const getResourceIcon = (type) => {
    switch (type) {
      case 'technician':
        return <User className="h-5 w-5" />;
      case 'bay':
        return <Car className="h-5 w-5" />;
      case 'equipment':
        return <Settings className="h-5 w-5" />;
      default:
        return <Wrench className="h-5 w-5" />;
    }
  };

  const getResourceTypeLabel = (type) => {
    switch (type) {
      case 'technician':
        return 'Técnico';
      case 'bay':
        return 'Bahía';
      case 'equipment':
        return 'Equipo';
      default:
        return type;
    }
  };

  const resourcesByType = resources.reduce((acc, resource) => {
    if (!acc[resource.type]) {
      acc[resource.type] = [];
    }
    acc[resource.type].push(resource);
    return acc;
  }, {});

  const isManager = userRole === 'manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Recursos del Taller
          </h1>
          <p className="text-gray-600">
            Gestiona técnicos, bahías y equipamiento
          </p>
        </div>
        {isManager && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Recurso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Recurso</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Recurso</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Juan Pérez, Bahía 1, Elevador A"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Tipo de Recurso</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technician">Técnico</SelectItem>
                      <SelectItem value="bay">Bahía</SelectItem>
                      <SelectItem value="equipment">Equipo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="active">Recurso activo</Label>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Crear Recurso
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Resources by Type */}
      {Object.keys(resourcesByType).length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay recursos configurados</h3>
          <p className="text-gray-600 mb-4">
            Añade técnicos, bahías y equipamiento para gestionar la capacidad del taller
          </p>
          {isManager && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Recurso
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(resourcesByType).map(([type, typeResources]) => (
            <div key={type}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {getResourceIcon(type)}
                {getResourceTypeLabel(type)}s ({typeResources.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {typeResources.map((resource) => (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className={`h-full ${!resource.is_active ? 'opacity-60' : ''}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getResourceIcon(resource.type)}
                            <div>
                              <CardTitle className="text-base">{resource.name}</CardTitle>
                              <p className="text-sm text-gray-600">
                                {getResourceTypeLabel(resource.type)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              resource.is_active ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            {isManager && (
                              <div className="flex items-center gap-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(resource)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Editar Recurso</DialogTitle>
                                    </DialogHeader>
                                    {editingResource && (
                                      <form onSubmit={handleUpdate} className="space-y-4">
                                        <div>
                                          <Label htmlFor="editResourceName">Nombre del Recurso</Label>
                                          <Input
                                            id="editResourceName"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            required
                                          />
                                        </div>
                                        
                                        <div>
                                          <Label htmlFor="editResourceType">Tipo de Recurso</Label>
                                          <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="technician">Técnico</SelectItem>
                                              <SelectItem value="bay">Bahía</SelectItem>
                                              <SelectItem value="equipment">Equipo</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            id="editActive"
                                            checked={formData.is_active}
                                            onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                                          />
                                          <Label htmlFor="editActive">Recurso activo</Label>
                                        </div>
                                        
                                        <div className="flex justify-end gap-2">
                                          <Button type="button" variant="outline" onClick={() => setEditingResource(null)}>
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
                                      <AlertDialogTitle>¿Eliminar recurso?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Se eliminará permanentemente el recurso "{resource.name}".
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(resource.id)}
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
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-gray-600">
                          <p>Estado: {resource.is_active ? 'Activo' : 'Inactivo'}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Creado: {new Date(resource.created_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourcesView;