import React, { useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";

function Provider() {
  const [name, setName] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [deadline, setDeadline] = useState("");
  const [tags, setTags] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in first!");
      return;
    }

    try {
      await addDoc(collection(db, "scholarships"), {
        name,
        eligibility,
        deadline,
        tags,
        source: "provider",
        provider: "Registered Provider",
        scheme: "Provider Scholarship",
        country: "India",
        level: "Custom Scholarship",
        amount: "Contact provider",
        applyLink: "",
        createdBy: user.uid,
        providerEmail: user.email
      });
      alert("Scholarship added successfully!");
      setName(""); setEligibility(""); setDeadline(""); setTags("");
    } catch (err) {
      console.error("Error adding scholarship:", err);
      alert("Failed to add scholarship. Please try again.");
    }
  };

  return (
    <div style={{ backgroundColor: "#f0f2f5", height: "100vh", paddingTop: "70px" }}>
      <Navbar />
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(90% - 70px)" }}>
        <div style={{
          backgroundColor: "white", padding: "30px", borderRadius: "10px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)", width: "400px"
        }}>
          <h1 style={{ textAlign: "center", color: "#2ecc71" }}>Provider Form</h1>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <input placeholder="Scholarship Name" value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }} required />
            <input placeholder="Eligibility" value={eligibility}
              onChange={(e) => setEligibility(e.target.value)}
              style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }} required />
            <input type="date" value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }} required />
            <input placeholder="Tags (comma separated)" value={tags}
              onChange={(e) => setTags(e.target.value)}
              style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }} />
            <button type="submit"
              style={{ backgroundColor: "#2ecc71", color: "white", padding: "12px", border: "none", borderRadius: "5px" }}>
              Submit Scholarship
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Provider;
