import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCustomer, createVehicle } from '@/lib/api';
import type { Vehicle } from '@/types';

interface FormValues {
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  brand: string;
  model: string;
}

interface Props {
  /** The string the user typed before the modal opened — used to pre-fill fields */
  initialQuery: string;
  onSuccess: (vehicle: Vehicle) => void;
  onClose: () => void;
}

export default function VehicleRegistrationModal({ initialQuery, onSuccess, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Guess which field the query belongs to
  const looksLikePhone = /^\d/.test(initialQuery);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      licensePlate: looksLikePhone ? '' : initialQuery,
      customerPhone: looksLikePhone ? initialQuery : '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setServerError('');
    try {
      const customer = await createCustomer({
        name: data.customerName,
        phone: data.customerPhone,
      });
      const vehicle = await createVehicle({
        licensePlate: data.licensePlate,
        brand: data.brand,
        model: data.model,
        customerId: customer.id,
      });
      onSuccess({ ...vehicle, customer });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'เกิดข้อผิดพลาด กรุณาลองใหม่';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">ลงทะเบียนลูกค้าและรถใหม่</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          {serverError && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md px-3 py-2">
              {serverError}
            </div>
          )}

          {/* Customer section */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              ข้อมูลลูกค้า
            </legend>
            <div>
              <Label htmlFor="customerName">ชื่อ-นามสกุล *</Label>
              <Input
                id="customerName"
                placeholder="ชื่อ-นามสกุล"
                {...register('customerName', { required: 'กรุณากรอกชื่อลูกค้า' })}
              />
              {errors.customerName && (
                <p className="text-xs text-destructive mt-1">{errors.customerName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="customerPhone">เบอร์โทรศัพท์ *</Label>
              <Input
                id="customerPhone"
                placeholder="08X-XXX-XXXX"
                inputMode="tel"
                {...register('customerPhone', { required: 'กรุณากรอกเบอร์โทร' })}
              />
              {errors.customerPhone && (
                <p className="text-xs text-destructive mt-1">{errors.customerPhone.message}</p>
              )}
            </div>
          </fieldset>

          {/* Vehicle section */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              ข้อมูลรถยนต์
            </legend>
            <div>
              <Label htmlFor="licensePlate">ทะเบียนรถ *</Label>
              <Input
                id="licensePlate"
                placeholder="เช่น กข 1234 นครราชสีมา"
                {...register('licensePlate', { required: 'กรุณากรอกทะเบียนรถ' })}
              />
              {errors.licensePlate && (
                <p className="text-xs text-destructive mt-1">{errors.licensePlate.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="brand">ยี่ห้อ *</Label>
                <Input
                  id="brand"
                  placeholder="Toyota"
                  {...register('brand', { required: 'กรุณากรอกยี่ห้อ' })}
                />
                {errors.brand && (
                  <p className="text-xs text-destructive mt-1">{errors.brand.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="model">รุ่น *</Label>
                <Input
                  id="model"
                  placeholder="Fortuner"
                  {...register('model', { required: 'กรุณากรอกรุ่น' })}
                />
                {errors.model && (
                  <p className="text-xs text-destructive mt-1">{errors.model.message}</p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึกและเปิดออเดอร์'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
