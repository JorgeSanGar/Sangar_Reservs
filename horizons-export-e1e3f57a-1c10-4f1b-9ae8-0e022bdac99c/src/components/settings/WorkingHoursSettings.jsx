import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Save, Plus, Trash2 } from 'lucide-react';

const WorkingHoursSettings = ({ user, shopData, onUpdateShop }) => {
  const daysOfWeek = {
    mon: 'Lunes',
    tue: 'Martes',
    wed: 'Miércoles',
    thu: 'Jueves',
    fri: 'Viernes',
    sat: 'Sábado',
    sun: 'Domingo'
  };

  const initializeWorkingHours = (data) => {
    const initialHours = { ...data.workingHours };
    Object.keys(daysOfWeek).forEach(day => {
      if (!initialHours[day]) {
        initialHours[day] = { open: null, close: null, breaks: [] };
      }
      if (!initialHours[day].breaks) {
        initialHours[day].breaks = [];
      }
    });
    return initialHours;
  };

  const [workingHours, setWorkingHours] = useState(() => initializeWorkingHours(shopData));

  useEffect(() => {
    setWorkingHours(initializeWorkingHours(shopData));
  }, [shopData.workingHours]);

  const handleHoursChange = (day, type, value) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [type]: value === '' ? null : value }
    }));
  };
  
  const handleBreakChange = (day, index, type, value) => {
    const newBreaks = [...workingHours[day].breaks];
    newBreaks[index][type] = value;
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], breaks: newBreaks }
    }));
  };

  const addBreak = (day) => {
    const newBreaks = [...workingHours[day].breaks, { start: '13:00', end: '14:00' }];
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], breaks: newBreaks }
    }));
  };

  const removeBreak = (day, index) => {
    const newBreaks = workingHours[day].breaks.filter((_, i) => i !== index);
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], breaks: newBreaks }
    }));
  };

  const handleSave = () => {
    for (const day in workingHours) {
      const { open, close, breaks } = workingHours[day];
      if (open && close && open >= close) {
        toast({
          title: "Error de validación",
          description: `En ${daysOfWeek[day]}, la hora de apertura debe ser anterior a la de cierre.`,
          variant: "destructive"
        });
        return;
      }
      for (const b of breaks) {
        if (b.start >= b.end) {
          toast({ title: "Error de validación", description: `En ${daysOfWeek[day]}, el descanso debe tener una hora de inicio anterior a la de fin.`, variant: "destructive" });
          return;
        }
        if (open && close && (timeToMinutes(b.start) < timeToMinutes(open) || timeToMinutes(b.end) > timeToMinutes(close))) {
          toast({ title: "Error de validación", description: `En ${daysOfWeek[day]}, los descansos deben estar dentro del horario de apertura.`, variant: "destructive" });
          return;
        }
      }
    }

    const newAuditLog = {
      timestamp: new Date().toISOString(),
      user: user.name,
      action: 'Actualización de horario del taller'
    };

    onUpdateShop({ ...shopData, workingHours, audit: [...(shopData.audit || []), newAuditLog] });
    toast({ title: "Horario guardado", description: "El horario del taller ha sido actualizado." });
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Define las horas de apertura, cierre y descansos para cada día.
      </p>
      {Object.keys(daysOfWeek).map(dayKey => (
        <div key={dayKey} className="space-y-2 p-3 border rounded-lg">
          <Label className="font-medium">{daysOfWeek[dayKey]}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input type="time" value={workingHours[dayKey]?.open || ''} onChange={(e) => handleHoursChange(dayKey, 'open', e.target.value)} aria-label={`Apertura ${daysOfWeek[dayKey]}`} />
            <Input type="time" value={workingHours[dayKey]?.close || ''} onChange={(e) => handleHoursChange(dayKey, 'close', e.target.value)} aria-label={`Cierre ${daysOfWeek[dayKey]}`} />
          </div>
          {workingHours[dayKey]?.breaks.map((breakItem, index) => (
            <div key={index} className="grid grid-cols-3 items-center gap-2">
              <Input type="time" value={breakItem.start} onChange={(e) => handleBreakChange(dayKey, index, 'start', e.target.value)} aria-label={`Inicio descanso ${index + 1} ${daysOfWeek[dayKey]}`} />
              <Input type="time" value={breakItem.end} onChange={(e) => handleBreakChange(dayKey, index, 'end', e.target.value)} aria-label={`Fin descanso ${index + 1} ${daysOfWeek[dayKey]}`} />
              <Button size="icon" variant="ghost" onClick={() => removeBreak(dayKey, index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => addBreak(dayKey)} className="flex items-center gap-1"><Plus className="w-3 h-3"/>Añadir Descanso</Button>
        </div>
      ))}
      <Button onClick={handleSave} className="w-full flex items-center gap-2">
        <Save className="w-4 h-4" />
        Guardar Horario
      </Button>
    </div>
  );
};

export default WorkingHoursSettings;