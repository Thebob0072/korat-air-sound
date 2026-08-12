import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Wind,
  Eye,
  Square as GlassIcon,
  Volume2,
  Wrench,
  Search,
  Minus,
  Plus,
  X,
  Loader2,
  Car,
  FileText,
  CreditCard,
  RotateCcw,
  AlertCircle,
  UserPlus,
  ChevronLeft,
} from 'lucide-react';
import { searchVehicles, getProducts } from '@/lib/api';
import VehicleRegistrationModal from '@/components/VehicleRegistrationModal';
import { CheckoutModal } from '@/components/CheckoutModal';
import { TintingModal } from '@/components/TintingModal';
import { OtherItemModal } from '@/components/OtherItemModal';
import { GlassModal } from '@/components/GlassModal';
import { AirConModal } from '@/components/AirConModal';
import { SoundModal } from '@/components/SoundModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { usePOSCartStore } from '@/store/POSCartStore';
import { formatCurrency, cn } from '@/lib/utils';
import type { Vehicle, Product } from '@/types';
import { ProductCategory } from '@/types';

// ── Category config ───────────────────────────────────────────────────────────

const CATS = [
  { value: ProductCategory.AirCon,     label: 'ระบบแอร์',      Icon: Wind,     iconBg: 'bg-sky-100',    iconFg: 'text-sky-600',    accent: 'border-sky-300',    airconSpecial: true },
  { value: ProductCategory.Tint,        label: 'ฟิล์มกรองแสง', Icon: Eye,      iconBg: 'bg-violet-100', iconFg: 'text-violet-600', accent: 'border-violet-300', tintSpecial: true },
  { value: ProductCategory.Glass,       label: 'กระจกรถยนต์',  Icon: GlassIcon,iconBg: 'bg-teal-100',   iconFg: 'text-teal-600',   accent: 'border-teal-300',   glassSpecial: true },
  { value: ProductCategory.Sound,       label: 'เครื่องเสียง', Icon: Volume2,  iconBg: 'bg-orange-100', iconFg: 'text-orange-600', accent: 'border-orange-300', soundSpecial: true },
  { value: ProductCategory.ServiceFee,  label: 'อื่นๆ / ค่าแรง',Icon: Wrench,  iconBg: 'bg-stone-100',  iconFg: 'text-stone-500',  accent: 'border-stone-300',  otherSpecial: true },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function POSDashboard() {
  const vehicleInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [searchError, setSearchError] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);
  const [notFoundQuery, setNotFoundQuery] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showTinting, setShowTinting] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [showAirCon, setShowAirCon] = useState(false);
  const [showGlass, setShowGlass] = useState(false);
  const [showSound, setShowSound] = useState(false);
  const [discountRaw, setDiscountRaw] = useState('');
  const [billView, setBillView] = useState(false);
  const storeDiscount = usePOSCartStore((s) => s.bills[s.activeBillId]?.discount ?? 0);
  const setDiscount = usePOSCartStore((s) => s.setDiscount);

  // Sync discount input when store discount resets to 0 (e.g. clearCart)
  useEffect(() => {
    if (storeDiscount === 0) setDiscountRaw('');
  }, [storeDiscount]);

  const [productQuery, setProductQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ProductCategory | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const vehicle = usePOSCartStore((s) => s.bills[s.activeBillId]?.vehicle ?? null);
  const isCreditEligible = !!(vehicle?.customer?.name && vehicle?.customer?.phone);
  const items = usePOSCartStore((s) => s.bills[s.activeBillId]?.items ?? []);
  const setVehicle = usePOSCartStore((s) => s.setVehicle);
  const addItem = usePOSCartStore((s) => s.addItem);
  const removeItem = usePOSCartStore((s) => s.removeItem);
  const updateQuantity = usePOSCartStore((s) => s.updateQuantity);
  const clearCart = usePOSCartStore((s) => s.clearCart);
  const getTotal = usePOSCartStore((s) => s.getTotal);
  const getSubtotal = usePOSCartStore((s) => s.getSubtotal);
  const getItemCount = usePOSCartStore((s) => s.getItemCount);
  const bills = usePOSCartStore((s) => s.bills);
  const activeBillId = usePOSCartStore((s) => s.activeBillId);
  const createBill = usePOSCartStore((s) => s.createBill);
  const removeBill = usePOSCartStore((s) => s.removeBill);
  const setActiveBill = usePOSCartStore((s) => s.setActiveBill);

  // Reset local UI state when switching bill tabs
  useEffect(() => {
    const disc = usePOSCartStore.getState().getActiveBill()?.discount ?? 0;
    setDiscountRaw(disc > 0 ? String(disc) : '');
    setQuery('');
    setSearchResults([]);
    setSearchError('');
    setProductQuery('');
    setShowSuggestions(false);
    setActiveCategory(null);
    setBillView(false);
  }, [activeBillId]);

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });

  useEffect(() => { vehicleInputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = useMemo(() => {
    const q = productQuery.toLowerCase().trim();
    if (!q) return [];
    return allProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q),
    );
  }, [productQuery, allProducts]);

  const listProducts = useMemo(() => {
    if (productQuery.trim()) return [];
    if (activeCategory) return allProducts.filter((p) => p.category === activeCategory);
    return [];
  }, [productQuery, activeCategory, allProducts]);

  const addToBill = useCallback(
    (product: Product) => {
      if (Number(product.stockQuantity) <= 0) return;
      addItem(product);
    },
    [addItem],
  );

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const results = await searchVehicles(q);
      if (results.length === 0) {
        setNotFoundQuery(q);
        setShowRegistration(true);
      } else if (results.length === 1) {
        selectVehicle(results[0]);
      } else {
        setSearchResults(results);
      }
    } catch {
      setSearchError('เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่');
    } finally {
      setIsSearching(false);
    }
  };

  const selectVehicle = (v: Vehicle) => {
    setVehicle(v);
    setQuery('');
    setSearchResults([]);
    setShowRegistration(false);
    setSearchError('');
    setTimeout(() => productInputRef.current?.focus(), 80);
  };

  const handleNewCustomer = () => {
    clearCart();
    setQuery('');
    setSearchResults([]);
    setSearchError('');
    setActiveCategory(null);
    setProductQuery('');
    setShowSuggestions(false);
    setTimeout(() => vehicleInputRef.current?.focus(), 80);
  };

  return (
    <>
      <div className="fixed inset-0 top-14 overflow-hidden bg-[#ECEAE6]" style={{ zIndex: 10 }}>
      <div className="flex flex-col h-full max-w-[1440px] mx-auto overflow-hidden">

        {/* Bill tabs */}
        <div className="flex items-center gap-1.5 px-3 sm:px-5 pt-2 pb-1 shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Object.values(bills).map((bill) => {
            const isActive = bill.id === activeBillId;
            const tabLabel = bill.vehicle?.licensePlate ?? bill.label;
            const itemCount = bill.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <div
                key={bill.id}
                onClick={() => !isActive && setActiveBill(bill.id)}
                className={cn(
                  'flex items-center gap-1.5 pl-3 h-8 rounded-xl shrink-0 transition-all duration-200 text-xs font-medium select-none',
                  Object.keys(bills).length > 1 ? 'pr-1.5' : 'pr-3',
                  isActive
                    ? 'bg-[#3B3A36] text-white cursor-default'
                    : 'bg-white/70 text-[#878681] hover:bg-white hover:text-[#2D2D2D] cursor-pointer',
                )}
              >
                <span className="max-w-[100px] truncate">{tabLabel}</span>
                {itemCount > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 rounded-full tabular-nums',
                    isActive ? 'bg-white/20 text-white' : 'bg-[#F0EDE8] text-[#878681]',
                  )}>
                    {itemCount}
                  </span>
                )}
                {Object.keys(bills).length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeBill(bill.id); }}
                    className={cn(
                      'h-5 w-5 rounded-lg flex items-center justify-center transition-colors shrink-0',
                      isActive
                        ? 'text-white/50 hover:text-white hover:bg-white/15'
                        : 'text-[#C0BEBA] hover:text-[#878681] hover:bg-[#E5E5E3]',
                    )}
                    aria-label="ปิดบิล"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
          {Object.keys(bills).length < 8 && (
            <button
              onClick={createBill}
              className="flex items-center justify-center h-8 w-8 rounded-xl bg-white/50 hover:bg-white text-[#878681] hover:text-[#2D2D2D] shrink-0 transition-all duration-200 ml-0.5"
              aria-label="เปิดบิลใหม่"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Panels */}
        <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL */}
        <div className={cn(
          'flex-1 flex-col min-w-0 overflow-hidden',
          billView ? 'hidden lg:flex' : 'flex',
        )}>

          {/* Vehicle search */}
          <div className="px-3 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 space-y-3">
            <div className="flex gap-2 max-w-2xl">
              <div className="relative flex-1">
                <Car className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#878681] pointer-events-none" />
                <input
                  ref={vehicleInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSearchResults([]); setSearchError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); if (e.key === 'Escape') setSearchResults([]); }}
                  placeholder="พิมพ์เลขทะเบียนรถ / เบอร์โทร..."
                  className="w-full h-12 pl-12 pr-4 text-sm font-medium text-[#2D2D2D] bg-white rounded-full shadow-[0_2px_12px_rgb(0,0,0,0.06)] border-0 focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all duration-300 placeholder:text-[#878681] placeholder:font-normal"
                  disabled={isSearching}
                  autoComplete="off"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
                className="h-12 px-4 sm:px-6 bg-[#3B3A36] hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-full transition-all duration-300 flex items-center gap-2 text-sm shrink-0"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="hidden sm:inline">ค้นหา</span>
              </button>
              <button
                onClick={() => { setNotFoundQuery(''); setShowRegistration(true); }}
                className="h-12 px-3 sm:px-4 bg-white hover:bg-[#F7F7F5] active:scale-[0.98] text-[#3B3A36] border border-[#E5E5E3] rounded-full transition-all duration-300 flex items-center gap-2 text-sm font-medium shrink-0"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">ใหม่</span>
              </button>
            </div>

            {searchError && (
              <p className="flex items-center gap-2 text-rose-500 text-xs px-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {searchError}
              </p>
            )}

            {searchResults.length > 1 && (
              <div className="bg-[#FDFCFA] rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.10)] overflow-hidden border border-[#E8E4DF]">
                <div className="px-4 py-2.5 flex items-center gap-2 border-b border-[#EAE7E2]">
                  <Car className="h-3.5 w-3.5 text-[#878681]" />
                  <p className="text-xs font-semibold text-[#878681]">พบ {searchResults.length} คัน — เลือกรถ</p>
                </div>
                {searchResults.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => selectVehicle(v)}
                    className="w-full text-left px-4 py-3 border-b border-[#EAE7E2] last:border-0 hover:bg-[#F0EDE8] flex items-center gap-3 transition-all duration-150 active:scale-[0.99]"
                  >
                    <div className="h-8 w-8 rounded-xl bg-[#E8E4DF] flex items-center justify-center shrink-0">
                      <Car className="h-4 w-4 text-[#3B3A36]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold font-mono tracking-wide text-[#2D2D2D] leading-none">{v.licensePlate}</p>
                      <p className="text-xs text-[#878681] mt-0.5">{[v.brand, v.model, v.customer?.name].filter(Boolean).join(' · ')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {vehicle && searchResults.length === 0 && (
              <div className="flex items-center gap-4 bg-white rounded-[20px] px-5 py-3.5 shadow-[0_2px_12px_rgb(0,0,0,0.05)] border border-[#E5E5E3]">
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-black text-xl tracking-[0.12em] text-[#2D2D2D] leading-none">
                    {vehicle.licensePlate}
                  </p>
                  <p className="text-xs text-[#878681] mt-1">
                    {[vehicle.brand && `${vehicle.brand} ${vehicle.model}`, vehicle.customer?.name, vehicle.customer?.phone].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  onClick={handleNewCustomer}
                  className="flex items-center gap-1.5 text-xs text-[#878681] hover:text-[#2D2D2D] bg-[#F7F7F5] hover:bg-[#E5E5E3] rounded-full px-4 py-2 transition-all duration-200 font-medium shrink-0"
                >
                  <RotateCcw className="h-3 w-3" />
                  เปลี่ยน
                </button>
              </div>
            )}
          </div>

          {/* Product search */}
          <div className="px-3 sm:px-6 pb-3 sm:pb-4">
            <div className="relative max-w-2xl" ref={suggestionsRef}>
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#878681] pointer-events-none" />
              <input
                ref={productInputRef}
                type="text"
                value={productQuery}
                onChange={(e) => { setProductQuery(e.target.value); setShowSuggestions(e.target.value.length > 0); }}
                onFocus={() => productQuery.length > 0 && setShowSuggestions(true)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setProductQuery(''); setShowSuggestions(false); } }}
                placeholder="ค้นหาสินค้า / รหัสสินค้า..."
                className="w-full h-12 pl-12 pr-10 text-sm font-medium text-[#2D2D2D] bg-white rounded-full shadow-[0_2px_12px_rgb(0,0,0,0.06)] border-0 focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all duration-300 placeholder:text-[#878681] placeholder:font-normal"
                autoComplete="off"
              />
              {productQuery && (
                <button
                  onClick={() => { setProductQuery(''); setShowSuggestions(false); productInputRef.current?.focus(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#878681] hover:text-[#2D2D2D] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-[#FDFCFA] rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.12)] border border-[#E8E4DF] overflow-hidden max-h-72 overflow-y-auto">
                  {suggestions.slice(0, 12).map((product) => {
                    const outOfStock = Number(product.stockQuantity) <= 0;
                    const inBill = items.find((i) => i.product.id === product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => {
                          if (!outOfStock) {
                            addToBill(product);
                            setProductQuery('');
                            setShowSuggestions(false);
                            productInputRef.current?.focus();
                          }
                        }}
                        disabled={outOfStock}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 ${
                          outOfStock
                            ? 'opacity-40 cursor-not-allowed'
                            : inBill
                            ? 'bg-[#F0EDE8] hover:bg-[#EAE6E1] cursor-pointer border-l-2 border-[#5C6B62]'
                            : 'hover:bg-[#F0EDE8] cursor-pointer border-l-2 border-transparent'
                        } border-b border-[#EAE7E2] last:border-b-0`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-snug ${inBill ? 'text-[#3B3A36]' : 'text-[#2D2D2D]'}`}>
                            {product.name}
                          </p>
                          <p className="text-xs text-[#878681] mt-0.5">{product.sku}</p>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          <p className="text-sm font-mono font-semibold text-[#2D2D2D]">{formatCurrency(product.sellingPrice)}</p>
                          {inBill && (
                            <p className="text-[10px] font-semibold text-[#5C6B62] bg-[#5C6B62]/10 rounded-full px-2 py-0.5">✓ ×{inBill.quantity}</p>
                          )}
                          {outOfStock && <p className="text-[10px] text-rose-400">หมดสต็อก</p>}
                        </div>
                      </button>
                    );
                  })}
                  {suggestions.length > 12 && (
                    <div className="px-4 py-2.5 text-xs text-[#878681] text-center bg-[#F0EDE8] border-t border-[#EAE7E2]">
                      อีก {suggestions.length - 12} รายการ — พิมพ์ให้ละเอียดขึ้น
                    </div>
                  )}
                </div>
              )}
              {showSuggestions && productQuery.length > 0 && suggestions.length === 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-[#FDFCFA] rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.12)] border border-[#E8E4DF] px-5 py-5 flex items-center gap-3">
                  <Search className="h-4 w-4 text-[#C0BEBA] shrink-0" />
                  <p className="text-sm text-[#878681]">ไม่พบสินค้า &ldquo;{productQuery}&rdquo;</p>
                </div>
              )}
            </div>
          </div>

          {/* Category grid */}
          <div className="px-3 sm:px-6 pb-3 sm:pb-4">
            <p className="text-[10px] font-semibold text-[#C0BEBA] uppercase tracking-[0.14em] mb-2.5">เลือกบริการ</p>
            <div className="grid grid-cols-5 gap-2">
              {CATS.map((cat) => {
                const Icon = cat.Icon;
                const handleClick = () => {
                  setProductQuery('');
                  setShowSuggestions(false);
                  setActiveCategory(null);
                  if ('tintSpecial' in cat && cat.tintSpecial)     { setShowTinting(true); return; }
                  if ('airconSpecial' in cat && cat.airconSpecial)  { setShowAirCon(true);  return; }
                  if ('glassSpecial' in cat && cat.glassSpecial)    { setShowGlass(true);   return; }
                  if ('otherSpecial' in cat && cat.otherSpecial)    { setShowOther(true);   return; }
                  if ('soundSpecial' in cat && cat.soundSpecial)    { setShowSound(true);   return; }
                };
                return (
                  <button
                    key={cat.value}
                    onClick={handleClick}
                    className={`flex flex-col items-center gap-1.5 pt-3 pb-2.5 rounded-2xl bg-white border-t-2 ${cat.accent} shadow-[0_2px_8px_rgb(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgb(0,0,0,0.1)] active:scale-[0.95] transition-all duration-200 group`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-active:scale-90 ${cat.iconBg}`}>
                      <Icon className={`h-[18px] w-[18px] ${cat.iconFg}`} strokeWidth={1.75} />
                    </div>
                    <span className="text-center leading-tight text-[9px] sm:text-[10px] font-semibold text-[#4A4845]">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product list */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-[88px] lg:pb-6">
            {listProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full select-none gap-3 pb-8">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-[0_2px_12px_rgb(0,0,0,0.06)] flex items-center justify-center">
                  <Search className="h-6 w-6 text-[#C0BEBA]" strokeWidth={1.5} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-[#878681]">เลือกบริการด้านบน</p>
                  <p className="text-xs text-[#C0BEBA]">หรือพิมพ์ค้นหาสินค้าได้เลย</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {listProducts.map((product) => {
                  const outOfStock = Number(product.stockQuantity) <= 0;
                  const inBill = items.find((i) => i.product.id === product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => addToBill(product)}
                      className={`flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer select-none transition-all duration-300 active:scale-[0.99] ${
                        outOfStock
                          ? 'opacity-40 cursor-not-allowed bg-white'
                          : inBill
                          ? 'bg-[#3B3A36] shadow-[0_4px_20px_rgb(0,0,0,0.12)]'
                          : 'bg-white hover:shadow-[0_4px_16px_rgb(0,0,0,0.08)] shadow-[0_2px_8px_rgb(0,0,0,0.04)]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug ${inBill ? 'text-white' : 'text-[#2D2D2D]'}`}>
                          {product.name}
                        </p>
                        <p className={`text-xs mt-0.5 ${inBill ? 'text-white/50' : 'text-[#878681]'}`}>
                          {product.sku}{product.stockQuantity !== 9999 && ` · ${product.stockQuantity} ชิ้น`}
                        </p>
                      </div>
                      <p className={`text-sm font-mono font-semibold shrink-0 tabular-nums ${inBill ? 'text-white/80' : 'text-[#2D2D2D]'}`}>
                        {formatCurrency(product.sellingPrice)}
                      </p>
                      {inBill ? (
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => updateQuantity(inBill.id, inBill.quantity - 1)} className="h-7 w-7 bg-white/15 hover:bg-white/25 text-white rounded-xl flex items-center justify-center transition-all duration-200" aria-label="ลดจำนวน"><Minus className="h-3 w-3" /></button>
                          <span className="text-sm font-bold w-6 text-center text-white tabular-nums">{inBill.quantity}</span>
                          <button onClick={() => updateQuantity(inBill.id, inBill.quantity + 1)} className="h-7 w-7 bg-white/15 hover:bg-white/25 text-white rounded-xl flex items-center justify-center transition-all duration-200" aria-label="เพิ่มจำนวน"><Plus className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <div className="h-7 w-7 bg-[#F7F7F5] text-[#878681] rounded-xl flex items-center justify-center shrink-0 pointer-events-none">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — BILL (floating receipt card) */}
        <div className={cn(
          'shrink-0 flex-col p-3 sm:p-5 bg-[#ECEAE6]',
          'w-full lg:w-[360px] xl:w-[420px]',
          billView ? 'flex' : 'hidden lg:flex',
        )}>
          {/* Mobile back button */}
          <button
            className="lg:hidden flex items-center gap-1.5 text-sm text-[#878681] mb-2 font-medium py-1"
            onClick={() => setBillView(false)}
          >
            <ChevronLeft className="h-4 w-4" />
            กลับเพิ่มสินค้า
          </button>
          <div className="flex-1 flex flex-col bg-white rounded-[24px] shadow-[0_8px_40px_rgb(0,0,0,0.12)] overflow-hidden">

            {/* Bill header */}
            <div className="bg-[#F0EDE8] px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[11px] font-bold text-[#C0BEBA] tracking-[0.1em] uppercase">บิลปัจจุบัน</p>
                <p className="text-sm font-bold text-[#2D2D2D] mt-0.5 leading-none">Korat Air &amp; Sound</p>
              </div>
              {items.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-xs text-[#C0BEBA] hover:text-rose-400 flex items-center gap-1 transition-colors duration-200">
                      <X className="h-3 w-3" />ล้างบิล
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ล้างบิลทั้งหมด?</AlertDialogTitle>
                      <AlertDialogDescription>รายการทั้งหมดในบิลจะถูกลบออก ไม่สามารถกู้คืนได้</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction onClick={clearCart} className="bg-rose-500 hover:opacity-90 text-white">ล้างบิล</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Vehicle section */}
            <div className="px-5 py-4 bg-[#F7F5F2] border-b border-[#EAE7E2] shrink-0">
              {vehicle ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-[#3B3A36] rounded-xl px-3 py-2 shrink-0">
                      <p className="font-mono font-black text-base tracking-[0.1em] text-white leading-none">
                        {vehicle.licensePlate}
                      </p>
                    </div>
                    <div className="min-w-0">
                      {(vehicle.brand || vehicle.model) && (
                        <p className="text-xs font-semibold text-[#2D2D2D] truncate">
                          {[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}
                        </p>
                      )}
                      {vehicle.customer?.name && (
                        <p className="text-xs text-[#878681] truncate mt-0.5">{vehicle.customer.name}</p>
                      )}
                      {!vehicle.brand && !vehicle.customer?.name && (
                        <p className="text-xs text-[#C0BEBA]">ไม่มีข้อมูลเพิ่มเติม</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleNewCustomer}
                    className="flex items-center gap-1 text-[10px] text-[#C0BEBA] hover:text-[#878681] transition-colors shrink-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                    เปลี่ยน
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 py-2.5 px-4 bg-white rounded-xl border border-dashed border-[#D8D5D0]">
                  <Car className="h-4 w-4 text-[#C0BEBA]" />
                  <p className="text-sm text-[#C0BEBA]">ค้นหาทะเบียนรถก่อนเพิ่มรายการ</p>
                </div>
              )}
            </div>

            {/* Item list */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full select-none gap-3 py-12">
                  <div className="w-14 h-14 rounded-2xl bg-[#F0EDE8] flex items-center justify-center">
                    <FileText className="h-6 w-6 text-[#D8D5D0]" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-[#C0BEBA]">ยังไม่มีรายการในบิล</p>
                </div>
              ) : (
                <div className="px-5 pt-3 pb-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#F0EDE8]">
                    <p className="flex-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#C0BEBA]">รายการ ({items.length})</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#C0BEBA] w-20 text-right">รวม</p>
                    <div className="w-4" />
                  </div>
                  {items.map((item) => (
                    <div key={item.id} className="group flex items-start gap-3 py-3 border-b border-[#F7F5F2] last:border-0">
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm text-[#2D2D2D] font-semibold leading-snug">{item.product.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-6 w-6 rounded-lg bg-[#F0EDE8] hover:bg-[#E5E5E3] text-[#878681] hover:text-[#2D2D2D] flex items-center justify-center transition-all duration-200 shrink-0"
                            aria-label="ลดจำนวน">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold w-5 text-center text-[#2D2D2D] tabular-nums">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-6 w-6 rounded-lg bg-[#F0EDE8] hover:bg-[#E5E5E3] text-[#878681] hover:text-[#2D2D2D] flex items-center justify-center transition-all duration-200 shrink-0"
                            aria-label="เพิ่มจำนวน">
                            <Plus className="h-3 w-3" />
                          </button>
                          <span className="text-[11px] text-[#C0BEBA] font-mono tabular-nums">
                            × {formatCurrency(item.product.sellingPrice)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        <p className="text-sm font-mono font-bold text-[#2D2D2D] w-20 text-right tabular-nums">
                          {formatCurrency(Number(item.product.sellingPrice) * item.quantity)}
                        </p>
                        <button onClick={() => removeItem(item.id)}
                          className="h-5 w-5 text-[#C0BEBA] hover:text-rose-400 flex items-center justify-center transition-all duration-200 shrink-0 opacity-0 group-hover:opacity-100"
                          aria-label="ลบรายการ">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#EAE7E2] px-5 pt-4 pb-5 space-y-3 shrink-0 bg-white">
              {/* Subtotal + discount */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#878681]">ราคารวม</span>
                    <span className="text-xs font-mono tabular-nums text-[#878681]">{formatCurrency(getSubtotal())}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="pos-discount" className="text-xs text-[#878681] shrink-0">ส่วนลด (฿)</label>
                    <input
                      id="pos-discount"
                      type="text"
                      inputMode="numeric"
                      value={discountRaw}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        setDiscountRaw(raw);
                        setDiscount(Math.max(0, parseInt(raw, 10) || 0));
                      }}
                      placeholder="0"
                      className="w-24 h-8 px-3 text-sm text-right font-mono bg-[#F0EDE8] border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                    />
                  </div>
                  {storeDiscount > 0 && (
                    <div className="flex items-center justify-between text-xs text-rose-400">
                      <span>หักส่วนลด</span>
                      <span className="font-mono tabular-nums">− {formatCurrency(storeDiscount)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="bg-[#F7F5F2] rounded-2xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#878681]">
                    {storeDiscount > 0 ? 'ยอดชำระ' : 'ยอดรวม'}
                  </p>
                  <p className="text-[11px] text-[#C0BEBA] mt-0.5 tabular-nums">
                    {getItemCount()} ชิ้น · {items.length} รายการ
                  </p>
                </div>
                <p className="font-mono font-black text-[32px] text-[#2D2D2D] leading-none tabular-nums">
                  {formatCurrency(getTotal())}
                </p>
              </div>

              {/* Primary: ชำระเงิน */}
              <button
                onClick={() => setShowCheckout(true)}
                disabled={items.length === 0 || !vehicle}
                className="w-full py-3.5 bg-[#3B3A36] hover:opacity-90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                ชำระเงิน
              </button>

              {/* Secondary row */}
              <div className={`grid gap-2 ${isCreditEligible ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <button
                  onClick={() => setShowCheckout(true)}
                  disabled={items.length === 0 || !vehicle}
                  className="h-10 bg-[#F0EDE8] hover:bg-[#E5E5E3] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed text-[#4A4845] hover:text-[#2D2D2D] text-xs font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  ใบเสนอราคา
                </button>
                {isCreditEligible && (
                  <button
                    onClick={() => setShowCheckout(true)}
                    disabled={items.length === 0 || !vehicle}
                    className="h-10 bg-blue-50 hover:bg-blue-100 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed text-blue-700 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 border border-blue-200"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    วางบิล (เครดิต)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>{/* end panels */}
      </div>{/* end max-w */}

        {/* Mobile bottom bar */}
        {!billView && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[#E5E5E3] px-4 py-3 flex items-center gap-3 shadow-[0_-4px_24px_rgb(0,0,0,0.08)]">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#878681] uppercase tracking-[0.1em] font-bold">{getItemCount()} รายการ</p>
              <p className="text-xl font-mono font-black text-[#2D2D2D] leading-none tabular-nums mt-0.5">{formatCurrency(getTotal())}</p>
            </div>
            <button
              onClick={() => setBillView(true)}
              disabled={items.length === 0}
              className="h-12 px-6 bg-[#3B3A36] disabled:opacity-30 text-white text-sm font-semibold rounded-2xl flex items-center gap-2 active:scale-[0.97] transition-all"
            >
              <FileText className="h-4 w-4" />
              ดูบิล
            </button>
          </div>
        )}
      </div>

      {showRegistration && (
        <VehicleRegistrationModal
          initialQuery={notFoundQuery}
          onSuccess={selectVehicle}
          onClose={() => {
            setShowRegistration(false);
            setNotFoundQuery('');
            setTimeout(() => vehicleInputRef.current?.focus(), 80);
          }}
        />
      )}

      <TintingModal
        open={showTinting}
        onClose={() => setShowTinting(false)}
        vehicleBrand={vehicle?.brand}
        vehicleModel={vehicle?.model}
      />
      <OtherItemModal open={showOther} onClose={() => setShowOther(false)} vehicleBrand={vehicle?.brand} vehicleModel={vehicle?.model} />
      <GlassModal open={showGlass} onClose={() => setShowGlass(false)} vehicleBrand={vehicle?.brand} vehicleModel={vehicle?.model} />
      <AirConModal open={showAirCon} onClose={() => setShowAirCon(false)} vehicleBrand={vehicle?.brand} vehicleModel={vehicle?.model} />
      <SoundModal open={showSound} onClose={() => setShowSound(false)} vehicleBrand={vehicle?.brand} vehicleModel={vehicle?.model} />
      <CheckoutModal open={showCheckout} onClose={() => { setShowCheckout(false); setBillView(false); }} />
    </>
  );
}
