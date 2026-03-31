# WriteRight Setup

## Files
- index.html
- CSS/style.css
- JS/config.js
- JS/app.js

## How to run
1. Open index.html in your browser.
2. Register with name, email, and password only.
3. Log in and set your API key from Profile > Update API Key.
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

## Account and history safety
- Passwords are stored as salted SHA-256 hashes, not plain text.
- Users can download a backup JSON from Profile and restore it later.
- Backup includes account record and writing history for recovery.
