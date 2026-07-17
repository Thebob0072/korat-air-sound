import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Plus, Search } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import VehicleRegistrationModal from '@/components/VehicleRegistrationModal';
import { createOrder } from '@/lib/api';
import type { Vehicle } from '@/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [showRegistration, setShowRegistration] = useState(false);
  const [notFoundQuery, setNotFoundQuery] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const openNewOrder = async (vehicle: Vehicle) => {
    setCreatingOrder(true);
    setErrorMsg('');
    try {
      const order = await createOrder(vehicle.id);
      navigate(`/orders/${order.id}`);
    } catch {
      setErrorMsg('ไม่สามารถเปิดออเดอร์ได้ กรุณาลองอีกครั้ง');
      setCreatingOrder(false);
    }
  };

  const handleVehicleFound = (vehicle: Vehicle) => {
    openNewOrder(vehicle);
  };

  const handleNotFound = (query: string) => {
    setNotFoundQuery(query);
    setShowRegistration(true);
  };

  const handleRegistrationSuccess = (vehicle: Vehicle) => {
    setShowRegistration(false);
    openNewOrder(vehicle);
  };

  return (
    <div className="flex flex-col items-center justify-start pt-16 gap-8 min-h-[60vh]">
      {/* Brand mark */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Korat Air &amp; Sound</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          พิมพ์ทะเบียนรถหรือเบอร์โทรลูกค้า แล้วกด Enter เพื่อเปิดงานใหม่
        </p>
      </div>

      {/* Main search */}
      {creatingOrder ? (
        <div className="text-muted-foreground flex items-center gap-2">
          <Search className="h-4 w-4 animate-pulse" /> กำลังเปิดออเดอร์...
        </div>
      ) : (
        <SearchBar onFound={handleVehicleFound} onNotFound={handleNotFound} />
      )}

      {errorMsg && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}

      {/* Manual register link */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>ไม่พบข้อมูลในระบบ?</span>
        <button
          className="text-primary underline underline-offset-2 flex items-center gap-1 hover:text-primary/80 transition-colors"
          onClick={() => { setNotFoundQuery(''); setShowRegistration(true); }}
        >
          <Plus className="h-3.5 w-3.5" />
          ลงทะเบียนลูกค้าใหม่
        </button>
      </div>

      {showRegistration && (
        <VehicleRegistrationModal
          initialQuery={notFoundQuery}
          onSuccess={handleRegistrationSuccess}
          onClose={() => { setShowRegistration(false); setNotFoundQuery(''); }}
        />
      )}
    </div>
  );
}
