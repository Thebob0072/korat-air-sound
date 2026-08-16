import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from '@/components/Sidebar';
import POSDashboard from '@/pages/POSDashboard';
import Dashboard from '@/pages/Dashboard';
import OrdersPage from '@/pages/OrdersPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import ProductsPage from '@/pages/ProductsPage';
import ReportsPage from '@/pages/ReportsPage';
import CustomersPage from '@/pages/CustomersPage';
import CustomerDetailPage from '@/pages/CustomerDetailPage';
import ReceivablesPage from '@/pages/ReceivablesPage';
import BusinessSelectPage from '@/pages/BusinessSelectPage';
import { BusinessProvider, useBusiness } from '@/context/BusinessContext';

function BusinessGuard({ children }: { children: React.ReactNode }) {
  const { selected } = useBusiness();
  const location = useLocation();
  if (!selected) {
    return <Navigate to="/select" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

function AppInner() {
  return (
    <Routes>
      {/* Business selection — standalone page, no sidebar */}
      <Route path="/select" element={<BusinessSelectPage />} />

      {/* All app routes — guarded, with sidebar */}
      <Route
        path="*"
        element={
          <BusinessGuard>
            <div className="flex min-h-screen bg-[#ECEAE6]">
              <Sidebar />
              {/* pt-12 = height of mobile top bar; removed on lg+ */}
              <div className="flex-1 flex flex-col min-w-0 pt-12 lg:pt-0">
                <main className="flex-1 mx-auto px-4 sm:px-8 py-6 sm:py-8 max-w-screen-xl w-full">
                  <Routes>
                    <Route path="/" element={<POSDashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/orders/:id" element={<OrderDetailPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/customers/:id" element={<CustomerDetailPage />} />
                    <Route path="/receivables" element={<ReceivablesPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                  </Routes>
                </main>
              </div>
            </div>
          </BusinessGuard>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BusinessProvider>
      <AppInner />
      <Toaster richColors position="top-right" />
    </BusinessProvider>
  );
}
