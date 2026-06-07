import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

function ScholarshipSection({ title, emptyMessage, scholarships, sectionKey }) {
  const [openKey, setOpenKey] = useState(null);

  const toggleScholarship = (key) => {
    setOpenKey((current) => (current === key ? null : key));
  };

  return (
    <div style={{ marginTop: "24px" }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "12px" }}>{title}</h2>
      {scholarships.length === 0 ? (
        <p style={{ color: "#555", margin: 0 }}>{emptyMessage}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {scholarships.map((s, idx) => {
            const itemKey = `${sectionKey}-${idx}`;
            return (
              <li
                key={itemKey}
                style={{
                  marginBottom: "12px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid #dfe6e9",
                  backgroundColor: "#fafafa",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleScholarship(itemKey)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 18px",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ color: "#2c3e50", fontSize: "1rem", fontWeight: "700" }}>
                    {s.name}
                  </span>
                  <span style={{ color: "#3498db", fontSize: "1.2rem", fontWeight: "700" }}>
                    {openKey === itemKey ? "-" : "+"}
                  </span>
                </button>

                {openKey === itemKey && (
                  <div style={{ padding: "0 18px 18px 18px", fontSize: "0.9rem", color: "#555", lineHeight: "1.6" }}>
                    <p><strong>Provider:</strong> {s.provider}</p>
                    <p><strong>Scheme:</strong> {s.scheme}</p>
                    <p><strong>Level:</strong> {s.level}</p>
                    <p><strong>Country/Region:</strong> {s.country}</p>
                    <p><strong>Amount:</strong> {s.amount}</p>
                    <p><strong>Deadline:</strong> {s.deadline}</p>
                    <p><strong>Eligibility:</strong> {s.eligibility}</p>
                    <p><strong>Tags:</strong> {s.tags}</p>
                    {s.applyLink ? (
                      <button
                        onClick={() => window.open(s.applyLink, "_blank")}
                        style={{
                          backgroundColor: "#3498db",
                          color: "white",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          marginTop: "8px",
                        }}
                      >
                        Apply / Learn More
                      </button>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Recommendations() {
  const [officialScholarships, setOfficialScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchScholarships = async () => {
      try {
        const response = await fetch("http://localhost:8000/scholarships");
        const data = await response.json();
        setOfficialScholarships(
          Array.isArray(data.officialScholarships)
            ? data.officialScholarships
            : Array.isArray(data.scholarships)
              ? data.scholarships
              : []
        );
        setErrorMessage("");
      } catch (err) {
        console.error("Error fetching scholarships:", err);
        setOfficialScholarships([]);
        setErrorMessage("We could not load scholarships right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchScholarships();
  }, []);

  return (
    <div style={{ backgroundColor: "#f0f2f5", minHeight: "100vh", paddingTop: "70px" }}>
      <Navbar />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          minHeight: "calc(90vh - 70px)",
          padding: "30px 20px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            width: "100%",
            maxWidth: "900px",
          }}
        >
          <h1 style={{ textAlign: "center", color: "#3498db", marginBottom: "12px" }}>
            Scholarships Available in ScholarSync
          </h1>
          <p style={{ textAlign: "center", color: "#555", marginTop: 0 }}>
            This page lists all official scholarships currently available in the app.
          </p>

          {loading ? (
            <p style={{ textAlign: "center" }}>Fetching scholarships...</p>
          ) : errorMessage ? (
            <p style={{ textAlign: "center" }}>{errorMessage}</p>
          ) : (
            <>
              <ScholarshipSection
                title="Official Government Scholarships"
                emptyMessage="No scholarships are available right now."
                scholarships={officialScholarships}
                sectionKey="official"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Recommendations;
