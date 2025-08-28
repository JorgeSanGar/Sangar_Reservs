import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Wrench, Users, UserPlus } from 'lucide-react';

const AuthPage = ({ onLogin }) => {
  const [loginData, setLoginData] = useState({ shopName: '', password: '' });
  const [registerData, setRegisterData] = useState({
    directorName: '',
    shopName: '',
    email: '',
    password: ''
  });
  const [workerData, setWorkerData] = useState({ inviteCode: '', workerName: '' });

  const handleLogin = (e) => {
    e.preventDefault();
    
    // Get shops from localStorage
    const shops = JSON.parse(localStorage.getItem('tire_shops') || '{}');
    const shop = shops[loginData.shopName];
    
    if (!shop) {
      toast({
        title: "Error",
        description: "Taller no encontrado",
        variant: "destructive"
      });
      return;
    }
    
    // Check director login
    if (shop.director.password === loginData.password) {
      onLogin({
        id: shop.director.id,
        name: shop.director.name,
        role: 'director',
        shopId: shop.id,
        shopName: shop.name,
        orgId: shop.orgId
      });
      return;
    }
    
    // Check worker login
    const worker = shop.workers.find(w => w.password === loginData.password);
    if (worker) {
      onLogin({
        id: worker.id,
        name: worker.name,
        role: 'worker',
        shopId: shop.id,
        shopName: shop.name,
        orgId: shop.orgId,
        siteId: shop.siteId
      });
      return;
    }
    
    toast({
      title: "Error",
      description: "Contraseña incorrecta",
      variant: "destructive"
    });
  };

  const handleRegisterShop = (e) => {
    e.preventDefault();
    
    const shops = JSON.parse(localStorage.getItem('tire_shops') || '{}');
    
    if (shops[registerData.shopName]) {
      toast({
        title: "Error",
        description: "Ya existe un taller con ese nombre",
        variant: "destructive"
      });
      return;
    }
    
    const orgId = `org_${Date.now()}`;
    const siteId = `site_${Date.now()}`;
    const directorId = `dir_${Date.now()}`;
    
    const newShop = {
      id: `shop_${Date.now()}`,
      name: registerData.shopName,
      orgId,
      siteId,
      director: {
        id: directorId,
        name: registerData.directorName,
        email: registerData.email,
        password: registerData.password
      },
      workers: [],
      inviteCodes: {},
      services: [
        { id: 'service_1', name: 'Cambio de neumáticos', category: 'Coche', duration: 45, price: 25, requiresBalancing: false },
        { id: 'service_2', name: 'Cambio + Equilibrado', category: 'Coche', duration: 60, price: 35, requiresBalancing: true },
        { id: 'service_3', name: 'Cambio 4x4/SUV', category: '4x4/SUV', duration: 60, price: 30, requiresBalancing: false },
        { id: 'service_4', name: 'Cambio Camión', category: 'Camión', duration: 90, price: 50, requiresBalancing: false },
        { id: 'service_5', name: 'Reparación Pinchazo', category: 'Coche', duration: 30, price: 15, requiresBalancing: false }
      ],
      resources: [
        { id: 'res_1', name: 'Elevador 1', type: 'elevador', capacity: 1, available: true },
        { id: 'res_2', name: 'Elevador 2', type: 'elevador', capacity: 1, available: true },
        { id: 'res_3', name: 'Equilibradora', type: 'equilibradora', capacity: 1, available: true },
        { id: 'res_4', name: 'Desmontadora', type: 'desmontadora', capacity: 1, available: true },
        { id: 'res_5', name: 'Estación de Agua', type: 'agua', capacity: 1, available: true }
      ],
      bookings: []
    };
    
    shops[registerData.shopName] = newShop;
    localStorage.setItem('tire_shops', JSON.stringify(shops));
    
    toast({
      title: "¡Éxito!",
      description: "Taller registrado correctamente"
    });
    
    onLogin({
      id: directorId,
      name: registerData.directorName,
      role: 'director',
      shopId: newShop.id,
      shopName: newShop.name,
      orgId
    });
  };

  const handleWorkerJoin = (e) => {
    e.preventDefault();
    
    const shops = JSON.parse(localStorage.getItem('tire_shops') || '{}');
    
    // Find shop with matching invite code
    let targetShop = null;
    let shopKey = null;
    
    for (const [key, shop] of Object.entries(shops)) {
      if (shop.inviteCodes[workerData.inviteCode]) {
        targetShop = shop;
        shopKey = key;
        break;
      }
    }
    
    if (!targetShop) {
      toast({
        title: "Error",
        description: "Código de invitación inválido",
        variant: "destructive"
      });
      return;
    }
    
    const workerId = `worker_${Date.now()}`;
    const workerPassword = `pass_${Math.random().toString(36).substr(2, 8)}`;
    
    const newWorker = {
      id: workerId,
      name: workerData.workerName,
      password: workerPassword,
      joinedAt: new Date().toISOString()
    };
    
    targetShop.workers.push(newWorker);
    delete targetShop.inviteCodes[workerData.inviteCode];
    
    shops[shopKey] = targetShop;
    localStorage.setItem('tire_shops', JSON.stringify(shops));
    
    toast({
      title: "¡Bienvenido!",
      description: `Tu contraseña es: ${workerPassword}`,
      duration: 10000
    });
    
    onLogin({
      id: workerId,
      name: workerData.workerName,
      role: 'worker',
      shopId: targetShop.id,
      shopName: targetShop.name,
      orgId: targetShop.orgId,
      siteId: targetShop.siteId
    });
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
          <h1 className="text-3xl font-bold gradient-text mb-2">TireShop Pro</h1>
          <p className="text-gray-600">Sistema de planificación para talleres</p>
        </div>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Acceso al Sistema</CardTitle>
            <CardDescription>
              Inicia sesión o registra tu taller
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Acceso
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
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
                    <Label htmlFor="shopName">Nombre del Taller</Label>
                    <Input
                      id="shopName"
                      value={loginData.shopName}
                      onChange={(e) => setLoginData({...loginData, shopName: e.target.value})}
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
                  <Button type="submit" className="w-full">
                    Iniciar Sesión
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
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
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
                  <Button type="submit" className="w-full">
                    Registrar Taller
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
                      onChange={(e) => setWorkerData({...workerData, inviteCode: e.target.value})}
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
                  <Button type="submit" className="w-full">
                    Unirse al Taller
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