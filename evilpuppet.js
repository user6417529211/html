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
            
            // Modify request immediately and send it
            let modifiedBody = body.replace(
                /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/,
                (match, capturedGroup) => match.replace(capturedGroup, "replaced")
            );

            console.log("[Modified Body]:", modifiedBody);

            // Send modified request
            let newXhr = new XMLHttpRequest();
            newXhr.open(this._method, this._url, true);
            newXhr.send(modifiedBody);

            console.log("[Success] Modified request sent.");
            return; // Prevent the original request from sending
        }

        return originalSend.call(this, body);
    };
})();
