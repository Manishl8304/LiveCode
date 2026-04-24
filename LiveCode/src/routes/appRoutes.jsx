import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../Pages/LandingPage/LandingPage";
import Home from "../Pages/Home/Home";
import { ProtectedLayout } from "./ProtectedLayout";
import { PublicLayout } from "./PublicLayout";
import { MainLayout } from "../layouts/MainLayout";
import { MeetingRoom } from "../Pages/MeetingRoom/MeetingRoom";
import { useAuth } from "../contexts/authContext";

const AppRoutes = () => {
  const user = useAuth();
  console.log("user", user);
  if (user.email != null) return <Navigate to="home" replace />;
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="" element={<LandingPage />}></Route>
      </Route>
      {/* <Route element={<ProtectedLayout />}> */}
        <Route element={<MainLayout />}>
          <Route path="/home" element={<Home />}></Route>
          <Route path="/home/:meetingId" element={<MeetingRoom />}></Route>
        {/* </Route> */}
      </Route>
    </Routes>
  );
};

export default AppRoutes;
