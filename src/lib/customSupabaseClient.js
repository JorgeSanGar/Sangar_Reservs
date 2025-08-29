@@ .. @@
 import { createClient } from '@supabase/supabase-js';

-const supabaseUrl = 'https://pcybrdetufrqbegaeane.supabase.co';
-const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWJyZGV0dWZycWJlZ2FlYW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNDYxODUsImV4cCI6MjA3MTgyMjE4NX0.HhvF7RSpBbas3WFhs6cxah09O0_aQtC8OAjiSB5I-3w';
+const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
+const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

 export const supabase = createClient(supabaseUrl, supabaseAnonKey);