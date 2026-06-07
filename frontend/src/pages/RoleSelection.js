import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/RoleSelection.css";

function RoleSelection() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/auth");
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="role-selection">
      <img src="/logo.png" alt="ScholarSync Logo" className="role-logo" />
      <h2>This app provides you with scholarship recommendations</h2>
    </div>
  );
}

export default RoleSelection;
