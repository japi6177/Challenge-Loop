-- -- Drop tables if they exist to allow clean re-initialization
-- DROP VIEW IF EXISTS user_progress CASCADE;
-- DROP TABLE IF EXISTS challenge_entries CASCADE;
-- DROP TABLE IF EXISTS challenges CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password CHAR(60) NOT NULL,
    profile_picture TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE user_preferences (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, category)
);

-- Challenges table
CREATE TABLE challenges (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    entry_type VARCHAR(20) NOT NULL DEFAULT 'checkbox',
    daily_target NUMERIC DEFAULT 1,
    challenge_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
    CONSTRAINT check_dates CHECK (end_date >= start_date),
    CONSTRAINT check_challenge_type CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'group'))
);

-- User participation (join table)
CREATE TABLE user_challenges (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_challenge UNIQUE(user_id, challenge_id)
);

-- Add indexes for faster querying
CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX idx_user_challenges_challenge_id ON user_challenges(challenge_id);

-- Challenge entries for daily tracking
CREATE TABLE challenge_entries (
    id SERIAL PRIMARY KEY,
    user_challenge_id INT NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    amount NUMERIC DEFAULT 0,
    is_completed BOOLEAN DEFAULT false
);

-- Pre-baked SQL Query generating dynamic live progress tracking metrics efficiently
CREATE VIEW user_progress AS
WITH daily_sums AS (
  SELECT user_challenge_id, entry_date,
         SUM(amount) as total_amount,
         BOOL_OR(is_completed) as is_done
  FROM challenge_entries
  GROUP BY user_challenge_id, entry_date
),
successful_days AS (
  SELECT ds.user_challenge_id, count(*) as success_count
  FROM daily_sums ds
  JOIN user_challenges uc ON ds.user_challenge_id = uc.id
  JOIN challenges c ON uc.challenge_id = c.id
  WHERE (c.entry_type = 'amount' AND ds.total_amount >= c.daily_target)
     OR (c.entry_type = 'checkbox' AND ds.is_done)
  GROUP BY ds.user_challenge_id
)
SELECT uc.id as user_challenge_id, uc.user_id, uc.challenge_id,
       COALESCE(sd.success_count, 0) as successful_days,
       (c.end_date - c.start_date + 1) AS total_days,
       LEAST(ROUND((COALESCE(sd.success_count, 0)::numeric / NULLIF((c.end_date - c.start_date + 1)::numeric, 0)) * 100), 100) AS progress
FROM user_challenges uc
LEFT JOIN successful_days sd ON uc.id = sd.user_challenge_id
JOIN challenges c ON uc.challenge_id = c.id;