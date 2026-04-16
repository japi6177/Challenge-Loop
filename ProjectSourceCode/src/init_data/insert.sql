-- Pre-baked Categories: Fitness, Productivity, Educational
-- Weekly challenges (Mon–Sun of current week)
INSERT INTO challenges (category, title, description, start_date, end_date, entry_type, daily_target, challenge_type) VALUES
('Fitness', '10K Steps a Day', 'Walk 10,000 steps every day for a week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 10000, 'weekly'),
('Fitness', 'Drink 2L of Water', 'Stay hydrated by drinking at least 2 liters of water daily (enter in liters).', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 2, 'weekly'),
('Fitness', 'Morning Yoga', 'Do 15 minutes of yoga every morning.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),

('Productivity', 'Zero Inbox', 'Clear out your email inbox and keep it at zero.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', 'Pomodoro Mastery', 'Use the Pomodoro technique for 4 hours of work daily.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 4, 'weekly'),
('Productivity', 'Digital Detox', 'No phone usage 1 hour before bed.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),

('Educational', 'Read 50 Pages', 'Read at least 50 pages of a non-fiction book.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 50, 'weekly'),
('Educational', 'Learn a New Concept', 'Watch an educational video or read an article on a new topic daily.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Educational', 'Code for 1 Hour', 'Spend one uninterrupted hour learning a new programming language or framework.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),

-- Daily challenges (today only)
('Fitness', 'Daily Push-Up Challenge', 'Do 50 push-ups at any point today.', CURRENT_DATE, CURRENT_DATE, 'amount', 50, 'daily'),
('Productivity', 'Daily Deep Work', 'Complete one focused 90-minute deep work session today.', CURRENT_DATE, CURRENT_DATE, 'checkbox', 1, 'daily'),
('Educational', 'Daily Vocab Builder', 'Learn 5 new vocabulary words and use each in a sentence today.', CURRENT_DATE, CURRENT_DATE, 'amount', 5, 'daily'),

-- Monthly challenges (first to last day of current month)
('Fitness', 'Monthly Step Marathon', 'Accumulate 300,000 steps this month — about 10K per day.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'amount', 10000, 'monthly'),
('Productivity', 'Monthly Reading Sprint', 'Read for at least 30 minutes every day this month.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Educational', 'Monthly Coding Streak', 'Write code every single day this month — no days off.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),

-- Group challenges (2-week team sprint)
('Fitness', 'Group Fitness Blitz', 'Team up and each complete a workout every day for two weeks.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'checkbox', 1, 'group'),
('Productivity', 'Group Accountability Sprint', 'Keep each other accountable: log at least 2 hours of focused work daily for 2 weeks.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'amount', 2, 'group'),
('Educational', 'Group Book Club', 'Read and discuss 20 pages a day together for two weeks.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'amount', 20, 'group');
