(function () {
    // Save the original send method
    const originalSend = XMLHttpRequest.prototype.send;

    // Deferred requests storage
    const deferredRequests = [];

    XMLHttpRequest.prototype.send = function (body) {
        // Check if request has been modified already (to prevent looping)
        if (this._isModified) {
            console.log("Sending modified request...");
            return originalSend.call(this, body);
        }

        if (body && typeof body === "string" && body.includes("identity-signin-identifier")) {
            console.log("Deferring XHR request...");

            // Store the request details for later processing
            deferredRequests.push({
                method: this._method, // Store method (GET/POST)
                url: this._url, // Store request URL
                headers: this._headers, // Store headers
                body: body // Store request body
            });

            return; // Prevent sending immediately
        }

        // Send normal requests immediately
        return originalSend.call(this, body);
    };

    // Intercept open() to store method & URL
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        this._method = method;
        this._url = url;
        this._headers = {}; // Store headers
        return originalOpen.apply(this, arguments);
    };

    // Intercept setRequestHeader() to store headers
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
        this._headers[header] = value; // Store header
        return originalSetRequestHeader.apply(this, arguments);
    };

    // Function to process deferred requests
    function processDeferredRequests() {
        while (deferredRequests.length > 0) {
            let { method, url, headers, body } = deferredRequests.shift(); // Get the first deferred request

            // Regex to capture the identity-signin-identifier value
            const regex = /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/;

            // Replace only the captured group with "replaced???"
            let modifiedBody = body.replace(regex, (match, capturedGroup) => {
                console.log("Original Value:", capturedGroup);
                return match.replace(capturedGroup, "replaced???");
            });

            console.log("Modified Request Body:", modifiedBody);

            // Create a new XMLHttpRequest instance to send the modified request
            let newXhr = new XMLHttpRequest();
            newXhr.open(method, url, true);

            // Set stored headers
            for (let header in headers) {
                newXhr.setRequestHeader(header, headers[header]);
            }

            // Send the modified request
            newXhr.send(modifiedBody);
        }
    }

    // Example: Resume deferred requests after 10 seconds
    setInterval(processDeferredRequests, 10000); // Check and process every 10 seconds
})();
