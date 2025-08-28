@@ .. @@
 import React, { useState } from 'react';
 import { motion } from 'framer-motion';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
-import { toast } from '@/components/ui/use-toast';
+import { useToast } from '@/components/ui/use-toast';
 import { Wrench, Users, UserPlus } from 'lucide-react';
+import { useAuth } from '@/contexts/SupabaseAuthContext';
+import { 
+  orgService, 
+  memberService, 
+  serviceService, 
+  resourceService, 
+  inviteService,
+  utilService 
+} from '@/lib/supabaseService';
 
-const AuthPage = ({ onLogin }) => {
+const AuthPage = () => {
+  const { signIn, signUp } = useAuth();
+  const { toast } = useToast();
+  
   const [loginData, setLoginData] = useState({ shopName: '', password: '' });
   const [registerData, setRegisterData] = useState({
     directorName: '',
     shopName: '',
     email: '',
     password: ''
   });
   const [workerData, setWorkerData] = useState({ inviteCode: '', workerName: '' });
+  const [loading, setLoading] = useState(false);
 
-  const handleLogin = (e) => {
+  const handleLogin = async (e) => {
     e.preventDefault();
-    
-    // Get shops from localStorage
-    const shops = JSON.parse(localStorage.getItem('tire_shops') || '{}');
-    const shop = shops[loginData.shopName];
-    
-    if (!shop) {
+    setLoading(true);
+
+    try {
+      const { error } = await signIn(loginData.email || loginData.shopName, loginData.password);
+      
+      if (error) {
+        toast({
+          title: "Error de autenticación",
+          description: await utilService.handleSupabaseError(error),
+          variant: "destructive"
+        });
+      }
+    } catch (error) {
       toast({
         title: "Error",
-        description: "Taller no encontrado",
+        description: "Error al iniciar sesión",
         variant: "destructive"
       });
-      return;
+    } finally {
+      setLoading(false);
     }
-    
-    // Check director login
-    if (shop.director.password === loginData.password) {
-      onLogin({
-        id: shop.director.id,
-        name: shop.director.name,
-        role: 'director',
-        shopId: shop.id,
-        shopName: shop.name,
-        orgId: shop.orgId
-      });
-      return;
-    }
-    
-    // Check worker login
-    const worker = shop.workers.find(w => w.password === loginData.password);
-    if (worker) {
-      onLogin({
-        id: worker.id,
-        name: worker.name,
-        role: 'worker',
-        shopId: shop.id,
-        shopName: shop.name,
-        orgId: shop.orgId,
-        siteId: shop.siteId
-      });
-      return;
-    }
-    
-    toast({
-      title: "Error",
-      description: "Contraseña incorrecta",
-      variant: "destructive"
-    });
   };
 
-  const handleRegisterShop = (e) => {
+  const handleRegisterShop = async (e) => {
     e.preventDefault();
-    
-    const shops = JSON.parse(localStorage.getItem('tire_shops') || '{}');
-    
-    if (shops[registerData.shopName]) {
+    setLoading(true);
+
+    try {
+      // Create user account
+      const { data: authData, error: authError } = await signUp(
+        registerData.email,
+        registerData.password,
+        {
+          name: registerData.directorName,
+          role: 'manager'
+        }
+      );
+
+      if (authError) {
+        toast({
+          title: "Error de registro",
+          description: await utilService.handleSupabaseError(authError),
+          variant: "destructive"
+        });
+        return;
+      }
+
+      if (!authData.user) {
+        toast({
+          title: "Error",
+          description: "No se pudo crear la cuenta de usuario",
+          variant: "destructive"
+        });
+        return;
+      }
+
+      // Create organization
+      const { data: orgData, error: orgError } = await orgService.createOrganization({
+        name: registerData.shopName
+      });
+
+      if (orgError) {
+        toast({
+          title: "Error",
+          description: await utilService.handleSupabaseError(orgError),
+          variant: "destructive"
+        });
+        return;
+      }
+
+      // Add user as manager of the organization
+      const { error: memberError } = await memberService.addMember(
+        orgData.id,
+        authData.user.id,
+        'manager'
+      );
+
+      if (memberError) {
+        console.error('Error adding user as member:', memberError);
+      }
+
+      // Create default services
+      const defaultServices = [
+        { name: 'Cambio de neumáticos', category: 'Coche', duration_min: 45, price: 25 },
+        { name: 'Cambio + Equilibrado', category: 'Coche', duration_min: 60, price: 35 },
+        { name: 'Cambio 4x4/SUV', category: '4x4', duration_min: 60, price: 30 },
+        { name: 'Cambio Camión', category: 'Camión', duration_min: 90, price: 50 },
+        { name: 'Reparación Pinchazo', category: 'Coche', duration_min: 30, price: 15 }
+      ];
+
+      for (const service of defaultServices) {
+        await serviceService.createService({
+          ...service,
+          org_id: orgData.id
+        });
+      }
+
+      // Create default resources
+      const defaultResources = [
+        { name: 'Elevador 1', type: 'elevador', capacity: 1 },
+        { name: 'Elevador 2', type: 'elevador', capacity: 1 },
+        { name: 'Equilibradora', type: 'equilibradora', capacity: 1 },
+        { name: 'Desmontadora', type: 'desmontadora', capacity: 1 },
+        { name: 'Estación de Agua', type: 'agua', capacity: 1 }
+      ];
+
+      for (const resource of defaultResources) {
+        await resourceService.createResource({
+          ...resource,
+          org_id: orgData.id
+        });
+      }
+
       toast({
-        title: "Error",
-        description: "Ya existe un taller con ese nombre",
-        variant: "destructive"
+        title: "¡Éxito!",
+        description: "Taller registrado correctamente. Revisa tu email para confirmar la cuenta."
       });
-      return;
+
+    } catch (error) {
+      console.error('Registration error:', error);
+      toast({
+        title: "Error",
+        description: "Error al registrar el taller",
+        variant: "destructive"
+      });
+    } finally {
+      setLoading(false);
     }
-    
-    const orgId = `org_${Date.now()}`;
-    const siteId = `site_${Date.now()}`;
-    const directorId = `dir_${Date.now()}`;
-    
-    const newShop = {
-      id: `shop_${Date.now()}`,
-      name: registerData.shopName,
-      orgId,
-      siteId,
-      director: {
-        id: directorId,
-        name: registerData.directorName,
-        email: registerData.email,
-        password: registerData.password
-      },
-      workers: [],
-      inviteCodes: {},
-      services: [
-        { id: 'service_1', name: 'Cambio de neumáticos', category: 'Coche', duration: 45, price: 25, requiresBalancing: false },
-        { id: 'service_2', name: 'Cambio + Equilibrado', category: 'Coche', duration: 60, price: 35, requiresBalancing: true },
-        { id: 'service_3', name: 'Cambio 4x4/SUV', category: '4x4/SUV', duration: 60, price: 30, requiresBalancing: false },
-        { id: 'service_4', name: 'Cambio Camión', category: 'Camión', duration: 90, price: 50, requiresBalancing: false },
-        { id: 'service_5', name: 'Reparación Pinchazo', category: 'Coche', duration: 30, price: 15, requiresBalancing: false }
-      ],
-      resources: [
-        { id: 'res_1', name: 'Elevador 1', type: 'elevador', capacity: 1, available: true },
-        { id: 'res_2', name: 'Elevador 2', type: 'elevador', capacity: 1, available: true },
-        { id: 'res_3', name: 'Equilibradora', type: 'equilibradora', capacity: 1, available: true },
-        { id: 'res_4', name: 'Desmontadora', type: 'desmontadora', capacity: 1, available: true },
-        { id: 'res_5', name: 'Estación de Agua', type: 'agua', capacity: 1, available: true }
-      ],
-      bookings: []
-    };
-    
-    shops[registerData.shopName] = newShop;
-    localStorage.setItem('tire_shops', JSON.stringify(shops));
-    
-    toast({
-      title: "¡Éxito!",
-      description: "Taller registrado correctamente"
-    });
-    
-    onLogin({
-      id: directorId,
-      name: registerData.directorName,
-      role: 'director',
-      shopId: newShop.id,
-      shopName: newShop.name,
-      orgId
-    });
   };
 
-  const handleWorkerJoin = (e) => {
+  const handleWorkerJoin = async (e) => {
     e.preventDefault();
-    
-    const shops = JSON.parse(localStorage.getItem('tire_shops') || '{}');
-    
-    // Find shop with matching invite code
-    let targetShop = null;
-    let shopKey = null;
-    
-    for (const [key, shop] of Object.entries(shops)) {
-      if (shop.inviteCodes[workerData.inviteCode]) {
-        targetShop = shop;
-        shopKey = key;
-        break;
+    setLoading(true);
+
+    try {
+      // First, verify the invite code exists and get org info
+      const { data: inviteData, error: inviteError } = await inviteService.useInviteCode(
+        workerData.inviteCode,
+        null // We'll update this after creating the user
+      );
+
+      if (inviteError) {
+        toast({
+          title: "Error",
+          description: "Código de invitación inválido o expirado",
+          variant: "destructive"
+        });
+        return;
       }
-    }
-    
-    if (!targetShop) {
+
+      // Generate a temporary password for the worker
+      const tempPassword = `temp_${Math.random().toString(36).substr(2, 8)}`;
+      const workerEmail = `${workerData.workerName.toLowerCase().replace(/\s+/g, '.')}@${inviteData.org_id}.local`;
+
+      // Create user account
+      const { data: authData, error: authError } = await signUp(
+        workerEmail,
+        tempPassword,
+        {
+          name: workerData.workerName,
+          role: 'worker'
+        }
+      );
+
+      if (authError) {
+        toast({
+          title: "Error",
+          description: await utilService.handleSupabaseError(authError),
+          variant: "destructive"
+        });
+        return;
+      }
+
+      // Add user as worker of the organization
+      const { error: memberError } = await memberService.addMember(
+        inviteData.org_id,
+        authData.user.id,
+        'worker'
+      );
+
+      if (memberError) {
+        toast({
+          title: "Error",
+          description: await utilService.handleSupabaseError(memberError),
+          variant: "destructive"
+        });
+        return;
+      }
+
+      // Update the invite code with the user who used it
+      await inviteService.useInviteCode(workerData.inviteCode, authData.user.id);
+
       toast({
-        title: "Error",
-        description: "Código de invitación inválido",
-        variant: "destructive"
+        title: "¡Bienvenido!",
+        description: `Te has unido al taller exitosamente. Tu contraseña temporal es: ${tempPassword}`,
+        duration: 10000
       });
-      return;
+
+    } catch (error) {
+      console.error('Worker join error:', error);
+      toast({
+        title: "Error",
+        description: "Error al unirse al taller",
+        variant: "destructive"
+      });
+    } finally {
+      setLoading(false);
     }
-    
-    const workerId = `worker_${Date.now()}`;
-    const workerPassword = `pass_${Math.random().toString(36).substr(2, 8)}`;
-    
-    const newWorker = {
-      id: workerId,
-      name: workerData.workerName,
-      password: workerPassword,
-      joinedAt: new Date().toISOString()
-    };
-    
-    targetShop.workers.push(newWorker);
-    delete targetShop.inviteCodes[workerData.inviteCode];
-    
-    shops[shopKey] = targetShop;
-    localStorage.setItem('tire_shops', JSON.stringify(shops));
-    
-    toast({
-      title: "¡Bienvenido!",
-      description: `Tu contraseña es: ${workerPassword}`,
-      duration: 10000
-    });
-    
-    onLogin({
-      id: workerId,
-      name: workerData.workerName,
-      role: 'worker',
-      shopId: targetShop.id,
-      shopName: targetShop.name,
-      orgId: targetShop.orgId,
-      siteId: targetShop.siteId
-    });
   };
 
   return (
@@ -185,7 +285,7 @@ const AuthPage = ({ onLogin }) => {
               <TabsContent value="login">
                 <form onSubmit={handleLogin} className="space-y-4">
                   <div>
-                    <Label htmlFor="shopName">Nombre del Taller</Label>
+                    <Label htmlFor="shopName">Email o Nombre del Taller</Label>
                     <Input
                       id="shopName"
                       value={loginData.shopName}
@@ -201,7 +301,7 @@ const AuthPage = ({ onLogin }) => {
                       required
                     />
                   </div>
-                  <Button type="submit" className="w-full">
+                  <Button type="submit" className="w-full" disabled={loading}>
                     Iniciar Sesión
                   </Button>
                 </form>
@@ -244,7 +344,7 @@ const AuthPage = ({ onLogin }) => {
                       required
                     />
                   </div>
-                  <Button type="submit" className="w-full">
+                  <Button type="submit" className="w-full" disabled={loading}>
                     Registrar Taller
                   </Button>
                 </form>
@@ -267,7 +367,7 @@ const AuthPage = ({ onLogin }) => {
                       required
                     />
                   </div>
-                  <Button type="submit" className="w-full">
+                  <Button type="submit" className="w-full" disabled={loading}>
                     Unirse al Taller
                   </Button>
                 </form>