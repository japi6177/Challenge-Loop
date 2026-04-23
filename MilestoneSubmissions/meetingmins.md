# Team 3 Meeting Minutes

## Week 2: April 6th, 2026
**Decisions Made:**
- Finalized core challenge tracking logic (checkbox vs. amount).
- Initialized Docker environment and basic Postgres schema.

**Alternative Actions Discussed:**
- Discussed various database schemas; decided on a relational model for challenges and entries.
- Considered using plain HTML but opted for Handlebars (HBS) for dynamic rendering.

**Follow-up Items:**
- **Peter:** Finalize Docker config.
- **Tahnee:** Draft initial wireframes.

---

## Week 3: April 13th, 2026
**Decisions Made:**
- **Feature Pivot**: Decided to implement a fallback for the Resend API so the app can run locally without a valid API key (codes print to console).
- **Social Addition**: Agreed to add a `comments` table and backend routes to allow user interaction on challenges.
- **Architecture**: Decided to store user statistics (active vs. completed) in a separate view for performance.

**Alternative Actions Discussed:**
- Discussed using a public API for challenges vs. user-generated; decided user-generated provides better "loop" engagement.

**Follow-up Items:**
- **Hunter:** Implement the comments UI.
- **Fynian:** Finalize user statistics view.

---

## Week 4: April 23rd, 2026
**Decisions Made:**
- **Major Refactor**: Voted to replace `express-session` with **JWT-based authentication** to simplify the stack and improve scalability.
- **Security**: Implemented a `user_logouts` table to ensure tokens are revoked upon logout, fulfilling security requirements.
- **AI Integration**: Chose **Google Gemini Flash** for the "AI Challenge Generator" over other models due to response speed.
- **Database**: Decided to implement a **Strategy-based Migration Utility** to handle schema updates automatically during development.

**Alternative Actions Discussed:**
- Discussed implementing a global leaderboard; decided to prioritize the "Friends Social Feed" and "Friend Requests" to focus on community-building first.

**Follow-up Items:**
- **Group:** Renaming files for final milestone submission.
- **Peter:** Final audit of README and test coverage.
