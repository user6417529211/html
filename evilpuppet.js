(function () {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    const deferredRequests = [];

    // Intercept open to store method and URL
    XMLHttpRequest.prototype.open = function (method, url, async = true) {
        this._method = method;
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    // Intercept send to defer and modify requests
    XMLHttpRequest.prototype.send = function (body) {
        if (
            body &&
            typeof body === "string" &&
            /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.test(body)
        ) {
            if (body.includes("replaced")) {
                console.log("[Bypass] Already modified, sending normally.");
                return originalSend.call(this, body);
            }

            console.log("[Intercept] Deferring request...");

            // Store request details
            deferredRequests.push({
                method: this._method,
                url: this._url,
                body: body
            });

            return; // Prevent the request from being sent immediately
        }

        // Send unmodified requests normally
        return originalSend.call(this, body);
    };

    function processDeferredRequests() {
        while (deferredRequests.length > 0) {
            let { method, url, body } = deferredRequests.shift();

            console.log("[Processing] Modifying deferred request...");

            // Modify the request body by replacing the captured group
            let modifiedBody = body.replace(
                /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/,
                (match, capturedGroup) => match.replace(capturedGroup, "replaced")
            );

            console.log("[Modified Body]:", modifiedBody);

            // Create and send a new request with modified data
            let newXhr = new XMLHttpRequest();
            newXhr.open(method, url, true);
            newXhr.send(modifiedBody);

            console.log("[Success] Modified request sent.");
        }
    }

    // Process deferred requests once the page is ready
    document.addEventListener("readystatechange", () => {
        if (document.readyState === "interactive" || document.readyState === "complete") {
            processDeferredRequests();
        }
    });
})();
