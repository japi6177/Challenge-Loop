# CSCI-3308-group-project
ChallengeLoop

Challenge Loop is about accomplishing day-to-day challenges that promote wellness. Users can pick daily, weekly, or monthly challenges to compete with friends or groups of people. 

# Contributors
Tahnee Xiong
Peter Hindes
Hunter Jamili
Jacob Pierson
Fynian Walker

# Technology Stack
HTML
CSS
JavaScript
NodeJs

## Environment Variables

To run the project locally using Docker, you need to create a `.env` file inside the `ProjectSourceCode` directory with the following variables:

```env
POSTGRES_USER=guy
POSTGRES_PASSWORD=secret
POSTGRES_DB=users_db
SESSION_SECRET=supersecret
RESEND_API_KEY=re_your_api_key_here
```

- **`POSTGRES_USER` & `POSTGRES_PASSWORD`**: Credentials for accessing the Postgres database.
- **`POSTGRES_DB`**: The name of the database that will be created and used by the application.
- **`SESSION_SECRET`**: A secret key used by `express-session` to encrypt session data.
- **`RESEND_API_KEY`** *(optional)*: API key for [Resend](https://resend.com) used to send email login codes and challenge reminders. If omitted, the app runs normally but emails are skipped — verification codes are printed to the server console instead (useful for local development).

### Setting up Resend (email) (dont do this if you are not forking)

1. Create a free account at [resend.com](https://resend.com).
2. Go to **API Keys** in the Resend dashboard and create a new key.
3. Copy the key and add it to your `.env` file as `RESEND_API_KEY=re_...`.
4. Add and verify a sending domain in the Resend dashboard and update all the from emails in `index.js`.

> **Local development without email:** If you leave `RESEND_API_KEY` unset, the app will still start and run. When the email-login flow is triggered, the one-time code will be printed to the server console so you can complete sign-in without a real email account.

