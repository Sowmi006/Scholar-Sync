// Sample code to fetch scholarships from the backend API

import React, { useEffect, useState } from "react";

function ScholarshipFetcher() {
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScholarships = async () => {
      try {
        setLoading(true);
        // Fetch all scholarships
        const response = await fetch('http://localhost:8000/scholarships');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setScholarships(data.scholarships || []);
      } catch (err) {
        console.error('Error fetching scholarships:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchScholarships();
  }, []);

  if (loading) {
    return <div>Loading scholarships...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Available Scholarships</h2>
      {scholarships.length === 0 ? (
        <p>No scholarships found.</p>
      ) : (
        <ul>
          {scholarships.map((scholarship, index) => (
            <li key={index}>
              <h3>{scholarship.name}</h3>
              <p><strong>Eligibility:</strong> {scholarship.eligibility}</p>
              <p><strong>Deadline:</strong> {scholarship.deadline}</p>
              <p><strong>Tags:</strong> {scholarship.tags}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ScholarshipFetcher;