import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchVehicles } from '@/lib/api';
import type { Vehicle } from '@/types';

interface SearchBarProps {
  onFound: (vehicle: Vehicle) => void;
  onNotFound: (query: string) => void;
}

export default function SearchBar({ onFound, onNotFound }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setResults([]);
        setSearched(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(false);
    try {
      const vehicles = await searchVehicles(q);
      setResults(vehicles);
      setSearched(true);
      if (vehicles.length === 0) {
        onNotFound(q);
      }
    } finally {
      setLoading(false);
    }
  }, [query, onNotFound]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') { setResults([]); setSearched(false); }
  };

  const handleSelect = (vehicle: Vehicle) => {
    onFound(vehicle);
    setResults([]);
    setQuery('');
    setSearched(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 h-12 text-base"
            placeholder="ค้นหาด้วยทะเบียนรถ หรือเบอร์โทรลูกค้า..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <Button size="lg" onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ค้นหา'}
        </Button>
      </div>

      {/* Dropdown results */}
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-xl overflow-hidden">
          {results.map((vehicle) => (
            <button
              key={vehicle.id}
              className="w-full text-left px-4 py-3 hover:bg-accent flex items-center justify-between border-b last:border-0 transition-colors"
              onClick={() => handleSelect(vehicle)}
            >
              <div>
                <span className="font-semibold text-base">{vehicle.licensePlate}</span>
                <p className="text-sm text-muted-foreground">
                  {vehicle.brand} {vehicle.model}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{vehicle.customer?.name}</p>
                <p>{vehicle.customer?.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results hint */}
      {searched && results.length === 0 && !loading && (
        <p className="absolute top-full left-0 mt-2 text-sm text-muted-foreground">
          ไม่พบข้อมูล — เปิดฟอร์มลงทะเบียนอัตโนมัติแล้ว
        </p>
      )}
    </div>
  );
}
