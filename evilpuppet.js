(function() {
    const originalSend = XMLHttpRequest.prototype.send;
    const modifiedRequests = new Set();
    const regex = /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/g;

    XMLHttpRequest.prototype.send = function(body) {
        if (typeof body === "string") {
            // If request was already modified, let it proceed
            if (modifiedRequests.has(body)) {
                return originalSend.call(this, body);
            }

            // If regex matches, modify the captured group
            if (regex.test(body)) {
                console.log("Modifying request payload...");
                body = body.replace(regex, (_, captured) => 
                    body.replace(captured, "replaced")
                );
                modifiedRequests.add(body); // Track modified request
            }
        }
        
        return originalSend.call(this, body);
    };

    console.log("XHR interceptor active!");
})();
