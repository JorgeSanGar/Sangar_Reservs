@@ .. @@
 import { useToast } from '@/components/ui/use-toast';
 import { ArrowRight, Clock } from 'lucide-react';
 import { computeFreeIntervals } from '@/lib/availability';
+import { arrivalService } from '@/lib/supabaseService';
 import CategoryChips from '@/components/services/CategoryChips';
 import ServiceList from '@/components/services/ServiceList';
 import WheelOptionsDrawer from '@/components/services/WheelOptionsDrawer';

@@ .. @@
   const [bookingTime, setBookingTime] = useState(initialTime);
   const [isDrawerOpen, setIsDrawerOpen] = useState(false);
   const [wheelConfig, setWheelConfig] = useState(null);
+  const [visitMode, setVisitMode] = useState('wait');
+  const [arrivalRecommendation, setArrivalRecommendation] = useState(null);
   
   const availableSlots = useMemo(() => {
   }
   )