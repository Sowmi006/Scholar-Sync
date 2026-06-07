import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import SplashScreen from "./pages/SplashScreen";
import RoleSelection from "./pages/RoleSelection";
import Auth from "./pages/Auth";
import Chatbot from "./pages/Chatbot";
import Recommendations from "./pages/Recommendations";
import Profile from "./pages/Profile";
import { auth, db } from "./firebase";

function ProtectedRoute({ children, allowedRoles }) {
  const [status, setStatus] = useState("loading");
  const [role, setRole] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("unauthenticated");
        setRole("");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const nextRole = userDoc.exists() ? userDoc.data().role || "" : "";
        setRole(nextRole);
        setStatus("authenticated");
      } catch (error) {
        console.error("Failed to fetch user role:", error);
        setStatus("unauthenticated");
        setRole("");
      }
    });

    return () => unsubscribe();
  }, []);

  if (status === "loading") {
    return null;
  }

  if (status !== "authenticated") {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/profile" replace />;
  }

  return children;
}

function App() {
  useEffect(() => {
    signOut(auth).catch((error) => {
      console.error("Failed to reset auth state on app load:", error);
    });
  }, []);

  return (
    <Router>
      <Routes>
        {/* Splash screen loads first */}
        <Route path="/" element={<SplashScreen />} />

        {/* Role selection page */}
        <Route path="/role" element={<RoleSelection />} />

        {/* Auth pages */}
        <Route path="/auth" element={<Auth />} />

        {/* Chatbot */}
        <Route
          path="/chatbot"
          element={(
            <ProtectedRoute allowedRoles={["student"]}>
              <Chatbot />
            </ProtectedRoute>
          )}
        />

        {/* Other pages */}
        <Route
          path="/recommendations"
          element={(
            <ProtectedRoute allowedRoles={["student"]}>
              <Recommendations />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute allowedRoles={["student"]}>
              <Profile />
            </ProtectedRoute>
          )}
        />
      </Routes>
    </Router>
  );
}

export default App;
