// Test component to verify API connectivity

import React, { useState } from "react";

function APITester() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testScholarshipsAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/scholarships');
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  const testRecommendationsAPI = async () => {
    setLoading(true);
    try {
      // Using a test user ID - replace with actual user UID when testing
      const response = await fetch('http://localhost:8000/recommendations/test-user-id');
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>API Tester</h2>
      <button onClick={testScholarshipsAPI} disabled={loading}>
        Test Scholarships API
      </button>
      <button onClick={testRecommendationsAPI} disabled={loading} style={{ marginLeft: '10px' }}>
        Test Recommendations API
      </button>

      {loading && <p>Loading...</p>}

      <pre style={{
        backgroundColor: '#f5f5f5',
        padding: '10px',
        marginTop: '20px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        whiteSpace: 'pre-wrap',
        fontSize: '12px'
      }}>
        {result}
      </pre>
    </div>
  );
}

export default APITester;