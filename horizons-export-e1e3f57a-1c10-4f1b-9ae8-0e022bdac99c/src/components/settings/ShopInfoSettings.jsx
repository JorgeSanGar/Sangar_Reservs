import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ShopInfoSettings = ({ shopData }) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>Nombre del Taller</Label>
        <Input value={shopData.name} disabled />
      </div>
      <div>
        <Label>Director</Label>
        <Input value={shopData.director.name} disabled />
      </div>
      <div>
        <Label>Correo Electrónico</Label>
        <Input value={shopData.director.email} disabled />
      </div>
      <div>
        <Label>ID de Organización</Label>
        <Input value={shopData.orgId} disabled className="font-mono text-xs" />
      </div>
    </div>
  );
};

export default ShopInfoSettings;