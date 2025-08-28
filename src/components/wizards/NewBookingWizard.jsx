import { useToast } from '@/components/ui/use-toast';
import { ArrowRight, Clock } from 'lucide-react';
import { computeFreeIntervals } from '@/lib/availability';
import { arrivalService } from '@/lib/supabaseService';
import CategoryChips from '@/components/services/CategoryChips';
import ServiceList from '@/components/services/ServiceList';
import WheelOptionsDrawer from '@/components/services/WheelOptionsDrawer';

@@ .. @@
  const [bookingTime, setBookingTime] = useState(initialTime);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [wheelConfig, setWheelConfig] = useState(null);
  const [visitMode, setVisitMode] = useState('wait');
  const [arrivalRecommendation, setArrivalRecommendation] = useState(null);
  
  const availableSlots = useMemo(() => {

@@ .. @@
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label htmlFor="cName">Nombre Cliente *</Label><Input id="cName" value={customerData.name} onChange={e => setCustomerData(p => ({...p, name: e.target.value}))}/></div>
              <div><Label htmlFor="cPhone">Teléfono</Label><Input id="cPhone" value={customerData.phone} onChange={e => setCustomerData(p => ({...p, phone: e.target.value}))}/></div>
            </div>
            <div>
              <Label>Modalidad de Visita</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="visitMode" 
                    value="wait" 
                    checked={visitMode === 'wait'} 
                    onChange={(e) => setVisitMode(e.target.value)}
                  />
                  <span>Esperar (Wait)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="visitMode" 
                    value="dropoff" 
                    checked={visitMode === 'dropoff'} 
                    onChange={(e) => setVisitMode(e.target.value)}
                  />
                  <span>Dejar vehículo (Drop-off)</span>
                </label>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {visitMode === 'wait' 
                  ? 'El cliente esperará mientras se realiza el servicio' 
                  : 'El cliente dejará el vehículo y regresará más tarde'
                }
              </p>
            </div>
          </div>
        );
      default: return null;