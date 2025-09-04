import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Clock, Users, UserPlus, Copy, Trash2, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { inviteService } from '@/lib/supabaseService';
import { useToast } = from '@/components/ui/use-toast';
import WorkingHoursConfig from '@/components/settings/WorkingHoursConfig';

const SettingsView = () => {
  const { orgData, members, refreshMembers } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [inviteCodes, setInviteCodes] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const loadInviteCodes = async () => {
    if (!orgData) return;
    
    setLoadingInvites(true);
    try {
      const { data, error } = await inviteService.getInviteCodes(orgData.id);
      if (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los códigos de invitación",
          variant: "destructive"
        });
      } else {
        setInviteCodes(data || []);
      }
    } catch (error) {
      console.error('Error loading invite codes:', error);
    } finally {
      setLoadingInvites(false);
    }
  };

  const createInviteCode = async () => {
    if (!orgData || !user) return;
    
    setCreatingInvite(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
      
      const { data, error } = await inviteService.createInviteCode(
        orgData.id, 
        user.id, 
        expiresAt.toISOString()
      );
      
      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear el código de invitación",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Código creado",
          description: "El código de invitación ha sido creado exitosamente"
        });
        loadInviteCodes();
      }
    } catch (error) {
      console.error('Error creating invite code:', error);
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Código copiado",
      description: "El código de invitación ha sido copiado al portapapeles"
    });
  };

  const revokeInviteCode = async (codeId) => {
    try {
      const { error } = await inviteService.revokeInviteCode(codeId);
      if (error) {
        toast({
          title: "Error",
          description: "No se pudo revocar el código de invitación",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Código revocado",
          description: "El código de invitación ha sido revocado"
        });
        loadInviteCodes();
      }
    } catch (error) {
      console.error('Error revoking invite code:', error);
    }
  };

  React.useEffect(() => {
    loadInviteCodes();
  }, [orgData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configuración del Taller
        </h1>
        <p className="text-gray-600">
          Gestiona la configuración y ajustes de tu taller
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horarios
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Equipo
          </TabsTrigger>
          <TabsTrigger value="invites" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invitaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="orgName">Nombre del Taller</Label>
                  <Input
                    id="orgName"
                    value={orgData?.name || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Contacta con soporte para cambiar el nombre del taller
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Input
                    id="timezone"
                    value={orgData?.timezone || 'Europe/Madrid'}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                
                <div>
                  <Label htmlFor="createdAt">Fecha de Creación</Label>
                  <Input
                    id="createdAt"
                    value={orgData?.created_at ? new Date(orgData.created_at).toLocaleDateString('es-ES') : ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="hours">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <WorkingHoursConfig />
          </motion.div>
        </TabsContent>

        <TabsContent value="team">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Miembros del Equipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {member.users?.raw_user_meta_data?.full_name || member.users?.email || 'Usuario sin nombre'}
                          </p>
                          <p className="text-xs text-gray-600">{member.users?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          member.role === 'manager' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.role === 'manager' ? 'Director' : 'Trabajador'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(member.joined_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {members.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay miembros en el equipo</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="invites">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Códigos de Invitación</CardTitle>
                  <Button 
                    onClick={createInviteCode}
                    disabled={creatingInvite}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    {creatingInvite ? 'Creando...' : 'Crear Código'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loadingInvites ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : inviteCodes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay códigos de invitación activos</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Crea un código para invitar trabajadores a tu taller
                      </p>
                    </div>
                  ) : (
                    inviteCodes.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-mono text-lg font-bold">{invite.code}</p>
                          <p className="text-xs text-gray-600">
                            Creado: {new Date(invite.created_at).toLocaleDateString('es-ES')}
                            {invite.expires_at && (
                              <> • Expira: {new Date(invite.expires_at).toLocaleDateString('es-ES')}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteCode(invite.code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Revocar código de invitación?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El código "{invite.code}" ya no podrá ser utilizado.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revokeInviteCode(invite.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Revocar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {inviteCodes.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Instrucciones:</strong> Comparte estos códigos con los trabajadores que quieras invitar. 
                      Podrán usarlos en la página de registro para unirse a tu taller.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsView;