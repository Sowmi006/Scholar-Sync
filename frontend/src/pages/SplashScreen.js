import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/SplashScreen.css";

function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // Navigate to auth after 2 seconds
    const timer = setTimeout(() => {
      navigate("/auth");
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-screen">
      <img src="/logo.png" alt="ScholarSync Logo" className="splash-logo" />
    </div>
  );
}

export default SplashScreen;
