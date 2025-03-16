(function() {
    // Save the original send method
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.send = function(body) {
        if (body && typeof body === "string" && body.includes("identity-signin-identifier")) {
            console.log("Request deferred (not sent) due to identity-signin-identifier.");
            return; // Prevent the request from being sent
        }

        // Otherwise, send the request as usual
        originalSend.call(this, body);
    };
})();
