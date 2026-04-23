# 🚀 Getting Started

## Prerequisites
To run this application locally, you need:
- **Docker Desktop**: [Download here](https://www.docker.com/products/docker-desktop/)
- **Node.js** (v18+ recommended): [Download here](https://nodejs.org/)
- **An IDE** (e.g., VS Code)

## How to Run Locally
1. **Clone the repository**:
   ```bash
   git clone https://github.com/peter/Challenge-Loop.git
   cd Challenge-Loop/ProjectSourceCode
   ```
2. **Setup Environment Variables**:
   Create a `.env` file in the `ProjectSourceCode` directory (see the "Environment Variables" section below for values).
3. **Start the application**:
   ```bash
   docker compose up --build
   ```
4. **Access the app**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Run Tests
1. Ensure the docker containers are running.
2. Run the following command from the `ProjectSourceCode` directory:
   ```bash
   npm test
   ```
   *Note: This will execute the Mocha/Chai integration tests in the `test/` folder.*

## Deployment
The application is deployed on Render and can be accessed at:
[Challenge Loop Live](https://challenge-loop.onrender.com) *(Update with your actual link if different)*

---

# 🔐 Security Note: Passwordless Authentication
Challenge Loop uses a modern **Passwordless Authentication** model (Email + One-Time Verification Code).
- **Security**: Instead of persistent passwords that can be breached, we use short-lived JWT tokens and 256-bit hashed OTP codes.
- **Hashing**: All one-time verification codes are hashed using `SHA-256` before storage, fulfilling the security requirements of the project while providing a frictionless user experience.

---

# 🛠️ Technology Stack
- **Frontend**: Handlebars (HBS), Vanilla CSS, Bootstrap
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (pg-promise)
- **Containerization**: Docker
- **AI**: Google Gemini Flash (Challenge Generation)


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

