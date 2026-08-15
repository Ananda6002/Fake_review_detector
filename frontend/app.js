// Presets Dictionary
const PRESETS = {
    "gen-electronics": "I bought this vacuum cleaner last week. The suction is great for hardwood floors, but it struggles a bit on thick carpets. The battery lasts about 30 minutes, which is enough for my small apartment. It's relatively quiet. Overall, a solid purchase, though a bit expensive.",
    "fake-electronics": "WOW! AMAZING PRODUCT! BEST VACUUM CLEANER EVER!!! BUY THIS NOW!!! MUST BUY!!! AWESOME SUCTION! BUY THIS NOW!!!",
    "gen-hotel": "Nice hotel, clean rooms, and friendly staff. The location is perfect, just a short walk to the subway station. The breakfast was a bit basic, and the Wi-Fi was slow in the evening. Overall, a pleasant stay for a weekend trip.",
    "fake-hotel": "This hotel is the worst hotel in the world!!! Do not stay here! Terrible service, dirty rooms, completely ruined my vacation. Beware! Total scam!"
};

// Radial Progress Constants
const CIRCUMFERENCE = 2 * Math.PI * 34; // 213.628

// DOM Elements
const textarea = document.getElementById("review-textarea");
const wordCharCountLabel = document.getElementById("char-word-count");
const btnClear = document.getElementById("btn-clear");
const btnAnalyze = document.getElementById("btn-analyze");
const presetButtons = document.querySelectorAll(".btn-preset");
const navBtnAnalyzer = document.getElementById("nav-btn-analyzer");

// Auth and Modal Selectors
const btnLoginModal = document.getElementById("btn-login-modal");
const btnRegisterModal = document.getElementById("btn-register-modal");
const btnLogout = document.getElementById("btn-logout");
const authModal = document.getElementById("auth-modal");
const modalCloseBtn = document.getElementById("modal-close-btn");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const authNavContainer = document.getElementById("auth-nav-container");
const userProfileContainer = document.getElementById("user-profile-container");
const userDisplayName = document.getElementById("user-display-name");

const navBtnHistory = document.getElementById("nav-btn-history");
const historyModal = document.getElementById("history-modal");
const historyCloseBtn = document.getElementById("history-close-btn");
const historyItemsContainer = document.getElementById("history-items-container");

const resultsPlaceholder = document.getElementById("results-placeholder");
const resultsContent = document.getElementById("results-content");

const verdictBanner = document.getElementById("verdict-banner");
const verdictIcon = document.getElementById("verdict-icon");
const verdictTitle = document.getElementById("verdict-title");
const verdictSubtitle = document.getElementById("verdict-subtitle");
const confidenceCircle = document.getElementById("confidence-circle");
const confidencePercentage = document.getElementById("confidence-percentage");

// Metrics
const barRepetitiveness = document.getElementById("bar-repetitiveness");
const valRepetitiveness = document.getElementById("val-repetitiveness");
const barShouting = document.getElementById("bar-shouting");
const valShouting = document.getElementById("val-shouting");
const barExclamation = document.getElementById("bar-exclamation");
const valExclamation = document.getElementById("val-exclamation");
const barSentiment = document.getElementById("bar-sentiment");
const valSentiment = document.getElementById("val-sentiment");

// Highlighter and Tokens
const highlightedTextBox = document.getElementById("highlighted-text");
const tokensContainer = document.getElementById("tokens-container");
const cleanTokensContainer = document.getElementById("clean-tokens-container");



// Tab Elements
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPanes = document.querySelectorAll(".tab-pane");

// Setup Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    // Seed default mock account for testing
    let accounts = [];
    try {
        accounts = JSON.parse(localStorage.getItem("mock_accounts") || "[]");
    } catch (e) {
        accounts = [];
    }
    if (!Array.isArray(accounts) || accounts.length === 0 || !accounts.some(a => a.email.toLowerCase() === "anand@example.com")) {
        const defaultAccounts = [
            { email: "anand@example.com", name: "Anand", password: "password123" }
        ];
        if (Array.isArray(accounts)) {
            accounts.forEach(a => {
                if (a.email && a.email.toLowerCase() !== "anand@example.com") {
                    defaultAccounts.push(a);
                }
            });
        }
        localStorage.setItem("mock_accounts", JSON.stringify(defaultAccounts));
    }

    // Initial setup
    updateWordCharCount();
    updateAuthUI();
    
    // Set circle circumference
    confidenceCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    confidenceCircle.style.strokeDashoffset = CIRCUMFERENCE;

    // Check if there is a pending review loaded from the diagnostics page
    const pendingText = localStorage.getItem("pending_review_text");
    if (pendingText) {
        textarea.value = pendingText;
        updateWordCharCount();
        localStorage.removeItem("pending_review_text");
        
        // Auto-run analysis for convenience
        performAnalysis();
    }

    // Textarea listeners
    textarea.addEventListener("input", () => {
        updateWordCharCount();
        // Clear active preset classes when editing manually
        presetButtons.forEach(btn => btn.classList.remove("active"));
    });

    // Presets click listeners
    presetButtons.forEach(button => {
        button.addEventListener("click", () => {
            const key = button.getAttribute("data-preset");
            if (PRESETS[key]) {
                textarea.value = PRESETS[key];
                updateWordCharCount();
                
                // Toggle active button states
                presetButtons.forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");
            }
        });
    });

    // Clear Action
    btnClear.addEventListener("click", () => {
        textarea.value = "";
        updateWordCharCount();
        presetButtons.forEach(btn => btn.classList.remove("active"));
        resetResultsUI();
    });

    // Analyze Action
    btnAnalyze.addEventListener("click", performAnalysis);

    // Reveal Explainable AI details
    const btnRevealXai = document.getElementById("btn-reveal-xai");
    const xaiPlaceholder = document.getElementById("xai-placeholder");
    const xaiContainerBody = document.getElementById("xai-container-body");

    if (btnRevealXai && xaiPlaceholder && xaiContainerBody) {
        btnRevealXai.addEventListener("click", () => {
            xaiPlaceholder.classList.add("hidden");
            xaiContainerBody.classList.remove("hidden");
        });
    }

    navBtnAnalyzer.addEventListener("click", (e) => {
        e.preventDefault();
        navBtnAnalyzer.classList.add("active");
        document.getElementById("dashboard-anchor").scrollIntoView({ behavior: 'smooth' });
    });

    // Auth Modal Triggering
    btnLoginModal.addEventListener("click", () => {
        authModal.classList.remove("hidden");
        switchAuthModalTab("login-pane");
    });

    btnRegisterModal.addEventListener("click", () => {
        authModal.classList.remove("hidden");
        switchAuthModalTab("signup-pane");
    });

    modalCloseBtn.addEventListener("click", () => {
        authModal.classList.add("hidden");
    });

    // Click outside to close modals
    window.addEventListener("click", (e) => {
        if (e.target === authModal) {
            authModal.classList.add("hidden");
        }
        if (e.target === historyModal) {
            historyModal.classList.add("hidden");
        }
    });

    // Switch between Sign In and Sign Up modal states
    const authModalTitle = document.getElementById("auth-modal-title");
    const linkToSignup = document.getElementById("link-to-signup");
    const linkToLogin = document.getElementById("link-to-login");

    linkToSignup.addEventListener("click", () => {
        switchAuthModalTab("signup-pane");
    });

    linkToLogin.addEventListener("click", () => {
        switchAuthModalTab("login-pane");
    });

    function switchAuthModalTab(paneId) {
        const loginPane = document.getElementById("login-pane");
        const signupPane = document.getElementById("signup-pane");
        const track = document.getElementById("auth-modal-track");

        if (paneId === "login-pane") {
            authModalTitle.textContent = "Sign In";
            loginPane.classList.add("active");
            signupPane.classList.remove("active");
            if (track) track.style.transform = "translateX(0)";
        } else {
            authModalTitle.textContent = "Sign Up";
            signupPane.classList.add("active");
            loginPane.classList.remove("active");
            if (track) track.style.transform = "translateX(-50%)";
        }
    }

    // Handle login form submission
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;
        
        const accounts = JSON.parse(localStorage.getItem("mock_accounts") || "[]");
        const found = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
        
        if (found) {
            if (found.password !== password) {
                alert("Incorrect password!");
                return;
            }
            localStorage.setItem("currentUser", JSON.stringify(found));
            updateAuthUI();
            authModal.classList.add("hidden");
            alert(`Welcome back, ${found.name}!`);
            loginForm.reset();
        } else {
            alert("Account not found! Please click 'Sign Up' below to register first.");
        }
    });

    // Handle signup form submission
    signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("signup-name").value.trim();
        const email = document.getElementById("signup-email").value.trim();
        const password = document.getElementById("signup-password").value;
        
        const accounts = JSON.parse(localStorage.getItem("mock_accounts") || "[]");
        if (accounts.some(a => a.email.toLowerCase() === email.toLowerCase())) {
            alert("An account with this email address already exists.");
            return;
        }
        
        const userObj = { email, name, password };
        accounts.push(userObj);
        localStorage.setItem("mock_accounts", JSON.stringify(accounts));
        localStorage.setItem("currentUser", JSON.stringify(userObj));
        
        updateAuthUI();
        authModal.classList.add("hidden");
        alert(`Account created! Welcome, ${name}!`);
        signupForm.reset();
    });

    // Handle signout click
    btnLogout.addEventListener("click", () => {
        localStorage.removeItem("currentUser");
        updateAuthUI();
        alert("Signed out successfully.");
    });

    // History Modal Triggering
    navBtnHistory.addEventListener("click", () => {
        historyModal.classList.remove("hidden");
        renderHistory();
    });

    historyCloseBtn.addEventListener("click", () => {
        historyModal.classList.add("hidden");
    });

    // Tabs logic
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-tab");
            
            tabBtns.forEach(b => b.classList.remove("active"));
            tabPanes.forEach(p => p.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(targetId).classList.add("active");
        });
    });
});

// Helper: Word/Character Counter
function updateWordCharCount() {
    const text = textarea.value.trim();
    const chars = text.length;
    const words = text === "" ? 0 : text.split(/\s+/).length;
    wordCharCountLabel.textContent = `${words} word${words !== 1 ? 's' : ''} | ${chars} char${chars !== 1 ? 's' : ''}`;
}

// Reset Results panel back to waiting state
// Reset Results panel back to waiting state
function resetResultsUI() {
    resultsPlaceholder.classList.remove("hidden");
    resultsContent.classList.add("hidden");
    const loader = document.getElementById("results-loader");
    if (loader) loader.classList.add("hidden");
    
    verdictBanner.className = "verdict-banner";
    confidenceCircle.style.strokeDashoffset = CIRCUMFERENCE;
    confidencePercentage.textContent = "0%";

    const bodyEl = document.getElementById("xai-container-body");
    const placeholderEl = document.getElementById("xai-placeholder");
    if (bodyEl && placeholderEl) {
        bodyEl.classList.add("hidden");
        placeholderEl.classList.remove("hidden");
    }
}



// POST API call: Analyze Review
async function performAnalysis() {
    const text = textarea.value.trim();
    if (text === "") {
        alert("Please enter a review to analyze.");
        return;
    }
    
    const wordsCount = text.split(/\s+/).length;
    if (wordsCount < 5) {
        alert("Review text is too short. Please enter at least 5 words.");
        return;
    }
    
    // Toggle Loading states
    setLoadingState(btnAnalyze, true);
    resultsPlaceholder.classList.add("hidden");
    resultsContent.classList.add("hidden");
    
    const loader = document.getElementById("results-loader");
    const progressFill = document.getElementById("loader-progress-fill");
    const progressPct = document.getElementById("loader-progress-pct");
    const statusText = document.getElementById("loader-status");
    const topBar = document.getElementById("top-loading-bar");
    
    if (loader) {
        loader.classList.remove("hidden");
        progressFill.style.width = "0%";
        progressPct.textContent = "0%";
    }
    if (topBar) topBar.style.width = "0%";
    
    let progress = 0;
    let apiResult = null;
    let apiError = null;
    
    // Trigger API call concurrently
    const apiPromise = fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    }).then(async res => {
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Server error occurred");
        }
        return await res.json();
    }).catch(err => {
        apiError = err;
    });

    // Step-by-step descriptive milestones
    const statusSteps = [
        { limit: 30, text: "🧹 Tokenizing and cleaning text..." },
        { limit: 60, text: "🔍 Running ML classification model..." },
        { limit: 85, text: "🧠 Calculating word feature weights..." },
        { limit: 95, text: "✨ Generating explainable AI insights..." }
    ];
    
    return new Promise((resolve) => {
        const interval = setInterval(async () => {
            if (apiError) {
                clearInterval(interval);
                alert(`Analysis failed: ${apiError.message}`);
                resetResultsUI();
                setLoadingState(btnAnalyze, false);
                if (topBar) topBar.style.width = "0%";
                resolve();
                return;
            }
            
            // Advance progress simulation up to 95%
            if (progress < 95) {
                progress += Math.floor(Math.random() * 5) + 4; // increment 4-8%
                if (progress > 95) progress = 95;
            }
            
            // Update UI elements
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressPct) progressPct.textContent = `${progress}%`;
            if (topBar) topBar.style.width = `${progress}%`;
            
            // Render text feedback
            const activeStep = statusSteps.find(step => progress <= step.limit) || statusSteps[statusSteps.length - 1];
            if (statusText) statusText.textContent = activeStep.text;
            
            // Complete when API finishes
            if (progress >= 95) {
                const result = await Promise.race([apiPromise, Promise.resolve(null)]);
                if (result) {
                    apiResult = result;
                    clearInterval(interval);
                    
                    if (progressFill) progressFill.style.width = "100%";
                    if (progressPct) progressPct.textContent = "100%";
                    if (statusText) statusText.textContent = "✨ Analysis complete!";
                    if (topBar) topBar.style.width = "100%";
                    
                    setTimeout(() => {
                        if (loader) loader.classList.add("hidden");
                        resultsContent.classList.remove("hidden");
                        
                        updateVerdictUI(apiResult);
                        updateMetricsUI(apiResult);
                        updateHighlightsUI(text, apiResult.evidence);
                        updateTokensUI(apiResult);
                        updateExplainableAI(apiResult);
                        
                        // Reset tab view to Highlights tab by default
                        const tabButtonsList = document.querySelectorAll(".tab-btn");
                        const tabPanesList = document.querySelectorAll(".tab-pane");
                        tabButtonsList.forEach(btn => btn.classList.remove("active"));
                        tabPanesList.forEach(pane => pane.classList.remove("active"));
                        if (tabButtonsList[0]) tabButtonsList[0].classList.add("active");
                        if (tabPanesList[0]) tabPanesList[0].classList.add("active");

                        addToHistory(text, apiResult.label, apiResult.confidence);
                        setLoadingState(btnAnalyze, false);
                        
                        setTimeout(() => {
                            if (topBar) topBar.style.width = "0%";
                        }, 400);
                        
                        resolve();
                    }, 300);
                }
            }
        }, 80);
    });
}

function setLoadingState(button, isLoading) {
    const textEl = button.querySelector(".btn-text");
    if (isLoading) {
        button.disabled = true;
        textEl.textContent = "Analyzing...";
        textEl.style.opacity = "0.6";
    } else {
        button.disabled = false;
        textEl.textContent = "Analyze Review";
        textEl.style.opacity = "1";
    }
}

// Update Verdict indicators based on classification results
function updateVerdictUI(result) {
    const isFake = result.label === 1;
    const confidencePct = Math.round(result.confidence * 100);
    
    // Clean classes
    verdictBanner.className = "verdict-banner";
    
    if (isFake) {
        verdictBanner.classList.add("fake");
        verdictIcon.textContent = "⚠️";
        verdictTitle.textContent = "Suspicious Review Flagged";
        verdictSubtitle.textContent = `High probability of fake, inflated, or copy-pasted behavior.`;
    } else {
        verdictBanner.classList.add("genuine");
        verdictIcon.textContent = "🛡️";
        verdictTitle.textContent = "Verified Genuine Review";
        verdictSubtitle.textContent = `Syntactic structure maps to organic customer feedback.`;
    }
    
    // Smooth progress offset
    const offset = CIRCUMFERENCE - (result.confidence * CIRCUMFERENCE);
    confidenceCircle.style.strokeDashoffset = offset;
    confidencePercentage.textContent = `${confidencePct}%`;
}

// Update the metrics meters
function updateMetricsUI(result) {
    const feats = result.custom_features;
    
    // 1. Repetitiveness (0.0 to 1.0)
    const repPct = Math.round(feats.repetitiveness * 100);
    barRepetitiveness.style.width = `${repPct}%`;
    valRepetitiveness.textContent = `${repPct}%`;
    
    // 2. Shouting (0.0 to 1.0)
    const shoutPct = Math.round(feats.shouting * 100);
    barShouting.style.width = `${shoutPct}%`;
    valShouting.textContent = `${shoutPct}%`;
    
    // 3. Exclamations
    // Normalize ratio: 0.1 ratio means 10% words are exclamations, which is very high. Let's multiply by 500 for display
    const exclPct = Math.min(100, Math.round(feats.exclamation_ratio * 500));
    barExclamation.style.width = `${exclPct}%`;
    valExclamation.textContent = `${(feats.exclamation_ratio * 100).toFixed(1)}%`;
    
    // 4. Sentiment Extremity
    const sentVal = feats.sentiment_polarity;
    const extPct = Math.round(feats.sentiment_extremity * 100);
    barSentiment.style.width = `${extPct}%`;
    valSentiment.textContent = `${sentVal > 0 ? '+' : ''}${sentVal.toFixed(2)}`;
}

// Generate the colored span overlays to highlight word contributions
function updateHighlightsUI(rawText, evidence) {
    highlightedTextBox.innerHTML = "";
    
    // Create weights lookup from evidence top words
    const weightsLookup = {};
    if (evidence && evidence.top_words) {
        evidence.top_words.forEach(item => {
            weightsLookup[item.word.toLowerCase()] = {
                weight: item.weight,
                influence: item.influence
            };
        });
    }
    
    // Split text by space/words to preserve spacing but extract word sequences
    const tokens = rawText.split(/(\s+)/);
    
    tokens.forEach(tok => {
        if (tok.trim() === "") {
            // Space token, append directly as text node
            highlightedTextBox.appendChild(document.createTextNode(tok));
            return;
        }
        
        // Clean word to match vocabulary
        const wordClean = tok.replace(/[^a-zA-Z]/g, "").toLowerCase();
        
        if (wordClean && weightsLookup[wordClean]) {
            const data = weightsLookup[wordClean];
            const span = document.createElement("span");
            span.textContent = tok;
            span.className = "highlight-span";
            
            const w = data.weight;
            const sign = w > 0 ? "+" : "";
            
            if (data.influence === "fake") {
                span.classList.add(Math.abs(w) > 0.5 ? "fake-strong" : "fake-weak");
                span.setAttribute("data-coef", `${sign}${w.toFixed(2)} (Suspicious indicator)`);
            } else {
                span.classList.add(Math.abs(w) > 0.5 ? "genuine-strong" : "genuine-weak");
                span.setAttribute("data-coef", `${w.toFixed(2)} (Genuine indicator)`);
            }
            
            highlightedTextBox.appendChild(span);
        } else {
            // Neutral word, append as text node
            highlightedTextBox.appendChild(document.createTextNode(tok));
        }
    });
}

// Populate preprocessed token lists
function updateTokensUI(result) {
    tokensContainer.innerHTML = "";
    cleanTokensContainer.innerHTML = "";
    
    // We fetch tokens from API results if possible.
    // Since we don't return raw preprocessing tokens directly in predict details,
    // let's parse them using frontend local splits or fallback to showing badge lists
    // Wait, the API predict() returns clean_word_count and stopwords_count,
    // but does it return token lists? Let's check backend/detector.py:
    // "tokens, clean_tokens, stopword_count = self.preprocess(text)"
    // Ah, wait! The predict endpoint only returned:
    // { "label", "confidence", "text_length", "word_count", "clean_word_count", "stopwords_count", "custom_features", "evidence" }
    // Let's modify the backend API return in main.py to return "tokens" and "clean_tokens" list as well so the frontend receives them!
    // Yes! That is an excellent catch during execution that guarantees the tabs display the actual tokens from the Python NLP processor.
    // Let's add them to the API return. Since we have not yet run or finalized main.py edits, let's keep this frontend code as-is
    // and we will update main.py/detector.py return format to provide `tokens` and `clean_tokens` array.
    
    if (result.tokens) {
        result.tokens.forEach(tok => {
            const badge = document.createElement("span");
            badge.className = "token-badge";
            badge.textContent = tok;
            // Mark as stopword if matches result stopwords
            if (result.stopwords_list && result.stopwords_list.includes(tok.toLowerCase())) {
                badge.classList.add("stopword");
            }
            tokensContainer.appendChild(badge);
        });
    } else {
        tokensContainer.innerHTML = `<span class="explanation">Tokens not returned by API</span>`;
    }
    
    if (result.clean_tokens) {
        result.clean_tokens.forEach(tok => {
            const badge = document.createElement("span");
            badge.className = "token-badge";
            badge.textContent = tok;
            cleanTokensContainer.appendChild(badge);
        });
    } else {
        cleanTokensContainer.innerHTML = `<span class="explanation">Clean tokens not returned by API</span>`;
    }
}



// Authentication UI Sync Handler
function updateAuthUI() {
    if (localStorage.getItem("currentUser")) {
        const user = JSON.parse(localStorage.getItem("currentUser"));
        authNavContainer.classList.add("hidden");
        userProfileContainer.classList.remove("hidden");
        userDisplayName.textContent = user.name;
    } else {
        authNavContainer.classList.remove("hidden");
        userProfileContainer.classList.add("hidden");
        userDisplayName.textContent = "Guest";
    }
}

// Add analyzed review to LocalStorage history
function addToHistory(text, label, confidence) {
    const userJSON = localStorage.getItem("currentUser");
    const userKey = userJSON ? JSON.parse(userJSON).email : "anonymous";
    const historyKey = `review_history_${userKey}`;
    
    const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    const snippet = text.length > 80 ? text.substring(0, 80) + "..." : text;
    
    const newItem = {
        id: Date.now(),
        text: text,
        snippet: snippet,
        label: label,
        confidence: confidence,
        date: new Date().toLocaleString()
    };
    
    // Push and cap at 15 items
    history.unshift(newItem);
    if (history.length > 15) history.pop();
    localStorage.setItem(historyKey, JSON.stringify(history));
}

// Render historical records in the overlay list
function renderHistory() {
    const userJSON = localStorage.getItem("currentUser");
    const userKey = userJSON ? JSON.parse(userJSON).email : "anonymous";
    const historyKey = `review_history_${userKey}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    
    historyItemsContainer.innerHTML = "";
    if (history.length === 0) {
        historyItemsContainer.innerHTML = `
            <div class="placeholder-state" style="padding: 3rem 0; width: 100%;">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.5;">📋</div>
                <p style="color: var(--text-muted); font-size: 0.9rem;">No analysis history found. Try analyzing a review first!</p>
            </div>
        `;
        return;
    }
    
    history.forEach(item => {
        const row = document.createElement("div");
        row.className = "history-item";
        
        const textCol = document.createElement("div");
        textCol.className = "history-text-col";
        
        const snippetSpan = document.createElement("span");
        snippetSpan.className = "history-snippet";
        snippetSpan.textContent = item.snippet;
        
        const dateSpan = document.createElement("span");
        dateSpan.className = "history-date";
        dateSpan.textContent = item.date;
        
        textCol.appendChild(snippetSpan);
        textCol.appendChild(dateSpan);
        
        const metaCol = document.createElement("div");
        metaCol.className = "history-meta-col";
        
        const verdictSpan = document.createElement("span");
        const isFake = item.label === 1;
        verdictSpan.className = `history-verdict ${isFake ? 'fake' : 'genuine'}`;
        verdictSpan.textContent = isFake ? `Fake (${Math.round(item.confidence*100)}%)` : `Genuine (${Math.round(item.confidence*100)}%)`;
        
        const loadBtn = document.createElement("button");
        loadBtn.className = "btn btn-secondary btn-history-load";
        loadBtn.textContent = "Load";
        loadBtn.addEventListener("click", () => {
            textarea.value = item.text;
            updateWordCharCount();
            
            // Toggle preset button active class off since it is manual text loading
            presetButtons.forEach(btn => btn.classList.remove("active"));
            
            // Close modal and focus on analyzer anchor
            historyModal.classList.add("hidden");
            navBtnAnalyzer.classList.add("active");
            document.getElementById("dashboard-anchor").scrollIntoView({ behavior: 'smooth' });

            // Auto-run analysis for convenience
            performAnalysis();
        });
        
        metaCol.appendChild(verdictSpan);
        metaCol.appendChild(loadBtn);
        
        row.appendChild(textCol);
        row.appendChild(metaCol);
        historyItemsContainer.appendChild(row);
    });
}

// Generate human-readable explainable AI explanations based on model weights & features
function updateExplainableAI(result) {
    const bodyEl = document.getElementById("xai-container-body");
    const placeholderEl = document.getElementById("xai-placeholder");
    if (bodyEl && placeholderEl) {
        bodyEl.classList.add("hidden");
        placeholderEl.classList.remove("hidden");
    }

    const summaryEl = document.getElementById("xai-summary");
    const genuineList = document.getElementById("xai-genuine-list");
    const fakeList = document.getElementById("xai-fake-list");
    
    genuineList.innerHTML = "";
    fakeList.innerHTML = "";
    
    const isFake = result.label === 1;
    const confidencePct = Math.round(result.confidence * 100);

    // Hide/show the relevant factor card for clean display
    const genuineCard = document.querySelector(".genuine-factors");
    const fakeCard = document.querySelector(".fake-factors");
    if (genuineCard && fakeCard) {
        if (isFake) {
            genuineCard.classList.add("hidden");
            fakeCard.classList.remove("hidden");
        } else {
            fakeCard.classList.add("hidden");
            genuineCard.classList.remove("hidden");
        }
    }
    
    // Generate explanation bullets from evidence
    const customWeights = {};
    if (result.evidence && result.evidence.custom_features) {
        result.evidence.custom_features.forEach(f => {
            customWeights[f.feature] = {
                val: f.value,
                weight: f.weight,
                contribution: f.weight * f.value
            };
        });
    }
    
    const topWords = result.evidence ? result.evidence.top_words : [];
    const genuineWords = topWords.filter(w => w.influence === "genuine").map(w => `'${w.word}' (${w.weight.toFixed(2)})`);
    const fakeWords = topWords.filter(w => w.influence === "fake").map(w => `'${w.word}' (+${w.weight.toFixed(2)})`);
    
    // 1. Organic Indicators
    let hasGenuineIndicators = false;
    
    if (customWeights.repetitiveness && customWeights.repetitiveness.contribution < -0.05) {
        const li = document.createElement("li");
        li.innerHTML = `<strong>Organic Vocabulary:</strong> Non-repetitive phrasing (repetitiveness is ${Math.round(customWeights.repetitiveness.val*100)}%) which supports organic writing.`;
        genuineList.appendChild(li);
        hasGenuineIndicators = true;
    }
    if (customWeights.shouting && customWeights.shouting.val < 0.15) {
        const li = document.createElement("li");
        li.innerHTML = `<strong>Standard Capitalization:</strong> Capital letter ratio is ${Math.round(customWeights.shouting.val*100)}%, reflecting natural typing.`;
        genuineList.appendChild(li);
        hasGenuineIndicators = true;
    }
    if (customWeights.exclamation_ratio && customWeights.exclamation_ratio.val < 0.03) {
        const li = document.createElement("li");
        li.innerHTML = `<strong>Natural Punctuation:</strong> Standard use of exclamation marks (under 3%), indicating a calm tone.`;
        genuineList.appendChild(li);
        hasGenuineIndicators = true;
    }
    if (customWeights.sentiment_polarity && customWeights.sentiment_polarity.val >= -0.2 && customWeights.sentiment_polarity.val <= 0.4) {
        const li = document.createElement("li");
        li.innerHTML = `<strong>Balanced Sentiment:</strong> Neutral or moderate tone (polarity score of ${customWeights.sentiment_polarity.val.toFixed(2)}), typical of real reviews.`;
        genuineList.appendChild(li);
        hasGenuineIndicators = true;
    }
    if (genuineWords.length > 0) {
        const li = document.createElement("li");
        li.innerHTML = `<strong>Genuine Vocabulary:</strong> Natural syntax markers found: ${genuineWords.join(", ")}.`;
        genuineList.appendChild(li);
        hasGenuineIndicators = true;
    }
    if (!hasGenuineIndicators) {
        const li = document.createElement("li");
        li.textContent = "No significant organic markers detected.";
        genuineList.appendChild(li);
    }
    
    // 2. Suspicious Indicators
    let hasFakeIndicators = false;
    
    if (customWeights.repetitiveness && customWeights.repetitiveness.val > 0.25) {
        const li = document.createElement("li");
        li.innerHTML = `<strong>High Repetition:</strong> ${Math.round(customWeights.repetitiveness.val*100)}% of the words are repeated, suggesting artificial padding.`;
        fakeList.appendChild(li);
        hasFakeIndicators = true;
    }
    if (customWeights.shouting && customWeights.shouting.contribution > 0.1) {
        const li = document.createElement("li");
        li.innerHTML = `<strong>ALL CAPS shouting:</strong> Capitalized letters count for ${Math.round(customWeights.shouting.val*100)}% of characters, typical of reviews trying to force attention.`;
        fakeList.appendChild(li);
        hasFakeIndicators = true;
    }
    if (customWeights.exclamation_ratio && customWeights.exclamation_ratio.val > 0.04) {
        const li = document.createElement("li");
        li.innerHTML = `<strong>Dramatic Punctuation:</strong> ${Math.round(customWeights.exclamation_ratio.val*100)}% of tokens are exclamation marks, reflecting hyper-inflated excitement or smears.`;
        fakeList.appendChild(li);
        hasFakeIndicators = true;
    }
    if (customWeights.sentiment_extremity && customWeights.sentiment_extremity.val > 0.6) {
        const li = document.createElement("li");
        li.innerHTML = `<strong>Extreme Sentiment:</strong> Sentiment is highly polarized (${customWeights.sentiment_polarity.val > 0 ? 'hyper-positive' : 'hyper-negative'} score of ${customWeights.sentiment_polarity.val.toFixed(2)}), indicating non-objective biases.`;
        fakeList.appendChild(li);
        hasFakeIndicators = true;
    }
    if (fakeWords.length > 0) {
        const li = document.createElement("li");
        li.innerHTML = `<strong>Spam Keyphrases:</strong> Detected high-coefficient promotional terms: ${fakeWords.join(", ")}.`;
        fakeList.appendChild(li);
        hasFakeIndicators = true;
    }
    if (!hasFakeIndicators) {
        const li = document.createElement("li");
        li.textContent = "No significant suspicious markers detected.";
        fakeList.appendChild(li);
    }
    
    // 3. Narrative Explanation Summary
    let summaryText = "";
    if (isFake) {
        summaryText = `<strong>AI Decision Summary:</strong> The model flagged this review as <strong>Suspicious</strong> with <strong>${confidencePct}% confidence</strong>. The primary reasons are `;
        const drivers = [];
        if (customWeights.shouting && customWeights.shouting.val > 0.25) drivers.push("excessive uppercase shouting");
        if (customWeights.exclamation_ratio && customWeights.exclamation_ratio.val > 0.04) drivers.push("dramatic punctuation patterns");
        if (customWeights.repetitiveness && customWeights.repetitiveness.val > 0.25) drivers.push("word repetition");
        if (fakeWords.length > 0) drivers.push("high-intensity spam keywords like " + fakeWords.slice(0, 2).join(" and "));
        
        if (drivers.length > 0) {
            summaryText += drivers.join(", ") + ".";
        } else {
            summaryText += "the overall combination of semantic attributes and polarized phrasing.";
        }
    } else {
        summaryText = `<strong>AI Decision Summary:</strong> The model classified this review as <strong>Genuine</strong> with <strong>${confidencePct}% confidence</strong>. The text exhibits `;
        const drivers = [];
        if (customWeights.sentiment_extremity && customWeights.sentiment_extremity.val < 0.4) drivers.push("a balanced, objective sentiment");
        if (customWeights.repetitiveness && customWeights.repetitiveness.val <= 0.25) drivers.push("natural word distribution");
        if (genuineWords.length > 0) drivers.push("standard structural markers like " + genuineWords.slice(0, 2).join(" and "));
        
        if (drivers.length > 0) {
            summaryText += drivers.join(", ") + ".";
        } else {
            summaryText += "an organic syntactic flow with natural punctuation and spacing.";
        }
    }
    
    summaryEl.innerHTML = summaryText;
}
