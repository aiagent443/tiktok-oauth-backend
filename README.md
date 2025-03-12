# TikTok OAuth Backend

This is a simple Express.js server that handles the TikTok OAuth flow for the AgentContent website.

## Features

- Handles the OAuth callback from TikTok
- Exchanges the authorization code for an access token
- Retrieves user information using the access token
- Returns the access token to the client

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
   FRONTEND_URL=https://agentcontent.info
   PORT=3000
   ```
4. Start the server:
   ```
   npm start
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

- `GET /`: Health check endpoint
- `GET /auth/callback`: OAuth callback endpoint that exchanges the authorization code for an access token

## Important Notes

- Make sure the redirect URI in your TikTok Developer Portal matches exactly: `https://tiktok-oauth-backend.onrender.com/auth/callback`
- The client secret should be kept secure and not committed to version control
- In a production environment, you should implement proper token storage and user sessions