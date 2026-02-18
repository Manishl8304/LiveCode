import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/authContext";
import { Navbar } from "../components/Navbar/Navbar";
export const ProtectedLayout = () => {
  const { user, loading } = useAuth();

  if (loading) return <>Checking authentication</>;
  if (!user || !user.email) return <Navigate to="/" replace />;
  return (
    <>
      <Outlet />
    </>
  );
};
