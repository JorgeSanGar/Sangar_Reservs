import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Plus, Copy, Trash2 } from 'lucide-react';

const WorkerSettings = ({ user, shopData, onUpdateShop }) => {
  const [showInviteWorker, setShowInviteWorker] = useState(false);

  const generateInviteCode = () => {
    const code = Math.random().toString(36).substr(2, 8).toUpperCase();
    const updatedInviteCodes = {
      ...shopData.inviteCodes,
      [code]: { createdAt: new Date().toISOString(), createdBy: user.id, used: false }
    };
    onUpdateShop({ ...shopData, inviteCodes: updatedInviteCodes });
    toast({ title: "Código de invitación generado", description: `Código: ${code}`, duration: 10000 });
  };

  const revokeInviteCode = (code) => {
    const updatedInviteCodes = { ...shopData.inviteCodes };
    delete updatedInviteCodes[code];
    onUpdateShop({ ...shopData, inviteCodes: updatedInviteCodes });
    toast({ title: "Código revocado", description: "El código de invitación ha sido revocado" });
  };
  
  const removeWorker = (workerId) => {
    const updatedWorkers = shopData.workers.filter(worker => worker.id !== workerId);
    onUpdateShop({ ...shopData, workers: updatedWorkers });
    toast({ title: "Trabajador eliminado", description: "El trabajador ha sido eliminado del taller" });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copiado", description: "Código copiado al portapapeles" });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Trabajadores Activos: {shopData.workers.length}</span>
        <Dialog open={showInviteWorker} onOpenChange={setShowInviteWorker}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2"><Plus className="w-4 h-4" />Invitar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invitar Trabajador</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Genera un código de un solo uso para un nuevo trabajador.</p>
              <Button onClick={generateInviteCode} className="w-full">Generar Código</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {shopData.workers.map(worker => (
          <div key={worker.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <span className="font-medium">{worker.name}</span>
            <Button size="sm" variant="destructive" onClick={() => removeWorker(worker.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
      </div>

      {Object.keys(shopData.inviteCodes).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Códigos de Invitación Activos</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {Object.entries(shopData.inviteCodes).map(([code]) => (
              <div key={code} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <span className="font-mono text-sm">{code}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(code)}><Copy className="w-4 h-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => revokeInviteCode(code)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerSettings;