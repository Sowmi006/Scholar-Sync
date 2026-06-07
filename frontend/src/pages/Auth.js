import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";
import "../styles/Auth.css";

function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const role = "student"; // Hardcoded as student
  const navigate = useNavigate();

  const register = async () => {
    if (!email || !password || !username || !name) {
      alert("Please fill in all fields");
      return;
    }
    try {
      setLoading(true);
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCred.user.uid), { email, username, name, role });
      alert("Registered successfully!");
      navigate("/profile");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }
    try {
      setLoading(true);
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", userCred.user.uid));
      if (snap.exists()) {
        alert("Logged in successfully!");
        navigate("/profile");
      } else {
        alert("User data not found. Please register first.");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (nextValue) => {
    setIsSignUp(nextValue);
    setEmail("");
    setPassword("");
    setUsername("");
    setName("");
  };

  return (
    <div style={{ backgroundColor: "#f0f2f5", minHeight: "100vh", paddingTop: "70px" }}>
      <Navbar />
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(90vh - 70px)", padding: "20px" }}>
        <div style={{
          backgroundColor: "white", padding: "40px", borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px"
        }}>
          <h1 style={{ color: "#3498db", textAlign: "center" }}>ScholarSync</h1>

          {/* Toggle Slide Bar */}
          <div className="toggle-container">
            <div className={`toggle-option ${isSignUp ? "active" : ""}`} onClick={() => handleToggle(true)}>
              Sign Up
            </div>
            <div className={`toggle-option ${!isSignUp ? "active" : ""}`} onClick={() => handleToggle(false)}>
              Sign In
            </div>
            <div className="toggle-slider" style={{ left: isSignUp ? "0%" : "50%" }}></div>
          </div>

          {/* Form Section */}
          <div style={{ marginTop: "30px" }}>
            <h2 style={{ textAlign: "center", color: "#2c3e50", marginBottom: "20px" }}>
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>

            {isSignUp && (
              <>
                <input 
                  type="text" 
                  placeholder="Username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ 
                    width: "100%", 
                    padding: "12px", 
                    marginBottom: "15px", 
                    borderRadius: "5px", 
                    border: "1px solid #ddd",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }} 
                />

                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ 
                    width: "100%", 
                    padding: "12px", 
                    marginBottom: "15px", 
                    borderRadius: "5px", 
                    border: "1px solid #ddd",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }} 
                />
              </>
            )}

            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "12px", 
                marginBottom: "15px", 
                borderRadius: "5px", 
                border: "1px solid #ddd",
                fontSize: "14px",
                boxSizing: "border-box"
              }} 
            />

            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "12px", 
                marginBottom: "25px", 
                borderRadius: "5px", 
                border: "1px solid #ddd",
                fontSize: "14px",
                boxSizing: "border-box"
              }} 
            />

            <button 
              onClick={isSignUp ? register : login}
              disabled={loading}
              style={{ 
                width: "100%", 
                padding: "12px", 
                backgroundColor: isSignUp ? "#2ecc71" : "#3498db", 
                color: "white", 
                border: "none", 
                borderRadius: "5px", 
                fontSize: "16px",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "background-color 0.3s ease"
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = isSignUp ? "#27ae60" : "#2980b9")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = isSignUp ? "#2ecc71" : "#3498db")}
            >
              {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Sign In")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
