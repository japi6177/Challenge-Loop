-- Pre-baked Categories: Fitness (1), Productivity (2), Educational (3)
INSERT INTO categories (name) VALUES ('Fitness'), ('Productivity'), ('Educational');

INSERT INTO challenges (category_id, title, description, start_date, end_date, number_of_intervals, period_target, entry_type, metric_name) VALUES 
(1, '10K Steps a Day', 'Walk 10,000 steps every day for a week.', DATE_TRUNC('week', CURRENT_DATE)::TIMESTAMP, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::TIMESTAMP, 7, 10000, 2, 'steps'),
(1, 'Drink 2L of Water', 'Stay hydrated by drinking at least 2 liters of water daily (enter in liters).', DATE_TRUNC('week', CURRENT_DATE)::TIMESTAMP, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::TIMESTAMP, 7, 2, 2, 'liters'),
(1, 'Morning Yoga', 'Do 15 minutes of yoga every morning.', DATE_TRUNC('week', CURRENT_DATE)::TIMESTAMP, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::TIMESTAMP, 7, 1, 1, 'session'),

(2, 'Zero Inbox', 'Clear out your email inbox and keep it at zero.', DATE_TRUNC('week', CURRENT_DATE)::TIMESTAMP, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::TIMESTAMP, 7, 1, 1, 'day'),
(2, 'Pomodoro Mastery', 'Use the Pomodoro technique for 4 hours of work daily.', DATE_TRUNC('week', CURRENT_DATE)::TIMESTAMP, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::TIMESTAMP, 7, 4, 2, 'hours'),
(2, 'Digital Detox', 'No phone usage 1 hour before bed.', DATE_TRUNC('week', CURRENT_DATE)::TIMESTAMP, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::TIMESTAMP, 7, 1, 1, 'day'),

(3, 'Read 50 Pages', 'Read at least 50 pages of a non-fiction book.', DATE_TRUNC('week', CURRENT_DATE)::TIMESTAMP, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::TIMESTAMP, 7, 50, 2, 'pages'),
(3, 'Learn a New Concept', 'Watch an educational video or read an article on a new topic daily.', DATE_TRUNC('week', CURRENT_DATE)::TIMESTAMP, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::TIMESTAMP, 7, 1, 1, 'concept'),
(3, 'Code for 1 Hour', 'Spend one uninterrupted hour learning a new programming language or framework.', DATE_TRUNC('week', CURRENT_DATE)::TIMESTAMP, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::TIMESTAMP, 7, 1, 1, 'hour');
