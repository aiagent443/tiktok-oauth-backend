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
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://aiagent443.github.io';

// Simple in-memory token store (for proof of concept only)
// In production, use a proper database
const tokenStore = {};

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
    console.log('Attempting to exchange code for token with the following parameters:');
    console.log('- client_key:', TIKTOK_CLIENT_KEY);
    console.log('- client_secret:', TIKTOK_CLIENT_SECRET ? '[SECRET PRESENT]' : '[SECRET MISSING]');
    console.log('- code:', code ? '[CODE PRESENT]' : '[CODE MISSING]');
    console.log('- redirect_uri:', 'https://tiktok-oauth-backend.onrender.com/auth/callback');
    
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://open.tiktokapis.com/v2/oauth/token/',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      data: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://tiktok-oauth-backend.onrender.com/auth/callback'
      }).toString()
    });
    
    console.log('Token response:', tokenResponse.data);
    
    // Extract token data - TikTok API v2 nests the token data inside a 'data' object
    let access_token, refresh_token, open_id, expires_in, scope;
    
    // Check if the response has the expected structure
    if (tokenResponse.data && tokenResponse.data.data) {
      // V2 API structure
      ({ access_token, refresh_token, open_id, expires_in, scope } = tokenResponse.data.data);
      console.log('Using V2 API response structure');
    } else if (tokenResponse.data) {
      // Direct structure (fallback)
      ({ access_token, refresh_token, open_id, expires_in, scope } = tokenResponse.data);
      console.log('Using direct response structure');
    } else {
      console.error('Unexpected token response structure:', tokenResponse);
      return res.redirect(`${FRONTEND_URL}/integration.html?auth=error&message=${encodeURIComponent('Unexpected token response structure')}`);
    }
    
    console.log('Extracted token data:', { 
      access_token: access_token ? 'PRESENT' : 'MISSING', 
      open_id: open_id || 'MISSING',
      scope: scope || 'MISSING',
      expires_in: expires_in || 'MISSING'
    });
    
    if (!access_token) {
      console.error('Failed to get access token:', tokenResponse.data);
      return res.redirect(`${FRONTEND_URL}/integration.html?auth=error&message=${encodeURIComponent('Failed to get access token')}`);
    }
    
    // Store tokens (in a real app, save to database)
    tokenStore[open_id] = {
      access_token,
      refresh_token,
      expires_at: Date.now() + ((expires_in || 86400) * 1000),
      scope
    };
    
    console.log(`Token stored for user ${open_id}. Token store now has ${Object.keys(tokenStore).length} entries.`);
    
    // Success response with token details
    let responseText = `Access Token: ${access_token}\n`;
    responseText += `Open ID: ${open_id}\n`;
    responseText += `Scope: ${scope}\n`;
    responseText += `Expires In: ${expires_in} seconds\n`;
    
    // Log the token details for debugging
    console.log(responseText);
    
    // Only try to get user info if we have the right scope
    if (scope && scope.includes('user.info.basic')) {
      try {
        // Get user info using the access token
        const userResponse = await axios({
          method: 'get',
          url: 'https://open.tiktokapis.com/v2/user/info/',
          headers: {
            'Authorization': `Bearer ${access_token}`
          },
          params: {
            fields: 'open_id,display_name,avatar_url'  // Reduced field set
          }
        });
        
        console.log('User info:', userResponse.data);
        
        // Log user info for debugging
        if (userResponse.data && userResponse.data.data) {
          const userData = userResponse.data.data;
          console.log(`User Info: Display Name: ${userData.display_name || 'N/A'}, Avatar URL: ${userData.avatar_url || 'N/A'}`);
        }
      } catch (userInfoError) {
        console.error('Error getting user info:', userInfoError.response ? userInfoError.response.data : userInfoError.message);
      }
    } else {
      console.log(`Note: User info not requested due to missing scope. Available scope: ${scope}`);
    }
    
    // Redirect to the integration.html page with success message and open_id
    res.redirect(`${FRONTEND_URL}/integration.html?auth=success&open_id=${open_id}`);
    
  } catch (error) {
    console.error('Error exchanging code for token:', error.response ? error.response.data : error.message);
    
    // More detailed error information for logs
    let errorMessage = `Access Token: undefined\nError: ${error.message}`;
    
    if (error.response) {
      errorMessage += `\nStatus: ${error.response.status}`;
      errorMessage += `\nData: ${JSON.stringify(error.response.data, null, 2)}`;
      
      // Log the request that caused the error
      console.error('Request that caused error:', {
        url: 'https://open.tiktokapis.com/v2/oauth/token/',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: {
          client_key: TIKTOK_CLIENT_KEY,
          // Don't log the actual secret, just indicate if it's present
          client_secret: TIKTOK_CLIENT_SECRET ? '[SECRET PRESENT]' : '[SECRET MISSING]',
          code: code ? '[CODE PRESENT]' : '[CODE MISSING]',
          grant_type: 'authorization_code',
          redirect_uri: 'https://tiktok-oauth-backend.onrender.com/auth/callback'
        }
      });
    }
    
    // Log the error message
    console.error(errorMessage);
    
    // Redirect to the integration.html page with an error parameter
    res.redirect(`${FRONTEND_URL}/integration.html?auth=error&message=${encodeURIComponent(error.message)}`);
  }
});

// Get user's token status
app.get('/api/token-status/:open_id', (req, res) => {
  const { open_id } = req.params;
  
  console.log(`Token status check for open_id: ${open_id}`);
  console.log(`Current token store has ${Object.keys(tokenStore).length} entries: ${Object.keys(tokenStore).join(', ')}`);
  
  if (!open_id || !tokenStore[open_id]) {
    console.log(`No token found for open_id: ${open_id}`);
    return res.status(404).json({
      success: false,
      authenticated: false,
      message: "No token found for this user"
    });
  }
  
  const tokenData = tokenStore[open_id];
  const isValid = tokenData.expires_at > Date.now();
  
  console.log(`Token for ${open_id} is ${isValid ? 'valid' : 'expired'}, expires in ${Math.floor((tokenData.expires_at - Date.now()) / 1000)} seconds`);
  
  return res.json({
    success: true,
    authenticated: isValid,
    expires_at: tokenData.expires_at,
    expires_in: Math.floor((tokenData.expires_at - Date.now()) / 1000),
    scopes: tokenData.scope
  });
});

// Debug endpoint to check token store (only for development)
app.get('/api/debug/tokens', (req, res) => {
  // Create a safe version of the token store that doesn't expose actual tokens
  const safeTokenStore = {};
  for (const [openId, data] of Object.entries(tokenStore)) {
    safeTokenStore[openId] = {
      has_access_token: !!data.access_token,
      has_refresh_token: !!data.refresh_token,
      expires_at: data.expires_at,
      expires_in: Math.floor((data.expires_at - Date.now()) / 1000),
      is_valid: data.expires_at > Date.now(),
      scope: data.scope
    };
  }
  
  res.json({
    token_count: Object.keys(tokenStore).length,
    tokens: safeTokenStore
  });
});

// Endpoint to post video to TikTok
app.post('/api/post-to-tiktok', async (req, res) => {
  const { open_id, video_url, title, description, privacy_level } = req.body;

  console.log('Received post-to-tiktok request:', {
    open_id,
    video_url,
    title,
    has_description: !!description,
    privacy_level
  });

  if (!open_id || !video_url) {
    console.log('Missing required parameters');
    return res.status(400).json({ 
      success: false, 
      error: "Missing required parameters: open_id and video_url are required" 
    });
  }

  // Check if we have a valid token for this user
  const tokenData = tokenStore[open_id];
  if (!tokenData || !tokenData.access_token) {
    console.log(`No token found for open_id: ${open_id}`);
    console.log(`Available tokens: ${Object.keys(tokenStore).join(', ')}`);
    return res.status(401).json({ 
      success: false, 
      error: "No valid access token found for this user. Please authenticate again." 
    });
  }

  // Check if token is expired
  if (tokenData.expires_at <= Date.now()) {
    console.log(`Token for ${open_id} is expired`);
    return res.status(401).json({ 
      success: false, 
      error: "Access token has expired. Please authenticate again." 
    });
  }

  // Check if we have the video.publish scope
  if (!tokenData.scope || !tokenData.scope.includes('video.publish')) {
    console.log(`Token for ${open_id} does not have video.publish scope. Available scopes: ${tokenData.scope}`);
    return res.status(403).json({ 
      success: false, 
      error: "The authenticated user does not have the video.publish scope. Please authenticate with the correct permissions." 
    });
  }

  try {
    console.log('Attempting to post video to TikTok with the following parameters:');
    console.log('- open_id:', open_id);
    console.log('- video_url:', video_url);
    console.log('- title:', title);
    console.log('- privacy_level: SELF_ONLY (required for unaudited applications)');

    // Step 1: Initialize video upload
    const initResponse = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        post_info: {
          title: title || "Historical Event Video",
          description: description || "Generated historical event video",
          privacy_level: "SELF_ONLY", // Always use SELF_ONLY for unaudited applications
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 0
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: video_url
        }
      },
      {
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log('TikTok video init response:', initResponse.data);

    // Return the response from TikTok
    return res.json({
      success: true,
      data: initResponse.data
    });
  } catch (error) {
    console.error('Error posting to TikTok:', error.response?.data || error.message);
    
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.response) {
      errorMessage = JSON.stringify(error.response.data);
      statusCode = error.response.status;
      
      // Log the request that caused the error
      console.error('Request that caused error:', {
        url: 'https://open.tiktokapis.com/v2/post/publish/video/init/',
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer [TOKEN HIDDEN]',
          'Content-Type': 'application/json'
        },
        data: {
          post_info: {
            title: title || "Historical Event Video",
            description: description || "Generated historical event video",
            privacy_level: "SELF_ONLY" // Always use SELF_ONLY for unaudited applications
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: video_url
          }
        }
      });
    }
    
    return res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
