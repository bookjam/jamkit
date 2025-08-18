import axios from "axios";

export default {
    createShortUrl(originalUrl, expiryDate) {
        const url = "https://us-central1-leafly-service.cloudfunctions.net/createShortUrl";
        const params = {
            "url": originalUrl,
            "expiry-date": expiryDate || 0
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
