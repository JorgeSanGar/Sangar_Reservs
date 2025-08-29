import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/components/ui/use-toast';

const WorkingHoursConfig = () => {
  const { workingHours, saveWorkingHours } = useAppData();
  const { toast } = useToast();
  
  const [localHours, setLocalHours] = useState({});
  const [saving, setSaving] = useState(false);

  const dayNames = {
    mon: 'Lunes',
    tue: 'Martes',
    wed: 'Miércoles',
    thu: 'Jueves',
    fri: 'Viernes',
    sat: 'Sábado',
    sun: 'Domingo'
  };

  useEffect(() => {
    setLocalHours(workingHours);
  }, [workingHours]);

  const updateDayHours = (day, field, value) => {
    setLocalHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const toggleDay = (day, enabled) => {
    if (enabled) {
      setLocalHours(prev => ({
        ...prev,
        [day]: {
          open: '09:00',
          close: '18:00',
          breaks: []
        }
      }));
    } else {
      setLocalHours(prev => ({
        ...prev,
        [day]: {
          open: null,
          close: null,
          breaks: []
        }
      }));
    }
  };

  const addBreak = (day) => {
    setLocalHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: [
          ...(prev[day]?.breaks || []),
          { start: '12:00', end: '13:00' }
        ]
      }
    }));
  };

  const updateBreak = (day, breakIndex, field, value) => {
    setLocalHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day].breaks.map((breakItem, index) =>
          index === breakIndex ? { ...breakItem, [field]: value } : breakItem
        )
      }
    }));
  };

  const removeBreak = (day, breakIndex) => {
    setLocalHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day].breaks.filter((_, index) => index !== breakIndex)
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await saveWorkingHours(localHours);
      if (!error) {
        toast({
          title: "Horarios guardados",
          description: "Los horarios de trabajo han sido actualizados"
        });
      }
    } catch (error) {
      console.error('Error saving working hours:', error);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(localHours) !== JSON.stringify(workingHours);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horarios de Trabajo
          </CardTitle>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(dayNames).map(([dayKey, dayLabel]) => {
            const dayData = localHours[dayKey] || { open: null, close: null, breaks: [] };
            const isOpen = dayData.open && dayData.close;
            
            return (
              <motion.div
                key={dayKey}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">{dayLabel}</h3>
                  <Switch
                    checked={isOpen}
                    onCheckedChange={(checked) => toggleDay(dayKey, checked)}
                  />
                </div>
                
                {isOpen && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`${dayKey}-open`}>Apertura</Label>
                        <Input
                          id={`${dayKey}-open`}
                          type="time"
                          value={dayData.open || ''}
                          onChange={(e) => updateDayHours(dayKey, 'open', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${dayKey}-close`}>Cierre</Label>
                        <Input
                          id={`${dayKey}-close`}
                          type="time"
                          value={dayData.close || ''}
                          onChange={(e) => updateDayHours(dayKey, 'close', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {/* Breaks */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Descansos</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addBreak(dayKey)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Añadir
                        </Button>
                      </div>
                      
                      {dayData.breaks?.map((breakItem, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                          <Input
                            type="time"
                            value={breakItem.start}
                            onChange={(e) => updateBreak(dayKey, index, 'start', e.target.value)}
                            className="flex-1"
                          />
                          <span className="text-gray-500">-</span>
                          <Input
                            type="time"
                            value={breakItem.end}
                            onChange={(e) => updateBreak(dayKey, index, 'end', e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBreak(dayKey, index)}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkingHoursConfig;