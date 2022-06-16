const fetch = require('node-fetch');

module.exports = {
    create_short_url: function(original_url, expiry_date) {
        return new Promise(function(resolve, reject) {
            var url = "https://us-central1-leafly-service.cloudfunctions.net/createShortUrl";
            var params = {
                "url":  original_url,
                "expiry-date": expiry_date || 0
            }
            
            fetch(url, {
                "method": "POST",
                "headers":  {
                    "Content-Type": "application/json"
                },
                "body":  JSON.stringify(params)
            })
                .then(function(response) {
                    if (response.ok) {
                        return response.json();
                    } else {
                        return Promise.reject({ "status": response.status });
                    }
                })
                .then(function(result) {
                    resolve(result);
                })
                .catch(function(error) {
                    reject(error);
                });
        });
    } 
}
