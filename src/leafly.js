const fetch = require("node-fetch");

module.exports = {
    create_short_url: function(original_url, expiry_date) {
        const url = "https://us-central1-leafly-service.cloudfunctions.net/createShortUrl";
        const params = {
            "url":  original_url,
            "expiry-date": expiry_date || 0
        }
            
        return fetch(url, {
            "method": "POST",
            "headers":  {
                "Content-Type": "application/json"
            },
            "body":  JSON.stringify(params)
        })
            .then((response) => {
                if (response.ok) {
                    return response.json();
                } else {
                    return Promise.reject({ "status": response.status });
                }
            });
    } 
}
