(function() {
    // Save the original send method
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.send = function(body) {
        if (body && typeof body === "string" && body.includes("identity-signin-identifier")) {
            console.log("Intercepted XHR request with identity-signin-identifier.");

            // Regex to capture the value inside identity-signin-identifier
            const regex = /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/;

            // Replace only the captured group with "replaced???"
            let modifiedBody = body.replace(regex, (match, capturedGroup) => {
                console.log("Original Value:", capturedGroup);
                return match.replace(capturedGroup, "replaced???");
            });

            console.log("Modified Request Body:", modifiedBody);

            // Send the modified request
            return originalSend.call(this, modifiedBody);
        }

        // Send the request normally if no match
        return originalSend.call(this, body);
    };
})();
