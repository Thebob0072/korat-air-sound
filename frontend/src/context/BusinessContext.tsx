import { createContext, useContext, useState, useCallback } from 'react';
import {
  type Business,
  getBusinesses, getSelectedId, setSelectedId,
  addBusiness as storageAdd, updateBusiness as storageUpdate,
  deleteBusiness as storageDelete,
} from '@/lib/business';

interface BusinessContextValue {
  businesses: Business[];
  selected: Business | null;
  selectBusiness: (id: string) => void;
  createBusiness: (data: Omit<Business, 'id' | 'createdAt'>) => Business;
  editBusiness: (id: string, data: Partial<Omit<Business, 'id' | 'createdAt'>>) => void;
  removeBusiness: (id: string) => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>(() => getBusinesses());
  const [selectedId, setLocalSelectedId] = useState<string | null>(() => getSelectedId());

  const selected = businesses.find((b) => b.id === selectedId) ?? null;

  const reload = () => setBusinesses(getBusinesses());

  const selectBusiness = useCallback((id: string) => {
    setSelectedId(id);
    setLocalSelectedId(id);
  }, []);

  const createBusiness = useCallback((data: Omit<Business, 'id' | 'createdAt'>) => {
    const biz = storageAdd(data);
    reload();
    return biz;
  }, []);

  const editBusiness = useCallback((id: string, data: Partial<Omit<Business, 'id' | 'createdAt'>>) => {
    storageUpdate(id, data);
    reload();
  }, []);

  const removeBusiness = useCallback((id: string) => {
    storageDelete(id);
    reload();
  }, []);

  return (
    <BusinessContext.Provider value={{ businesses, selected, selectBusiness, createBusiness, editBusiness, removeBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}
