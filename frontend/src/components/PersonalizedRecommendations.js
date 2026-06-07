// Sample code to fetch personalized scholarship recommendations

import React, { useEffect, useState } from "react";
import { auth } from "../firebase";

function PersonalizedRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError("Please log in to get personalized recommendations");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch personalized recommendations based on user profile
        const response = await fetch(`http://localhost:8000/recommendations/${user.uid}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) {
    return <div>Loading personalized recommendations...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Your Personalized Scholarship Recommendations</h2>
      {recommendations.length === 0 ? (
        <p>No recommendations found. Please complete your profile for better matches.</p>
      ) : (
        <ul>
          {recommendations.map((scholarship, index) => (
            <li key={index} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd' }}>
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

export default PersonalizedRecommendations;