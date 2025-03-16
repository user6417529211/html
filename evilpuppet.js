(function() {
    // Save the original send method
    const originalSend = XMLHttpRequest.prototype.send;
    
    // Deferred requests storage
    const deferredRequests = [];

    XMLHttpRequest.prototype.send = function(body) {
        // Check if request has been modified already (to prevent looping)
        if (this._isModified) {
            console.log("Sending modified request...");
            return originalSend.call(this, body);
        }

        if (body && typeof body === "string" && body.includes("identity-signin-identifier")) {
            console.log("Deferring XHR request...");

            // Store the request for later processing
            deferredRequests.push({ xhr: this, body });

            return; // Prevent it from being sent immediately
        }

        // Send normal requests immediately
        return originalSend.call(this, body);
    };

    // Function to process deferred requests
    function processDeferredRequests() {
        while (deferredRequests.length > 0) {
            let { xhr, body } = deferredRequests.shift(); // Get the first deferred request

            // Regex to capture the identity-signin-identifier value
            const regex = /identity-signin-identifier%5C%22%2C%5C%22([^&]*)%5C/;

            // Replace only the captured group with "replaced???"
            let modifiedBody = body.replace(regex, (match, capturedGroup) => {
                console.log("Original Value:", capturedGroup);
                return match.replace(capturedGroup, "replaced???");
            });

            console.log("Modified Request Body:", modifiedBody);

            // Mark request as modified to prevent infinite deferring
            xhr._isModified = true;

            // Send the modified request
            originalSend.call(xhr, modifiedBody);
        }
    }

    // Example: Resume deferred requests after 10 seconds
    setInterval(processDeferredRequests, 10000); // Check and process every 10 seconds

})();
