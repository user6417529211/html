(function () {
    // Save original methods
    const originalSend = XMLHttpRequest.prototype.send;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    // Storage for deferred requests
    const deferredRequests = new Map(); // Use a Map to track original XHRs

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

    // Intercept send() to defer and modify the request
    XMLHttpRequest.prototype.send = function (body) {
        if (body && typeof body === "string" && /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.test(body)) {
            console.log("Deferring request...");

            // Store the request to modify later
            deferredRequests.set(this, {
                method: this._method,
                url: this._url,
                headers: this._headers,
                body: body
            });

            return; // Prevent it from being sent immediately
        }

        return originalSend.call(this, body);
    };

    // Use MutationObserver to detect when page is idle
    const observer = new MutationObserver(() => {
        if (deferredRequests.size > 0) {
            processDeferredRequests();
        }
    });

    observer.observe(document, { childList: true, subtree: true });

    function processDeferredRequests() {
        deferredRequests.forEach(({ method, url, headers, body }, xhr) => {
            console.log("Processing deferred request...");

            // Replace only the captured group with "replaced???"
            const regex = /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/;
            let modifiedBody = body.replace(regex, (match, capturedGroup) => {
                console.log("Original:", capturedGroup);
                return match.replace(capturedGroup, "replaced???");
            });

            console.log("Modified Body:", modifiedBody);

            // Create a new XHR request
            let newXhr = new XMLHttpRequest();
            newXhr.open(method, url, true);

            // Set stored headers
            for (let header in headers) {
                newXhr.setRequestHeader(header, headers[header]);
            }

            // Send the modified request
            newXhr.send(modifiedBody);
            console.log("Modified request sent.");

            // Remove processed request
            deferredRequests.delete(xhr);
        });
    }
})();
