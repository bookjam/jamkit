const axios = require("axios");

module.exports = {
    create_short_url: function(original_url, expiry_date) {
        const url = "https://us-central1-leafly-service.cloudfunctions.net/createShortUrl";
        const params = {
            "url": original_url,
            "expiry-date": expiry_date || 0
        };

        return axios.post(url, params, {
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                if (error.response) {
                    return Promise.reject({ status: error.response.status });
                } else {
                    return Promise.reject({ status: 500, error: error.message });
                }
        });
    }
}
