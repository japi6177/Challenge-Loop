-- Pre-baked Categories: Fitness, Productivity, Educational
INSERT INTO challenges (category, title, description, start_date, end_date) VALUES 
('Fitness', '10K Steps a Day', 'Walk 10,000 steps every day for a week.', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Fitness', 'Drink 2L of Water', 'Stay hydrated by drinking at least 2 liters of water daily.', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Fitness', 'Morning Yoga', 'Do 15 minutes of yoga every morning.', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),

('Productivity', 'Zero Inbox', 'Clear out your email inbox and keep it at zero.', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Productivity', 'Pomodoro Mastery', 'Use the Pomodoro technique for 4 hours of work daily.', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Productivity', 'Digital Detox', 'No phone usage 1 hour before bed.', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),

('Educational', 'Read 50 Pages', 'Read at least 50 pages of a non-fiction book.', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Educational', 'Learn a New Concept', 'Watch an educational video or read an article on a new topic daily.', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Educational', 'Code for 1 Hour', 'Spend one uninterrupted hour learning a new programming language or framework.', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days');
