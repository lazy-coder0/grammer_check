# WriteRight Setup

## Files
- index.html
- CSS/style.css
- JS/config.js
- JS/app.js

## How to run
1. Open index.html in your browser.
2. Register a profile.
3. Select your provider and enter your API key.
4. Click Check Writing and paste your paragraph.

## API key notes
- Your key is stored only in localStorage in this browser.
- Do not share screenshots that show your key.
- For production use, move API calls to a backend server.

## Provider key format
- Anthropic: starts with sk-ant-
- OpenAI: starts with sk-
- Google AI Studio (Gemini): starts with AIza

## Google key fallback
- If you select Google and leave the API key field empty, the app uses `googleApiKey` from `JS/config.js`.
