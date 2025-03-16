(function () {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    let deferredRequest = null;

    XMLHttpRequest.prototype.open = function (method, url, async = true) {
        this._method = method;
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        if (body && typeof body === "string" && /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/.test(body)) {
            if (body.includes("replaced")) {
                console.log("[Bypass] Already modified, sending normally.");
                return originalSend.call(this, body);
            }

            console.log("[Intercept] Deferring request...");

            // Store request for modification
            deferredRequest = { method: this._method, url: this._url, body };
            return; // Prevent the request from being sent immediately
        }

        return originalSend.call(this, body);
    };

    function sendModifiedRequest() {
        if (deferredRequest) {
            console.log("[Processing] Modifying deferred request...");

            let modifiedBody = deferredRequest.body.replace(
                /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/,
                (match, capturedGroup) => match.replace(capturedGroup, "replaced")
            );

            console.log("[Modified Body]:", modifiedBody);

            let newXhr = new XMLHttpRequest();
            newXhr.open(deferredRequest.method, deferredRequest.url, true);
            newXhr.send(modifiedBody);

            console.log("[Success] Modified request sent.");
            deferredRequest = null; // Clear stored request after sending
        }
    }

    document.addEventListener("readystatechange", () => {
        if (document.readyState === "interactive" || document.readyState === "complete") {
            sendModifiedRequest();
        }
    });
})();
