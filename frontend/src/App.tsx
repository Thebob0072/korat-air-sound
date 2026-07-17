import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';
import POSDashboard from '@/pages/POSDashboard';
import OrdersPage from '@/pages/OrdersPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import ProductsPage from '@/pages/ProductsPage';
import ReportsPage from '@/pages/ReportsPage';
import CustomersPage from '@/pages/CustomersPage';

export default function App() {
  return (
      <div className="min-h-screen bg-[#ECEAE6]">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 max-w-7xl">
        <Routes>
          <Route path="/" element={<POSDashboard />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
