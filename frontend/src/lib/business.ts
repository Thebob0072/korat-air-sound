export interface Business {
  id: string;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  createdAt: string;
}

const STORAGE_KEY = 'kas_businesses';
const SELECTED_KEY = 'kas_selected_business_id';

const SEED: Business[] = [
  {
    id: 'korat-air-sound',
    name: 'Korat Air & Sound',
    tagline: 'ร้านประดับยนต์ ติดตั้งฟิล์ม ซ่อมแอร์ กระจกรถยนต์',
    address: '711-715 ถ.ท้าวสุระ อ.เมือง ต.ในเมือง จ.นครราชสีมา 30000',
    phone: '093-321-8634',
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
    // Ensure the seed business is always present
    const hasSeed = parsed.some((b) => b.id === SEED[0].id);
    if (!hasSeed) {
      const merged = [SEED[0], ...parsed];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return parsed;
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
  const biz: Business = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
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
