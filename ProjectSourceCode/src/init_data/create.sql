-- -- Drop tables if they exist to allow clean re-initialization
-- DROP VIEW IF EXISTS user_progress CASCADE;
-- DROP TABLE IF EXISTS challenge_entries CASCADE;
-- DROP TABLE IF EXISTS challenges CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    profile_picture TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, category)
);

-- Global User Logouts table
CREATE TABLE IF NOT EXISTS user_logouts (
    email VARCHAR(100) PRIMARY KEY,
    logout_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    entry_type VARCHAR(20) NOT NULL DEFAULT 'checkbox',
    daily_target NUMERIC DEFAULT 1,
    challenge_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
    creator_id INT REFERENCES users(id) ON DELETE SET NULL,
    enable_judging BOOLEAN DEFAULT false,
    CONSTRAINT check_dates CHECK (end_date >= start_date),
    CONSTRAINT check_challenge_type CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'group'))
);

-- User participation (join table)
CREATE TABLE IF NOT EXISTS user_challenges (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_challenge UNIQUE(user_id, challenge_id)
);

-- Add indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge_id ON user_challenges(challenge_id);

-- Challenge entries for daily tracking
CREATE TABLE IF NOT EXISTS challenge_entries (
    id SERIAL PRIMARY KEY,
    user_challenge_id INT NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    amount NUMERIC DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    photo_data TEXT,
    judge_status VARCHAR(20) DEFAULT 'pending'
);

-- Judge assignments
CREATE TABLE IF NOT EXISTS judge_assignments (
    id SERIAL PRIMARY KEY,
    challenge_id INT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    judge_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(challenge_id, judge_id)
);

-- Comments for challenges
CREATE TABLE IF NOT EXISTS challenge_comments (
    id SERIAL PRIMARY KEY,
    challenge_id INT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Friend Table
CREATE TABLE IF NOT EXISTS friends (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_comments_challenge_id ON challenge_comments(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_comments_user_id ON challenge_comments(user_id);

-- Progress view — when judging is enabled, only approved entries count toward successful days
CREATE OR REPLACE VIEW user_progress AS
WITH daily_sums AS (
  SELECT
    ce.user_challenge_id,
    ce.entry_date,
    c.enable_judging,
    c.entry_type,
    c.daily_target,
    SUM(CASE WHEN NOT COALESCE(c.enable_judging, false) OR ce.judge_status = 'approved' THEN ce.amount ELSE 0 END) AS approved_amount,
    BOOL_OR(ce.is_completed AND (NOT COALESCE(c.enable_judging, false) OR ce.judge_status = 'approved')) AS approved_done
  FROM challenge_entries ce
  JOIN user_challenges uc ON ce.user_challenge_id = uc.id
  JOIN challenges c ON uc.challenge_id = c.id
  GROUP BY ce.user_challenge_id, ce.entry_date, c.enable_judging, c.entry_type, c.daily_target
),
successful_days AS (
  SELECT ds.user_challenge_id, count(*) AS success_count
  FROM daily_sums ds
  WHERE (ds.entry_type = 'amount' AND ds.approved_amount >= ds.daily_target)
     OR (ds.entry_type = 'checkbox' AND ds.approved_done)
  GROUP BY ds.user_challenge_id
)
SELECT uc.id AS user_challenge_id, uc.user_id, uc.challenge_id,
       COALESCE(sd.success_count, 0) AS successful_days,
       (c.end_date - c.start_date + 1) AS total_days,
       LEAST(ROUND((COALESCE(sd.success_count, 0)::numeric / NULLIF((c.end_date - c.start_date + 1)::numeric, 0)) * 100), 100) AS progress
FROM user_challenges uc
LEFT JOIN successful_days sd ON uc.id = sd.user_challenge_id
JOIN challenges c ON uc.challenge_id = c.id;
