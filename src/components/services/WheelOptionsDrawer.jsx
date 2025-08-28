@@ .. @@
       </div>
     );
   }
 
   return (
     <ResponsiveSheet open={isOpen} onOpenChange={onClose} title="Configurar Ruedas" description={service.name}>
-      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
+      <div className="flex flex-col h-full">
+        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-32">
         <div>
           <Controller name="pinchazo" control={control} render={({ field }) => (
             <div className="flex items-center space-x-2"><Switch id="pinchazo" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="pinchazo">Es un pinchazo (reemplaza cambio)</Label></div>
@@ .. @@
               {errors.equilibradoCount && <p className="text-red-500 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{errors.equilibradoCount.message}</p>}
            </>}
         </FieldGroup>
-      </form>
+        </form>
 
-      <footer className="p-4 border-t bg-gray-50 sticky bottom-0">
-        <div className="flex justify-between items-center mb-4">
-          <span className="font-semibold">Tiempo estimado:</span>
-          <div className="flex items-center gap-2 text-lg font-bold text-blue-600">
-            <Clock className="w-5 h-5"/>
-            {estimatedTime ? `${estimatedTime.minutes} min` : 'Calculando...'}
+        <footer className="p-4 border-t bg-gray-50 mt-auto">
+          <div className="flex justify-between items-center mb-4">
+            <span className="font-semibold">Tiempo estimado:</span>
+            <div className="flex items-center gap-2 text-lg font-bold text-blue-600">
+              <Clock className="w-5 h-5"/>
+              {estimatedTime ? `${estimatedTime.minutes} min` : 'Calculando...'}
+            </div>
           </div>
-        </div>
-        <Button type="submit" onClick={handleSubmit(onSubmit)} className="w-full" disabled={!isValid}>Continuar</Button>
-      </footer>
+          <Button type="submit" onClick={handleSubmit(onSubmit)} className="w-full" disabled={!isValid}>Continuar</Button>
+        </footer>
+      </div>
     </ResponsiveSheet>
   );
 };