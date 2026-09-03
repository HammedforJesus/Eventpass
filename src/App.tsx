import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/Navbar';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { EventCreatePage } from './pages/EventCreatePage';
import { EventDetailPage } from './pages/EventDetailPage';
import { CheckInInterface } from './pages/CheckInInterface';
import { GuestInvitePage } from './pages/GuestInvitePage';
import { PublicCheckInLookup } from './pages/PublicCheckInLookup';

// Route guard for authenticated users
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ('ORGANIZER' | 'STAFF')[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public landing */}
                <Route path="/" element={<LandingPage />} />

                {/* Auth */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Public Guest Pass View */}
                <Route path="/invite/:token" element={<GuestInvitePage />} />

                {/* Gate Check-In direct or Lookup */}
                <Route path="/check-in" element={<PublicCheckInLookup />} />

                {/* Protected Organizer/Staff Dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <OrganizerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/events"
                  element={
                    <ProtectedRoute>
                      <OrganizerDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Event Creation (Organizer only) */}
                <Route
                  path="/events/new"
                  element={
                    <ProtectedRoute allowedRoles={['ORGANIZER']}>
                      <EventCreatePage />
                    </ProtectedRoute>
                  }
                />

                {/* Event Detail & Control Cockpit */}
                <Route
                  path="/events/:id"
                  element={
                    <ProtectedRoute>
                      <EventDetailPage />
                    </ProtectedRoute>
                  }
                />

                {/* Dedicated Gate Scanner Interface for Specific Event */}
                <Route
                  path="/events/:id/check-in"
                  element={
                    <ProtectedRoute>
                      <CheckInInterface />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
