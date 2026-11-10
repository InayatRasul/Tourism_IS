import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth, RequireRole } from './auth/guards';
import { MockStoreProvider } from './mocks/MockStoreContext';
import { Layout } from './components/Layout';
import { ExcursionsSearchPage } from './pages/public/ExcursionsSearchPage';
import { ExcursionDetailsPage } from './pages/public/ExcursionDetailsPage';
import { TripsListPage } from './pages/public/TripsListPage';
import { TripDetailsPage } from './pages/public/TripDetailsPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { UnavailablePage } from './pages/public/UnavailablePage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { CheckoutPage } from './pages/tourist/CheckoutPage';
import { MyBookingsPage } from './pages/tourist/MyBookingsPage';
import { ProfilePage } from './pages/tourist/ProfilePage';
import { ProviderHubPage } from './pages/provider/ProviderHubPage';
import { AdminConsolePage } from './pages/admin/AdminConsolePage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MockStoreProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              {/* Public routes */}
              <Route path="/" element={<ExcursionsSearchPage />} />
              <Route path="/excursions/:id" element={<ExcursionDetailsPage />} />
              <Route path="/trips" element={<TripsListPage />} />
              <Route path="/trips/:id" element={<TripDetailsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/unavailable" element={<UnavailablePage />} />

              {/* Authenticated profile */}
              <Route
                path="/me"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />

              {/* Tourist routes */}
              <Route
                path="/checkout/:kind/:id"
                element={
                  <RequireRole roles={['tourist']}>
                    <CheckoutPage />
                  </RequireRole>
                }
              />
              <Route
                path="/me/bookings"
                element={
                  <RequireRole roles={['tourist']}>
                    <MyBookingsPage />
                  </RequireRole>
                }
              />

              {/* Provider routes (Guide & Agency Manager) */}
              <Route
                path="/provider"
                element={
                  <RequireRole roles={['guide', 'agency_manager']}>
                    <ProviderHubPage />
                  </RequireRole>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <RequireRole roles={['admin']}>
                    <AdminConsolePage />
                  </RequireRole>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MockStoreProvider>
    </AuthProvider>
  );
};
