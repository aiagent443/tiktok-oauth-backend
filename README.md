# TikTok OAuth Backend

This is an Express.js server that handles the TikTok OAuth flow and video posting for the Historical Events to TikTok application.

## Features

- Handles the OAuth callback from TikTok
- Exchanges the authorization code for an access token
- Stores tokens for authenticated users (in-memory for proof of concept)
- Retrieves user information using the access token
- Posts videos to TikTok using the Content Posting API
- Provides token status checking

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- TikTok for Developers account with an approved app
- `video.publish` scope approval for your TikTok app

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   TIKTOK_CLIENT_KEY=your_client_key
   TIKTOK_CLIENT_SECRET=your_client_secret
   FRONTEND_URL=https://aiagent443.github.io
   PORT=3000
   ```
4. Start the server:
   ```
   npm start
   ```

## Development

For development with auto-restart on file changes:
```
npm run dev
```

## Deployment to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the following:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add the environment variables from the `.env` file
5. Deploy the service

## API Endpoints

### OAuth Flow

- `GET /`: Health check endpoint
- `GET /auth/callback`: OAuth callback endpoint that exchanges the authorization code for an access token

### Token Management

- `GET /api/token-status/:open_id`: Checks if a user's token is valid and returns its status

### Video Posting

- `POST /api/post-to-tiktok`: Posts a video to TikTok
  - Request Body:
    ```json
    {
      "open_id": "user_open_id",
      "video_url": "https://example.com/video.mp4",
      "title": "Video Title",
      "description": "Video Description",
      "privacy_level": "SELF_ONLY"
    }
    ```
  - Privacy Level Options:
    - `SELF_ONLY`: Only visible to the creator
    - `FOLLOW_FRIENDS`: Visible to followers and friends
    - `PUBLIC`: Visible to everyone

## Important Notes

- Make sure the redirect URI in your TikTok Developer Portal matches exactly: `https://tiktok-oauth-backend.onrender.com/auth/callback`
- The client secret should be kept secure and not committed to version control
- This implementation uses in-memory token storage for demonstration purposes only
- In a production environment, you should implement proper token storage and user sessions
- Always use HTTPS in production
- Implement proper error handling and logging
- Consider implementing refresh token logic for long-lived access