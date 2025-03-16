(function () {
    // Save original methods
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    // Store deferred requests
    const deferredRequests = [];

    // Intercept open() to store method and URL
    XMLHttpRequest.prototype.open = function (method, url, async = true) {
        this._method = method;
        this._url = url;
        this._headers = {};
        return originalOpen.apply(this, arguments);
    };

    // Intercept setRequestHeader() to store headers
    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
        this._headers[header] = value;
        return originalSetRequestHeader.apply(this, arguments);
    };

    // Intercept send() to defer the request if necessary
    XMLHttpRequest.prototype.send = function (body) {
        if (
            body &&
            typeof body === "string" &&
            /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.test(body)
        ) {
            console.log("Deferring request...");

            // Store request details for modification and later sending
            deferredRequests.push({
                method: this._method,
                url: this._url,
                headers: this._headers,
                body: body,
            });

            return; // Prevent original request from being sent
        }

        return originalSend.call(this, body);
    };

    // Function to process deferred requests
    function processDeferredRequests() {
        while (deferredRequests.length > 0) {
            let { method, url, headers, body } = deferredRequests.shift();

            console.log("Processing deferred request...");

            // Regex to replace the captured group
            const regex = /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/;
            let modifiedBody = body.replace(regex, (match, capturedGroup) => {
                console.log("Captured Group:", capturedGroup);
                return match.replace(capturedGroup, "replaced");
            });

            console.log("Modified Body:", modifiedBody);

            // Create and send a new modified XMLHttpRequest
            let newXhr = new XMLHttpRequest();
            newXhr.open(method, url, true);

            // Set stored headers
            for (let header in headers) {
                newXhr.setRequestHeader(header, headers[header]);
            }

            // Send the modified request
            newXhr.send(modifiedBody);
            console.log("Modified request sent.");
        }
    }

    // Process deferred requests after the page loads
    window.addEventListener("load
