import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import axiosClient from "./lib/axios.js";
import MapShell from "./pages/MapShell.jsx";
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PetugasLayout from "./pages/dashboard/PetugasLayout.jsx";
import PetugasDashboard from "./pages/dashboard/PetugasDashboard.jsx";
import BuildingDetail from "./pages/dashboard/BuildingDetail.jsx";
import AdminLayout from "./pages/dashboard/AdminLayout.jsx";
import AdminDashboard from "./pages/dashboard/AdminDashboard.jsx";
import AdminUsers from "./pages/dashboard/AdminUsers.jsx";

export default function App() {
  useEffect(() => {
    axiosClient.get('/ping')
      .then(({ data }) => console.log("✅ Backend Connected:", data))
      .catch((err) => console.error("❌ Backend Connection Error:", err));
  }, []);

  return (
    <Routes>
      <Route path="/" element={<MapShell />} />
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/petugas"
        element={
          <ProtectedRoute allow={["petugas"]}>
            <PetugasLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PetugasDashboard />} />
        <Route path="bangunan/:id" element={<BuildingDetail />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
