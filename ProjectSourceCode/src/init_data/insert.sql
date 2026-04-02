-- Pre-baked Categories: Fitness, Productivity, Educational
INSERT INTO challenges (category, title, description, start_date, end_date, entry_type, daily_target) VALUES 
('Fitness', '10K Steps a Day', 'Walk 10,000 steps every day for a week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 10000),
('Fitness', 'Drink 2L of Water', 'Stay hydrated by drinking at least 2 liters of water daily (enter in liters).', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 2),
('Fitness', 'Morning Yoga', 'Do 15 minutes of yoga every morning.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1),

('Productivity', 'Zero Inbox', 'Clear out your email inbox and keep it at zero.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1),
('Productivity', 'Pomodoro Mastery', 'Use the Pomodoro technique for 4 hours of work daily.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 4),
('Productivity', 'Digital Detox', 'No phone usage 1 hour before bed.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1),

('Educational', 'Read 50 Pages', 'Read at least 50 pages of a non-fiction book.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 50),
('Educational', 'Learn a New Concept', 'Watch an educational video or read an article on a new topic daily.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1),
('Educational', 'Code for 1 Hour', 'Spend one uninterrupted hour learning a new programming language or framework.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1);
