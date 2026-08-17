export type PosCategory = {
  value: string;   // matches ProductCategory enum value
  label: string;   // display label (customisable)
  enabled: boolean;
};

export interface Business {
  id: string;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  printWidth: 58 | 80;
  receiptFooter: string;
  posCategories: PosCategory[];
  createdAt: string;
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const CATEGORY_PRESETS: Record<string, { label: string; categories: PosCategory[] }> = {
  auto: {
    label: 'ร้านประดับยนต์',
    categories: [
      { value: 'AirCon',     label: 'ระบบแอร์',       enabled: true  },
      { value: 'Tint',       label: 'ฟิล์มกรองแสง',   enabled: true  },
      { value: 'Glass',      label: 'กระจกรถยนต์',    enabled: true  },
      { value: 'Sound',      label: 'เครื่องเสียง',   enabled: true  },
      { value: 'ServiceFee', label: 'อื่นๆ / ค่าแรง', enabled: true  },
    ],
  },
  carwash: {
    label: 'ร้านล้างรถ / ดูแลรถ',
    categories: [
      { value: 'AirCon',     label: 'ล้างแอร์',        enabled: true  },
      { value: 'Tint',       label: 'เคลือบสี',        enabled: false },
      { value: 'Glass',      label: 'ขัดกระจก',        enabled: true  },
      { value: 'Sound',      label: 'ดูแลภายใน',       enabled: false },
      { value: 'ServiceFee', label: 'ล้างรถ / อื่นๆ', enabled: true  },
    ],
  },
  repair: {
    label: 'อู่ซ่อมรถ',
    categories: [
      { value: 'AirCon',     label: 'ซ่อมแอร์',        enabled: true  },
      { value: 'Tint',       label: 'ตัวถัง / สี',     enabled: false },
      { value: 'Glass',      label: 'กระจก',            enabled: true  },
      { value: 'Sound',      label: 'ไฟฟ้า',           enabled: true  },
      { value: 'ServiceFee', label: 'ค่าแรง / อื่นๆ', enabled: true  },
    ],
  },
  general: {
    label: 'ร้านค้าทั่วไป',
    categories: [
      { value: 'AirCon',     label: 'บริการ A',        enabled: false },
      { value: 'Tint',       label: 'บริการ B',        enabled: false },
      { value: 'Glass',      label: 'บริการ C',        enabled: false },
      { value: 'Sound',      label: 'บริการ D',        enabled: false },
      { value: 'ServiceFee', label: 'สินค้า / บริการ', enabled: true  },
    ],
  },
};

const DEFAULT_CATEGORIES = CATEGORY_PRESETS.auto.categories;

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'kas_businesses';
const SELECTED_KEY = 'kas_selected_business_id';

const SEED: Business[] = [
  {
    id: 'korat-air-sound',
    name: 'Korat Air & Sound',
    tagline: 'ประดับยนต์ · ติดตั้งฟิล์ม · ซ่อมแอร์',
    address: '711-715 ถ.ท้าวสุระ อ.เมือง ต.ในเมือง จ.นครราชสีมา 30000',
    phone: '093-321-8634',
    printWidth: 58,
    receiptFooter: 'ขอบคุณที่ใช้บริการ',
    posCategories: DEFAULT_CATEGORIES,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

export function getBusinesses(): Business[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    const parsed: Business[] = JSON.parse(raw);
    // Migrate old records that lack posCategories
    const migrated = parsed.map((b) =>
      b.posCategories ? b : { ...b, posCategories: DEFAULT_CATEGORIES }
    );
    const hasSeed = migrated.some((b) => b.id === SEED[0].id);
    if (!hasSeed) {
      const merged = [SEED[0], ...migrated];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return migrated;
  } catch {
    return SEED;
  }
}

export function saveBusinesses(list: Business[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getSelectedId(): string | null {
  return localStorage.getItem(SELECTED_KEY);
}

export function setSelectedId(id: string): void {
  localStorage.setItem(SELECTED_KEY, id);
}

export function addBusiness(data: Omit<Business, 'id' | 'createdAt'>): Business {
  const biz: Business = {
    ...data,
    printWidth: data.printWidth ?? 58,
    receiptFooter: data.receiptFooter ?? 'ขอบคุณที่ใช้บริการ',
    posCategories: data.posCategories ?? DEFAULT_CATEGORIES,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const list = getBusinesses();
  list.push(biz);
  saveBusinesses(list);
  return biz;
}

export function updateBusiness(id: string, data: Partial<Omit<Business, 'id' | 'createdAt'>>): void {
  const list = getBusinesses().map((b) => (b.id === id ? { ...b, ...data } : b));
  saveBusinesses(list);
}

export function deleteBusiness(id: string): void {
  const list = getBusinesses().filter((b) => b.id !== id);
  saveBusinesses(list);
}
