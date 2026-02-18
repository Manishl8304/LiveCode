import React from "react";
import { useAuth } from "../contexts/authContext";
import { Navigate, Outlet } from "react-router-dom";

export const PublicLayout = () => {
  const user = useAuth();
  if (user.loading) return <>Checking authentication</>;
  if (user.user?.email) return <Navigate to="/home" />;
  else return <Outlet />;
};
