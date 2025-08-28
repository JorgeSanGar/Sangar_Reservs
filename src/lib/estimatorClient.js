@@ .. @@
+import { estimationService } from '@/lib/supabaseService';
+
 /**
  * @param {import('./types/estimator').EstimatePayload} payload
  * @returns {Promise<import('./types/estimator').EstimateResult>}
  */
 export async function estimateDuration(payload) {
   console.log("Estimating duration with payload:", payload);
-  // Stub: Simulating an API call
-  await new Promise(resolve => setTimeout(resolve, 300));
-  
-  let minutes = 45; // Base
-  if(payload.options.pinchazo) {
-      minutes = 30;
-  } else {
-      minutes += payload.wheels * 5;
-      if (payload.options.equilibradoCount) {
-          minutes += payload.options.equilibradoCount * 5;
-      }
-      if (payload.options.alineado) {
-          minutes += 20;
-      }
-  }
 
-  return { minutes: Math.ceil(minutes), notes: [] };
+  try {
+    // Try learned estimation first
+    const { data: learnedData, error: learnedError } = await estimationService.estimateDurationLearned(
+      payload.serviceId, 
+      payload
+    );
+    
+    if (!learnedError && learnedData) {
+      return { 
+        minutes: learnedData.minutes, 
+        notes: learnedData.reasons || [],
+        baseReasons: learnedData.base_reasons || []
+      };
+    }
+    
+    // Fallback to base estimation
+    const { data: baseData, error: baseError } = await estimationService.estimateDuration(
+      payload.serviceId, 
+      payload
+    );
+    
+    if (baseError) {
+      console.error('Estimation error:', baseError);
+      // Fallback to simple calculation
+      let minutes = 45;
+      if(payload.options.pinchazo) {
+          minutes = 30;
+      } else {
+          minutes += payload.wheels * 5;
+          if (payload.options.equilibradoCount) {
+              minutes += payload.options.equilibradoCount * 5;
+          }
+          if (payload.options.alineado) {
+              minutes += 20;
+          }
+      }
+      return { minutes: Math.ceil(minutes), notes: ['Estimación local por error de conexión'] };
+    }
+    
+    return { 
+      minutes: baseData.minutes, 
+      notes: baseData.reasons || []
+    };
+  } catch (error) {
+    console.error('Estimation service error:', error);
+    // Final fallback
+    return { minutes: 45, notes: ['Error de estimación - usando valor por defecto'] };
+  }
 }