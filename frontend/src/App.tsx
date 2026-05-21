import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { SignIn } from "./pages/SignIn";
import { SignUp } from "./pages/SignUp";
import { VerifyEmail } from "./pages/VerifyEmail";
import { Dashboard } from "./pages/Dashboard";
import { Labs } from "./pages/Labs";
import { Network } from "./pages/Network";
import { Databases } from "./pages/Databases";
import { Jobs } from "./pages/Jobs";
import { Placeholder } from "./pages/Placeholder";

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/auth/signin" element={<SignIn />} />
      <Route path="/auth/signup" element={<SignUp />} />
      <Route path="/auth/verify" element={<VerifyEmail />} />

      {/* protected */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/labs"
        element={
          <ProtectedRoute>
            <Labs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/network"
        element={
          <ProtectedRoute>
            <Network />
          </ProtectedRoute>
        }
      />
      <Route
        path="/databases"
        element={
          <ProtectedRoute>
            <Databases />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <Jobs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Placeholder title="Admin" phase="ROLE · RESTRICTED" />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
