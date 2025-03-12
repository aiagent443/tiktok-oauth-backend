require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// TikTok OAuth Configuration
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.FRONTEND_URL ? process.env.FRONTEND_URL : 'https://agentcontent.info'}`;

// Root endpoint
app.get('/', (req, res) => {
  res.send('TikTok OAuth Backend Server is running!');
});

// OAuth callback endpoint
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    console.error('No authorization code received');
    return res.status(400).send('No authorization code received');
  }
  
  console.log('Received authorization code:', code);
  
  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://open.tiktokapis.com/v2/oauth/token/',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `https://tiktok-oauth-backend.onrender.com/auth/callback`
      }).toString()
    });
    
    console.log('Token response:', tokenResponse.data);
    
    const accessToken = tokenResponse.data.access_token;
    
    if (!accessToken) {
      console.error('Failed to get access token:', tokenResponse.data);
      return res.send(`Access Token: undefined`);
    }
    
    // Get user info using the access token
    const userResponse = await axios({
      method: 'get',
      url: 'https://open.tiktokapis.com/v2/user/info/',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        fields: 'open_id,union_id,avatar_url,avatar_url_100,avatar_url_200,display_name,bio_description,profile_deep_link'
      }
    });
    
    console.log('User info:', userResponse.data);
    
    // Redirect back to the frontend with the access token
    // In a production environment, you would store the token securely and use sessions
    res.send(`Access Token: ${accessToken}`);
    
  } catch (error) {
    console.error('Error exchanging code for token:', error.response ? error.response.data : error.message);
    res.send(`Access Token: undefined\nError: ${error.message}`);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
