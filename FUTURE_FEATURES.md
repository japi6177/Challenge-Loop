# Future Features

This document tracks features that have been ideated or partially implemented but are currently stripped out or delayed for future milestones.

## Admin Reminders via Email

An endpoint to send email reminders to users whose challenges are ending within 2 days.

**Original Implementation Concept:**
- **Route**: `GET /admin/send-reminders`
- **Logic**: Query `challenges` ending within `< 2 days`, iterate through users joined to them, and trigger an email via the `resend` API.
- **Why it was removed**: Simplified the core project requirements for the current release. Can be re-added later when background jobs/cron tasks are formally implemented.
