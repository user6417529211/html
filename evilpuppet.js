(function() {
    const originalSend = XMLHttpRequest.prototype.send;
    const regex = /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/g;

    XMLHttpRequest.prototype.send = function(body) {
        if (typeof body === "string" && regex.test(body)) {
            console.log("Intercepting and modifying request...");

            // Modify only the captured group
            let modifiedBody = body.replace(regex, 'identity-signin-identifier%5C%22%2C%5C%22replaced%5C');

            // Manually send the modified request
            return originalSend.call(this, modifiedBody);
        }

        // Send unmodified requests as usual
        return originalSend.call(this, body);
    };

    console.log("XHR interceptor active!");
})();
