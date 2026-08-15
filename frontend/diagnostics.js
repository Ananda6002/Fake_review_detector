// DOM Elements
const btnRetrain = document.getElementById("btn-retrain");
const statTotalRecords = document.getElementById("stat-total-records");
const statGenuineRecords = document.getElementById("stat-genuine-records");
const statFakeRecords = document.getElementById("stat-fake-records");
const fakeIndicatorsList = document.getElementById("fake-indicators-list");
const genuineIndicatorsList = document.getElementById("genuine-indicators-list");

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
    loadModelStats();
    updateAuthUI();

    // Retrain Action
    btnRetrain.addEventListener("click", retrainModel);

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
            
            // Reload history of the newly logged-in user if history modal is active
            if (!historyModal.classList.contains("hidden")) {
                renderHistory();
            }
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
        
        // Reload history of the new user if history modal is active
        if (!historyModal.classList.contains("hidden")) {
            renderHistory();
        }
    });

    // Handle signout click
    btnLogout.addEventListener("click", () => {
        localStorage.removeItem("currentUser");
        updateAuthUI();
        alert("Signed out successfully.");
        
        // Reload history of the guest user if history modal is active
        if (!historyModal.classList.contains("hidden")) {
            renderHistory();
        }
    });

    // History Modal Triggering
    navBtnHistory.addEventListener("click", () => {
        historyModal.classList.remove("hidden");
        renderHistory();
    });

    historyCloseBtn.addEventListener("click", () => {
        historyModal.classList.add("hidden");
    });
});

// Load stats from API
async function loadModelStats() {
    try {
        const response = await fetch("/api/stats");
        if (!response.ok) throw new Error("Failed to fetch model statistics");
        const data = await response.json();
        
        // Populate dataset counts
        statTotalRecords.textContent = data.dataset_stats.total_records || "--";
        statGenuineRecords.textContent = data.dataset_stats.genuine_records || "--";
        statFakeRecords.textContent = data.dataset_stats.fake_records || "--";
        
        // Populate lists
        populateWeightsList(fakeIndicatorsList, data.model_stats.top_fake_words, "fake-weight");
        populateWeightsList(genuineIndicatorsList, data.model_stats.top_genuine_words, "genuine-weight");
    } catch (err) {
        console.error("Error loading model stats:", err);
    }
}

function populateWeightsList(container, list, cssClass) {
    container.innerHTML = "";
    if (!list || list.length === 0) {
        container.innerHTML = `<div class="weight-row">No weights available</div>`;
        return;
    }
    
    list.forEach(item => {
        const row = document.createElement("div");
        row.className = `weight-row ${cssClass}`;
        
        const wordSpan = document.createElement("span");
        wordSpan.className = "weight-word";
        wordSpan.textContent = item.word;
        
        const valSpan = document.createElement("span");
        valSpan.className = "weight-val";
        const prefix = cssClass === "fake-weight" ? "+" : "";
        valSpan.textContent = `${prefix}${item.weight.toFixed(3)}`;
        
        row.appendChild(wordSpan);
        row.appendChild(valSpan);
        container.appendChild(row);
    });
}

// POST API call: Retrain Model
async function retrainModel() {
    if (!confirm("Are you sure you want to regenerate the review templates and rebuild the Scikit-learn classifier model? This takes a few seconds.")) {
        return;
    }
    
    setLoadingState(btnRetrain, true);
    const topBar = document.getElementById("top-loading-bar");
    if (topBar) topBar.style.width = "0%";
    
    let progress = 0;
    
    // Simulate top bar progress
    const interval = setInterval(() => {
        if (progress < 90) {
            progress += Math.floor(Math.random() * 8) + 3;
            if (progress > 90) progress = 90;
        }
        if (topBar) topBar.style.width = `${progress}%`;
    }, 100);
    
    try {
        const response = await fetch("/api/train", { method: "POST" });
        if (!response.ok) throw new Error("Failed to retrain the model");
        
        const data = await response.json();
        clearInterval(interval);
        
        // Complete progress animation
        if (topBar) topBar.style.width = "100%";
        
        setTimeout(() => {
            alert("Model retraining complete!");
            // Reload dashboard stats
            loadModelStats();
            setLoadingState(btnRetrain, false);
            setTimeout(() => {
                if (topBar) topBar.style.width = "0%";
            }, 400);
        }, 300);
        
    } catch (err) {
        clearInterval(interval);
        if (topBar) topBar.style.width = "0%";
        console.error("Retraining error:", err);
        alert(`Retraining failed: ${err.message}`);
        setLoadingState(btnRetrain, false);
    }
}

function setLoadingState(button, isLoading) {
    const textEl = button.querySelector(".btn-text");
    if (isLoading) {
        button.disabled = true;
        textEl.textContent = "Rebuilding Model...";
        textEl.style.opacity = "0.6";
    } else {
        button.disabled = false;
        textEl.textContent = "Re-Train Classifier";
        textEl.style.opacity = "1";
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
            // Store text pending to load on index.html
            localStorage.setItem("pending_review_text", item.text);
            
            // Close modal and redirect to main page
            historyModal.classList.add("hidden");
            window.location.href = "index.html";
        });
        
        metaCol.appendChild(verdictSpan);
        metaCol.appendChild(loadBtn);
        
        row.appendChild(textCol);
        row.appendChild(metaCol);
        historyItemsContainer.appendChild(row);
    });
}
