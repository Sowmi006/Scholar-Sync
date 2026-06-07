import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const linkBaseStyle = (menuOpen) => ({
  color: "white",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: menuOpen ? "10px" : "0",
  fontSize: menuOpen ? "1rem" : "1.5rem",
  padding: "10px",
  borderRadius: "8px",
  transition: "all 0.3s",
  position: "relative",
  width: menuOpen ? "100%" : "auto",
});

const tooltipStyle = {
  display: "none",
  position: "absolute",
  left: "60px",
  top: "50%",
  transform: "translateY(-50%)",
  backgroundColor: "#34495e",
  color: "white",
  padding: "5px 10px",
  borderRadius: "4px",
  fontSize: "0.8rem",
  whiteSpace: "nowrap",
  zIndex: 1001,
};

function NavItem({ to, icon, label, menuOpen, onClick }) {
  return (
    <Link
      to={to}
      style={linkBaseStyle(menuOpen)}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!menuOpen) {
          e.currentTarget.style.backgroundColor = "#34495e";
          const tooltip = e.currentTarget.querySelector(".tooltip");
          if (tooltip) {
            tooltip.style.display = "block";
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!menuOpen) {
          e.currentTarget.style.backgroundColor = "transparent";
          const tooltip = e.currentTarget.querySelector(".tooltip");
          if (tooltip) {
            tooltip.style.display = "none";
          }
        }
      }}
    >
      <span>{icon}</span>
      {menuOpen && <span>{label}</span>}
      {!menuOpen && <span className="tooltip" style={tooltipStyle}>{label}</span>}
    </Link>
  );
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setIsAuthenticated(userDoc.exists());
      } catch (error) {
        console.error("Failed to load navbar state:", error);
        setIsAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const asideWidth = menuOpen ? 200 : 60;
  const toggleMenu = () => setMenuOpen((current) => !current);

  return (
    <>
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: "70px",
          height: "calc(100vh - 70px)",
          width: `${asideWidth}px`,
          backgroundColor: "#2c3e50",
          color: "white",
          padding: menuOpen ? "20px" : "20px 10px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: menuOpen ? "flex-start" : "center",
          gap: menuOpen ? "12px" : "20px",
          zIndex: 1000,
          transition: "width 0.3s ease, padding 0.3s ease",
        }}
      >
        {menuOpen && <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Menu</h2>}

        <NavItem to="/auth" icon="🔐" label="Auth" menuOpen={menuOpen} onClick={toggleMenu} />

        {isAuthenticated && (
          <>
            <NavItem to="/profile" icon="👤" label="Profile" menuOpen={menuOpen} onClick={toggleMenu} />
            <NavItem to="/recommendations" icon="🎓" label="Availabilities" menuOpen={menuOpen} onClick={toggleMenu} />
            <NavItem to="/chatbot" icon="🤖" label="AI Assistant" menuOpen={menuOpen} onClick={toggleMenu} />
          </>
        )}
      </aside>

      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          padding: "15px 20px",
          backgroundColor: "#3498db",
          color: "white",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link to="/" style={{ display: "inline-flex", alignItems: "center" }}>
          <img
            src="/logo.png"
            alt="ScholarSync Logo"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              objectFit: "cover",
              cursor: "pointer",
            }}
          />
        </Link>
        <div
          style={{
            fontSize: "1.8rem",
            fontFamily: "Comic Sans MS, cursive",
          }}
        >
          ScholarSync
        </div>
      </nav>
    </>
  );
}

export default Navbar;
