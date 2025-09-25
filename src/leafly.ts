import axios from "axios";

interface CreateShortUrlParams {
    url: string;
    "expiry-date": number;
}

interface LeaflyError {
    status: number;
    error?: string;
}

interface LeaflyModule {
    createShortUrl(originalUrl: string, expiryDate?: number): Promise<any>;
}

const leafly: LeaflyModule = {
    createShortUrl(originalUrl: string, expiryDate?: number): Promise<any> {
        const url = "https://us-central1-leafly-service.cloudfunctions.net/createShortUrl";
        const params: CreateShortUrlParams = {
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
                    return Promise.reject({ status: error.response.status } as LeaflyError);
                } else {
                    return Promise.reject({ status: 500, error: error.message } as LeaflyError);
                }
            });
    }
};

export default leafly;