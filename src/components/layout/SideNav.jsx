@@ .. @@
-const SideNav = ({ navItems, activeTab, onTabChange, user, shopName, onLogout }) => {
}
+const SideNav = ({ navItems, activeTab, onTabChange, user, shopName, userRole, onLogout }) => {
   return (
     <aside className="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-40">
       <div className="p-4 border-b border-gray-200">
         <div className="flex items-center space-x-3">
           <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
             <Wrench className="w-6 h-6 text-white" />
           </div>
           <div>
             <h1 className="text-lg font-bold text-gray-900">{shopName}</h1>
             <p className="text-xs text-gray-600">
-              {user.role === 'director' ? 'Director' : 'Trabajador'} - {user.name}
+              {userRole === 'manager' ? 'Director' : 'Trabajador'} - {user.raw_user_meta_data?.full_name || user.email}
             </p>
           </div>
         </div>
       </div>
   )
}