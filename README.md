# CSCI-3308-group-project
ChallengeLoop

Challenge Loop is about accomplishing day-to-day challenges that promote wellness. Users can pick daily, weekly, or monthly challenges to compete with friends or groups of people. 

# Contributors
Tahnee Xiong
Peter Hindes
Hunter Jamili
Jacob Pierson
Fynian Walker

## Environment Variables

To run the project locally using Docker, you need to create a `.env` file inside the `ProjectSourceCode` directory with the following variables:

```env
POSTGRES_USER=guy
POSTGRES_PASSWORD=secret
POSTGRES_DB=users_db
SESSION_SECRET=supersecret
```

- **`POSTGRES_USER` & `POSTGRES_PASSWORD`**: Credentials for accessing the Postgres database.
- **`POSTGRES_DB`**: The name of the database that will be created and used by the application.
- **`SESSION_SECRET`**: A secret key used by `express-session` to encrypt session data.
  
#LINK
tbd
