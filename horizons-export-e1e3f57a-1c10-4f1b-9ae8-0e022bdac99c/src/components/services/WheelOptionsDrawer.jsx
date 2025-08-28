import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Clock, AlertTriangle } from 'lucide-react';
import { estimateDuration } from '@/lib/estimatorClient';
import { debounce } from 'lodash';
import { ResponsiveSheet } from '@/components/sheets/ResponsiveSheet';

const WheelOptionsDrawer = ({ isOpen, onClose, service, orgId, onContinue }) => {
  const [estimatedTime, setEstimatedTime] = useState(null);
  
  const category = service.category.toLowerCase();

  const schema = useMemo(() => {
    let schemaObject = {
      pinchazo: z.boolean().default(false),
      wheels: z.number().min(1),
    };

    if (category === 'coche' || category === '4x4') {
      schemaObject.wheels = z.number().min(1).max(4);
      schemaObject.equilibradoCount = z.number().min(0).max(4).default(0);
      schemaObject.alineado = z.boolean().default(false);
    } else if (category === 'camion') {
      schemaObject.wheels = z.number().min(1).max(12);
      schemaObject.equilibradoCamion = z.enum(['none', 'one', 'two_front']).default('none');
    } else if (category === 'tractor' || category === 'industrial') {
      schemaObject.eje = z.enum(['front', 'rear']).default('front');
    }

    if (category === 'tractor') {
        schemaObject.wheels = z.number().min(1).max(2);
        schemaObject.conCamara = z.boolean().default(false);
        schemaObject.llenadoAgua = z.object({
            enabled: z.boolean().default(false),
            litros: z.coerce.number().min(1, 'Debe ser mayor a 0').optional()
        });
    }

    if (category === 'industrial') {
        schemaObject.wheels = z.number().min(1).max(4);
        schemaObject.equilibradoCount = z.number().min(0).max(4).default(0);
    }
    
    return z.object(schemaObject).superRefine((data, ctx) => {
        if((category === 'coche' || category === '4x4' || category === 'industrial') && data.equilibradoCount > data.wheels) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Equilibrado no puede exceder el nº de ruedas.", path: ['equilibradoCount'] });
        }
        if(category === 'tractor' && data.llenadoAgua?.enabled && (data.llenadoAgua.litros === undefined || data.llenadoAgua.litros <= 0)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Especifique los litros.", path: ['llenadoAgua.litros'] });
        }
    });
  }, [category]);
  
  const defaultValues = {
    pinchazo: false,
    wheels: category === 'coche' || category === '4x4' ? 2 : 1,
    equilibradoCount: 0,
    alineado: false,
    equilibradoCamion: 'none',
    eje: 'front',
    conCamara: false,
    llenadoAgua: { enabled: false, litros: undefined }
  };

  const { control, handleSubmit, watch, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues,
    mode: 'onChange'
  });

  const formData = watch();

  const debouncedEstimate = useCallback(
    debounce(async (data) => {
      if (!isValid) return;
      const payload = {
        orgId,
        serviceId: service.id,
        category,
        wheels: data.wheels,
        options: {
          pinchazo: data.pinchazo,
          equilibradoCount: data.equilibradoCount,
          equilibradoCamion: data.equilibradoCamion,
          alineado: data.alineado,
          eje: data.eje,
          conCamara: data.conCamara,
          llenadoAgua: data.llenadoAgua
        }
      };
      const result = await estimateDuration(payload);
      setEstimatedTime(result);
    }, 300),
    [orgId, service.id, category, isValid]
  );
  
  useEffect(() => {
    const subscription = watch((value) => {
      debouncedEstimate(value);
    });
    return () => subscription.unsubscribe();
  }, [watch, debouncedEstimate]);

  const onSubmit = (data) => {
    onContinue({ payload: data, minutes: estimatedTime?.minutes || 0 });
  };
  
  return (
    <ResponsiveSheet open={isOpen} onOpenChange={onClose} title="Configurar Ruedas" description={service.name}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div>
          <Controller name="pinchazo" control={control} render={({ field }) => (
            <div className="flex items-center space-x-2"><Switch id="pinchazo" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="pinchazo">Es un pinchazo (reemplaza cambio)</Label></div>
          )}/>
        </div>

        <FieldGroup title="Ruedas">
          <Controller name="wheels" control={control} render={({ field }) => (
            <div>
              <Label>Nº de Ruedas: {field.value}</Label>
              <Slider disabled={formData.pinchazo} value={[field.value]} onValueChange={(v) => field.onChange(v[0])} min={1} max={category==='camion'?12:4} step={1} />
            </div>
          )}/>
        </FieldGroup>
        
        <FieldGroup title="Extras">
          {(category === 'coche' || category === '4x4') && <>
            <Controller name="equilibradoCount" control={control} render={({ field }) => (
              <div><Label>Equilibrado: {field.value}</Label><Slider value={[field.value]} onValueChange={v => field.onChange(v[0])} min={0} max={formData.wheels} step={1} /></div>
            )}/>
            {errors.equilibradoCount && <p className="text-red-500 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{errors.equilibradoCount.message}</p>}
            <Controller name="alineado" control={control} render={({ field }) => (
              <div className="flex items-center space-x-2"><Switch id="alineado" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="alineado">Alineado</Label></div>
            )}/>
          </>}
          {category === 'camion' && 
            <Controller name="equilibradoCamion" control={control} render={({ field }) => (
              <RadioGroup onValueChange={field.onChange} defaultValue={field.value}>
                  <Label>Equilibrado Camión</Label>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="none" id="none" /><Label htmlFor="none">Ninguno</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="one" id="one" /><Label htmlFor="one">1 rueda</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="two_front" id="two_front" /><Label htmlFor="two_front">2 delanteras</Label></div>
              </RadioGroup>
            )}/>
          }
          {category === 'tractor' && <>
              <Controller name="eje" control={control} render={({ field }) => (
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value}><Label>Eje</Label>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="front" id="front" /><Label htmlFor="front">Delantero</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="rear" id="rear" /><Label htmlFor="rear">Trasero</Label></div>
                  </RadioGroup>
              )}/>
              <Controller name="conCamara" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Switch id="conCamara" checked={field.value} onCheckedChange={field.onChange}/><Label htmlFor="conCamara">Con Cámara</Label></div>)}/>
              <Controller name="llenadoAgua.enabled" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Switch id="llenadoAgua" checked={field.value} onCheckedChange={field.onChange}/><Label htmlFor="llenadoAgua">Llenado de Agua</Label></div>)}/>
              {formData.llenadoAgua?.enabled && <Controller name="llenadoAgua.litros" control={control} render={({ field }) => (
                  <div><Label htmlFor="litros">Litros</Label><Input id="litros" type="number" {...field} />{errors.llenadoAgua?.litros && <p className="text-red-500 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{errors.llenadoAgua.litros.message}</p>}</div>
              )}/>}
          </>}
           {category === 'industrial' && <>
              <Controller name="eje" control={control} render={({ field }) => (
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value}><Label>Eje</Label>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="front" id="r_front" /><Label htmlFor="r_front">Delantero</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="rear" id="r_rear" /><Label htmlFor="r_rear">Trasero</Label></div>
                  </RadioGroup>
              )}/>
              <Controller name="equilibradoCount" control={control} render={({ field }) => (
                <div><Label>Equilibrado: {field.value}</Label><Slider value={[field.value]} onValueChange={v => field.onChange(v[0])} min={0} max={formData.wheels} step={1} /></div>
              )}/>
              {errors.equilibradoCount && <p className="text-red-500 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{errors.equilibradoCount.message}</p>}
           </>}
        </FieldGroup>
      </form>

      <footer className="p-4 border-t bg-gray-50 sticky bottom-0">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold">Tiempo estimado:</span>
          <div className="flex items-center gap-2 text-lg font-bold text-blue-600">
            <Clock className="w-5 h-5"/>
            {estimatedTime ? `${estimatedTime.minutes} min` : 'Calculando...'}
          </div>
        </div>
        <Button type="submit" onClick={handleSubmit(onSubmit)} className="w-full" disabled={!isValid}>Continuar</Button>
      </footer>
    </ResponsiveSheet>
  );
};

const FieldGroup = ({ title, children }) => (
  <div className="border p-4 rounded-lg space-y-4">
    <h3 className="font-medium text-gray-600">{title}</h3>
    {children}
  </div>
);

export default WheelOptionsDrawer;