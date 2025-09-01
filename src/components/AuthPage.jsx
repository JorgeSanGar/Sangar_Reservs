import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { orgService, memberService, inviteService } from '@/lib/supabaseService';
import { Wrench, Users, UserPlus, Building } from 'lucide-react';

const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('login');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    directorName: '',
    shopName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [workerData, setWorkerData] = useState({ 
    inviteCode: '', 
    workerName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState({ login: false, register: false, worker: false });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, login: true }));
    
    try {
      const { error } = await signIn(loginData.email, loginData.password);
      if (!error) {
        toast({
          title: "¡Bienvenido!",
          description: "Has iniciado sesión exitosamente."
        });
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(prev => ({ ...prev, login: false }));
    }
  };

  const handleRegisterShop = async (e) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive"
      });
      return;
    }

    setLoading(prev => ({ ...prev, register: true }));
    
    try {
      // 1. Create user account
      const { data: authData, error: authError } = await signUp(
        registerData.email, 
        registerData.password,
        {
          data: {
            full_name: registerData.directorName,
            role: 'director'
          }
        }
      );

      if (authError) {
        if (authError.code === 'user_already_exists') {
          setLoginData(prev => ({ ...prev, email: registerData.email }));
          setActiveTab('login');
          toast({
            title: "Cuenta existente",
            description: "Ya existe una cuenta con este correo. Por favor, inicia sesión.",
          });
        }
        return;
      }

      // 2. Create organization
      const { data: orgData, error: orgError } = await orgService.createOrganization({
        name: registerData.shopName
      });

      if (orgError) {
        toast({
          title: "Error",
          description: "Error al crear la organización",
          variant: "destructive"
        });
        return;
      }

      // 3. Add user as manager of the organization
      const { error: memberError } = await memberService.addMember(
        orgData.id, 
        authData.user.id, 
        'manager'
      );

      if (memberError) {
        console.error('Error adding user as manager:', memberError);
        toast({
          title: "Error",
          description: "Error al asociar el usuario con la organización",
          variant: "destructive"
        });
        return;
        return;
      }

      toast({
        title: "¡Taller registrado!",
        description: "Tu taller ha sido creado exitosamente. Revisa tu correo para confirmar tu cuenta."
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Error",
        description: "Error durante el registro",
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, register: false }));
    }
  };

  const handleWorkerJoin = async (e) => {
    e.preventDefault();
    
    if (workerData.password !== workerData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive"
      });
      return;
    }

    setLoading(prev => ({ ...prev, worker: true }));
    
    try {
      // 1. Verify invite code exists and get org info
      const { data: inviteData, error: inviteError } = await supabase
        .from('invite_codes')
        .select(`
          *,
          orgs (
            id,
            name
          )
        `)
        .eq('code', workerData.inviteCode)
        .eq('used', false)
        .single();

      if (inviteError || !inviteData) {
        toast({
          title: "Error",
          description: "Código de invitación inválido o expirado",
          variant: "destructive"
        });
        return;
      }

      // 2. Create user account
      const { data: authData, error: authError } = await signUp(
        workerData.email,
        workerData.password,
        {
          data: {
            full_name: workerData.workerName,
            role: 'worker'
          }
        }
      );

      if (authError) {
        if (authError.code === 'user_already_exists') {
          setLoginData(prev => ({ ...prev, email: workerData.email }));
          setActiveTab('login');
          toast({
            title: "Cuenta existente",
            description: "Ya existe una cuenta con este correo. Por favor, inicia sesión.",
          });
        }
        return;
      }

      // 3. Add user as worker of the organization
      const { error: memberError } = await memberService.addMember(
        inviteData.org_id,
        authData.user.id,
        'worker'
      );

      if (memberError) {
        toast({
          title: "Error",
          description: "Error al unirse al taller",
          variant: "destructive"
        });
        return;
        return;
        return;
      }

      // 4. Mark invite code as used
      const { error: useError } = await inviteService.useInviteCode(
        workerData.inviteCode,
        authData.user.id
      );

      if (useError) {
        console.error('Error marking invite code as used:', useError);
      }

      toast({
        title: "¡Bienvenido al equipo!",
        description: `Te has unido exitosamente a ${inviteData.orgs.name}. Revisa tu correo para confirmar tu cuenta.`
      });
      
    } catch (error) {
      console.error('Worker join error:', error);
      toast({
        title: "Error",
        description: "Error al unirse al taller",
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, worker: false }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <Wrench className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold gradient-text mb-2">ReservaSangar</h1>
          <p className="text-gray-600">Sistema de planificación para talleres</p>
        </div>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Acceso al Sistema</CardTitle>
            <CardDescription>
              Inicia sesión, registra tu taller o únete como trabajador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Acceso
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Registro
                </TabsTrigger>
                <TabsTrigger value="worker" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Trabajador
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading.login}>
                    {loading.login ? 'Iniciando...' : 'Iniciar Sesión'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegisterShop} className="space-y-4">
                  <div>
                    <Label htmlFor="directorName">Nombre del Director</Label>
                    <Input
                      id="directorName"
                      value={registerData.directorName}
                      onChange={(e) => setRegisterData({...registerData, directorName: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="shopNameReg">Nombre del Taller</Label>
                    <Input
                      id="shopNameReg"
                      value={registerData.shopName}
                      onChange={(e) => setRegisterData({...registerData, shopName: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="emailReg">Correo Electrónico</Label>
                    <Input
                      id="emailReg"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="passwordReg">Contraseña</Label>
                    <Input
                      id="passwordReg"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPasswordReg">Confirmar Contraseña</Label>
                    <Input
                      id="confirmPasswordReg"
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading.register}>
                    {loading.register ? 'Registrando...' : 'Registrar Taller'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="worker">
                <form onSubmit={handleWorkerJoin} className="space-y-4">
                  <div>
                    <Label htmlFor="inviteCode">Código de Invitación</Label>
                    <Input
                      id="inviteCode"
                      value={workerData.inviteCode}
                      onChange={(e) => setWorkerData({...workerData, inviteCode: e.target.value.toUpperCase()})}
                      placeholder="Ej: ABC12345"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="workerName">Tu Nombre</Label>
                    <Input
                      id="workerName"
                      value={workerData.workerName}
                      onChange={(e) => setWorkerData({...workerData, workerName: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="workerEmail">Correo Electrónico</Label>
                    <Input
                      id="workerEmail"
                      type="email"
                      value={workerData.email}
                      onChange={(e) => setWorkerData({...workerData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="workerPassword">Contraseña</Label>
                    <Input
                      id="workerPassword"
                      type="password"
                      value={workerData.password}
                      onChange={(e) => setWorkerData({...workerData, password: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="workerConfirmPassword">Confirmar Contraseña</Label>
                    <Input
                      id="workerConfirmPassword"
                      type="password"
                      value={workerData.confirmPassword}
                      onChange={(e) => setWorkerData({...workerData, confirmPassword: e.target.value})}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading.worker}>
                    {loading.worker ? 'Uniéndose...' : 'Unirse al Taller'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthPage;