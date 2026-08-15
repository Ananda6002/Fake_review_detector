/**
 * Background Service Worker (background.js)
 * Handles API calls to the local Fake Review Detector backend.
 * Running requests in the background script prevents issues with page CORS policies.
 */

const API_URL = "http://127.0.0.1:8000/api/analyze";

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyzeReview") {
    // Perform async fetch and send the result back
    analyzeReview(message.text)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    // Return true to indicate we will respond asynchronously
    return true;
  }
});

/**
 * Sends review text to the FastAPI backend API for analysis.
 * @param {string} text - The text content of the review.
 * @returns {Promise<object>} The classification response containing label, confidence, etc.
 */
async function analyzeReview(text) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: text })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error calling Fake Review Detector API:", error);
    throw error;
  }
}
