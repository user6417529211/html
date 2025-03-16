(function () {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    let deferredRequest = null;

    XMLHttpRequest.prototype.open = function (method, url, async = true) {
        this._method = method;
        this._url = url;
        this._headers = {};
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
        this._headers[header] = value;
    };

    XMLHttpRequest.prototype.send = function (body) {
        if (body && typeof body === "string" && /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.test(body)) {
            if (body.includes("replaced")) {
                console.log("[Bypass] Already modified, sending normally.");
                return originalSend.call(this, body);
            }

            console.log("[Intercept] Capturing request...");
            deferredRequest = { method: this._method, url: this._url, body, headers: this._headers };

            // Call processDeferredRequest *only after capturing*
            setTimeout(processDeferredRequest, 0);

            return; // Prevent the request from being sent immediately
        }

        return originalSend.call(this, body);
    };

    function processDeferredRequest() {
        if (!deferredRequest) return; // Only proceed if a request was captured

        console.log("[Processing] Modifying deferred request...");

        let modifiedBody = deferredRequest.body.replace(
            /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/,
            (match, capturedGroup) => match.replace(capturedGroup, "replaced")
        );

        console.log("[Modified Body]:", modifiedBody);

        let newXhr = new XMLHttpRequest();
        newXhr.open(deferredRequest.method, deferredRequest.url, true);

        // Set the headers properly
        for (let header in deferredRequest.headers) {
            newXhr.setRequestHeader(header, deferredRequest.headers[header]);
        }

        newXhr.send(modifiedBody);

        console.log("[Success] Modified request sent.");
        deferredRequest = null; // Clear after sending
    }
})();
