/**
 * Extension Popup Script (popup.js)
 * Manages the toggle switch to enable/disable the fake review detector,
 * saves the state to chrome.storage.local, and updates UI status states.
 */

document.addEventListener("DOMContentLoaded", () => {
  const toggleCheckbox = document.getElementById("toggle-detector");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  // Load the current toggle state from local storage (default to true/enabled)
  chrome.storage.local.get({ detectionEnabled: true }, (result) => {
    toggleCheckbox.checked = result.detectionEnabled;
    updateUI(result.detectionEnabled);
  });

  // Listen for switch click events
  toggleCheckbox.addEventListener("change", () => {
    const isEnabled = toggleCheckbox.checked;
    
    // Save to local storage
    chrome.storage.local.set({ detectionEnabled: isEnabled }, () => {
      updateUI(isEnabled);
    });
  });

  /**
   * Updates the popup status text and glowing dot based on detection status.
   * @param {boolean} isEnabled - Whether detection is active or not.
   */
  function updateUI(isEnabled) {
    if (isEnabled) {
      statusDot.classList.add("active");
      statusText.textContent = "Detection is active";
      statusText.style.color = "#f3f4f6"; // light text
    } else {
      statusDot.classList.remove("active");
      statusText.textContent = "Detection is paused";
      statusText.style.color = "#9ca3af"; // gray text
    }
  }
});
