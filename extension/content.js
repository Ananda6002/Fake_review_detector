/**
 * Content Script (content.js)
 * Automatically detects reviews on Amazon, Flipkart, and local test pages,
 * calls the Fake Review Detector API directly, and injects prediction badges.
 *
 * NOTE: In Manifest V3, content scripts can fetch() to hosts listed in
 * host_permissions, so we call the API directly (no background.js relay needed).
 */

const API_URL = "http://127.0.0.1:8000/api/analyze";

// Caches to prevent duplicate API requests
const apiCache = new Map(); // text -> { status: "success"|"error", data, message }
const pendingReviews = new Map(); // text -> [{ badgeInsertEl, loadingBadge }]

// Site configurations with custom DOM selectors
const SITE_CONFIGS = {
  amazon: {
    reviewSelector: '[data-hook="review"], .review',
    textSelector: '[data-hook="review-body"], .review-text, .review-text-content',
    badgeInsertSelector: '[data-hook="review-title"], .review-title, a[data-hook="review-title"]'
  },
  flipkart: {
    reviewSelector: 'div._27M-vq, div.col._2w1p5b, [class*="_27M-vq"]',
    textSelector: '.t-yDYN, .qwjRws, div.row + div.row div',
    badgeInsertSelector: 'div.row:first-child, ._2-N1sw'
  },
  generic: {
    reviewSelector: '.review, [data-hook="review"], [class*="review" i]:not(span):not(a):not(input):not(script)',
    textSelector: '[data-hook="review-body"], .review-body, .review-text, p',
    badgeInsertSelector: '[data-hook="review-title"], .review-title, h3, h4, .review-header'
  }
};

let isEnabled = true;
let observer = null;

// Determine current website type
function detectSiteType() {
  const host = window.location.hostname.toLowerCase();
  if (host.includes("amazon.")) return "amazon";
  if (host.includes("flipkart.")) return "flipkart";
  return "generic";
}

// Clean review text for optimal model classification
function cleanReviewText(text) {
  if (!text) return "";
  return text
    .replace(/Read more/g, "")
    .replace(/Images in this review/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Scans the DOM and processes newly loaded reviews
function scanReviews() {
  if (!isEnabled) return;

  const site = detectSiteType();
  const config = SITE_CONFIGS[site] || SITE_CONFIGS.generic;
  const reviewElements = document.querySelectorAll(config.reviewSelector);

  reviewElements.forEach(reviewEl => {
    // Skip if already processed
    if (reviewEl.dataset.reviewProcessed === "true") return;

    // Locate review text element
    let textEl = reviewEl.querySelector(config.textSelector);
    if (!textEl) {
      textEl = reviewEl.querySelector("p") || reviewEl;
    }

    const text = cleanReviewText(textEl.innerText || textEl.textContent || "");
    // Ignore short reviews or boilerplate
    if (!text || text.length < 5) return;

    // Mark element as processed to avoid double scanning
    reviewEl.dataset.reviewProcessed = "true";

    // Locate node to insert badge after
    let badgeInsertEl = reviewEl.querySelector(config.badgeInsertSelector);
    if (!badgeInsertEl) {
      badgeInsertEl = textEl;
    }

    // Check if result is already cached
    if (apiCache.has(text)) {
      const cached = apiCache.get(text);
      const badge = showLoadingBadge(badgeInsertEl);
      if (cached.status === "success") {
        replaceBadgeWithResult(badge, cached.data);
      } else {
        replaceBadgeWithError(badge, cached.message);
      }
    } else {
      analyzeAndBadge(reviewEl, badgeInsertEl, text);
    }
  });
}

// Calls the backend API directly and manages UI badge transitions
async function analyzeAndBadge(reviewEl, badgeInsertEl, text) {
  const loadingBadge = showLoadingBadge(badgeInsertEl);

  if (pendingReviews.has(text)) {
    pendingReviews.get(text).push({ badgeInsertEl, loadingBadge });
    return;
  }

  pendingReviews.set(text, [{ badgeInsertEl, loadingBadge }]);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const queue = pendingReviews.get(text) || [];
    pendingReviews.delete(text);

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      const errorMsg = `API error (${response.status}): ${errText}`;
      apiCache.set(text, { status: "error", message: errorMsg });
      queue.forEach(item => replaceBadgeWithError(item.loadingBadge, errorMsg));
      return;
    }

    const prediction = await response.json();
    apiCache.set(text, { status: "success", data: prediction });
    queue.forEach(item => replaceBadgeWithResult(item.loadingBadge, prediction));

  } catch (error) {
    const queue = pendingReviews.get(text) || [];
    pendingReviews.delete(text);

    const errorMsg = error.message || "Network error";
    apiCache.set(text, { status: "error", message: errorMsg });
    queue.forEach(item => replaceBadgeWithError(item.loadingBadge, errorMsg));
  }
}

// Creates and injects a loading badge beside a review
function showLoadingBadge(insertEl) {
  const badge = document.createElement("span");
  badge.className = "review-detector-badge loading";

  const spinner = document.createElement("span");
  spinner.className = "review-detector-spinner";

  const textNode = document.createTextNode(" Analyzing...");

  badge.appendChild(spinner);
  badge.appendChild(textNode);

  const tag = insertEl.tagName;
  const inlineOrBlock = ["SPAN", "A", "P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6"];
  if (inlineOrBlock.includes(tag)) {
    insertEl.insertAdjacentElement("afterend", badge);
  } else {
    insertEl.prepend(badge);
  }

  return badge;
}

// Replaces loading badge with Genuine/Fake result
function replaceBadgeWithResult(badgeEl, prediction) {
  if (!badgeEl) return;
  badgeEl.innerHTML = "";

  const isFake = prediction.label === 1;
  const confPercent = Math.round((prediction.confidence || 0) * 100);

  badgeEl.className = `review-detector-badge ${isFake ? "fake" : "genuine"}`;

  const dot = document.createElement("span");
  dot.className = "review-detector-dot";

  const labelText = isFake ? `Fake (${confPercent}%)` : `Genuine (${confPercent}%)`;
  const textNode = document.createTextNode(` ${labelText}`);

  badgeEl.appendChild(dot);
  badgeEl.appendChild(textNode);
}

// Replaces loading badge with an Error state
function replaceBadgeWithError(badgeEl, errorMsg) {
  if (!badgeEl) return;
  badgeEl.innerHTML = "";
  badgeEl.className = "review-detector-badge error";

  const dot = document.createElement("span");
  dot.className = "review-detector-dot";

  const textNode = document.createTextNode(" Error");
  badgeEl.appendChild(dot);
  badgeEl.appendChild(textNode);
  badgeEl.title = errorMsg || "Failed to analyze review";
}

// Removes all injected elements and resets reviews
function stopDetection() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  document.querySelectorAll(".review-detector-badge").forEach(badge => badge.remove());
  document.querySelectorAll("[data-review-processed]").forEach(el => {
    el.removeAttribute("data-review-processed");
  });
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Starts the MutationObserver for dynamic content
function initDetection() {
  if (observer) return;

  // Run initial scan
  scanReviews();

  // Handle infinite scroll / AJAX loaded reviews
  observer = new MutationObserver(debounce(() => {
    if (isEnabled) scanReviews();
  }, 400));

  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize based on saved storage config
// Falls back to enabled=true if chrome.storage is unavailable (e.g. content script context)
if (typeof chrome !== "undefined" && chrome.storage) {
  chrome.storage.local.get({ detectionEnabled: true }, (result) => {
    isEnabled = result.detectionEnabled !== false;
    if (isEnabled) initDetection();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.detectionEnabled) {
      const newVal = changes.detectionEnabled.newValue;
      if (newVal !== isEnabled) {
        isEnabled = newVal;
        if (isEnabled) initDetection();
        else stopDetection();
      }
    }
  });
} else {
  // Fallback: run directly if chrome APIs not available
  initDetection();
}
