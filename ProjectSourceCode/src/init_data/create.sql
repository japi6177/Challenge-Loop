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

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- User preferences table
CREATE TABLE user_preferences (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, category_id)
);

-- Challenges table
CREATE TABLE challenges (
    id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    number_of_intervals INT NOT NULL DEFAULT 1,
    period_target NUMERIC DEFAULT 1,
    entry_type INT NOT NULL DEFAULT 1, -- 1 = checkbox, 2 = amount
    metric_name VARCHAR(50),
    CONSTRAINT check_dates CHECK (end_date >= start_date)
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
    entry_date TIMESTAMP NOT NULL,
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
  WHERE (c.entry_type = 2 AND ds.total_amount >= c.period_target)
     OR (c.entry_type = 1 AND ds.is_done)
  GROUP BY ds.user_challenge_id
)
SELECT uc.id as user_challenge_id, uc.user_id, uc.challenge_id, 
       COALESCE(sd.success_count, 0) as successful_days,
       LEAST(ROUND((COALESCE(sd.success_count, 0)::numeric / 7.0) * 100), 100) AS progress
FROM user_challenges uc
LEFT JOIN successful_days sd ON uc.id = sd.user_challenge_id;