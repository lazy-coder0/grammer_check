# WriteRight Setup

## Files
- index.html
- CSS/style.css
- JS/config.js
- JS/app.js

## How to run
1. Open index.html in your browser.
2. Register with name, email, and password only.
3. Log in and click Check Writing.
4. Paste your paragraph and run analysis.

## API key notes
- The app uses the configured demo key in `JS/config.js`.
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
- Users keep access to their writing history after login.
- History is saved locally and can sync to Supabase when configured.

## Supabase database setup
- Run `supabase_schema.sql` in your Supabase SQL editor.
- Put your project URL and anon key in `JS/config.js`:
	- `supabase.url`
	- `supabase.anonKey`
- Once set, user stats and history auto-sync to Supabase with localStorage fallback.
