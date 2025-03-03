const express = require("express");
const axios = require("axios");

const app = express();

app.get("/auth/callback", async (req, res) => {
    const code = req.query.code;  // Get auth code from TikTok

    if (!code) {
        return res.status(400).send("Authorization failed");
    }

    try {
        // Exchange code for an access token
        const response = await axios.post("https://open-api.tiktok.com/oauth/access_token/", {
            client_key: "YOUR_CLIENT_KEY",
            client_secret: "YOUR_CLIENT_SECRET",
            code: code,
            grant_type: "authorization_code",
            redirect_uri: "https://your-backend-url.onrender.com/auth/callback"
        });

        const accessToken = response.data.access_token;
        res.send(`Access Token: ${accessToken}`);
    } catch (error) {
        res.status(500).send("Failed to get access token");
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));
