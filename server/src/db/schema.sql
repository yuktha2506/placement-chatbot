CREATE DATABASE IF NOT EXISTS placement_chatbot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE placement_chatbot;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  title VARCHAR(180) NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content MEDIUMTEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_session
    FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE,
  INDEX idx_messages_session_timestamp (session_id, timestamp)
);

CREATE TABLE IF NOT EXISTS mock_interviews (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  role VARCHAR(80) NOT NULL,
  difficulty VARCHAR(40) NOT NULL,
  duration_minutes INT NOT NULL,
  status ENUM('active', 'completed') NOT NULL DEFAULT 'active',
  current_question_index INT NOT NULL DEFAULT 0,
  question_plan_json JSON NOT NULL,
  report_json JSON NULL,
  overall_score INT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  CONSTRAINT fk_mock_interviews_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  INDEX idx_mock_interviews_user_started (user_id, started_at)
);

CREATE TABLE IF NOT EXISTS mock_interview_turns (
  id CHAR(36) PRIMARY KEY,
  interview_id CHAR(36) NOT NULL,
  question_index INT NOT NULL,
  question_type VARCHAR(40) NOT NULL,
  question TEXT NOT NULL,
  answer MEDIUMTEXT NOT NULL,
  evaluation_json JSON NOT NULL,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mock_turns_interview
    FOREIGN KEY (interview_id) REFERENCES mock_interviews(id)
    ON DELETE CASCADE,
  INDEX idx_mock_turns_interview_index (interview_id, question_index)
);

CREATE TABLE IF NOT EXISTS company_eligibility (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  category ENUM('Service-based', 'Product-based', 'Core', 'Startup') NOT NULL,
  min_cgpa DECIMAL(3,2) NOT NULL,
  eligible_branches JSON NOT NULL,
  max_backlogs INT NOT NULL DEFAULT 0,
  required_skills JSON NOT NULL,
  preferred_skills JSON NOT NULL,
  role VARCHAR(160) NOT NULL,
  notes TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company_category (category),
  INDEX idx_company_min_cgpa (min_cgpa)
);

INSERT IGNORE INTO company_eligibility
  (id, name, category, min_cgpa, eligible_branches, max_backlogs, required_skills, preferred_skills, role, notes)
VALUES
  ('tcs-nqt', 'Tata Consultancy Services', 'Service-based', 6.0, JSON_ARRAY('CSE','ISE','IT','ECE','EEE','ME','Civil'), 0, JSON_ARRAY('Aptitude','Programming basics'), JSON_ARRAY('Java','Python','SQL'), 'Assistant System Engineer', 'Sample/demo criteria. Actual campus criteria can vary by college and hiring season.'),
  ('infosys-se', 'Infosys', 'Service-based', 6.0, JSON_ARRAY('CSE','ISE','IT','ECE','EEE'), 0, JSON_ARRAY('Aptitude','Programming basics'), JSON_ARRAY('Java','Python','DBMS'), 'Systems Engineer', 'Sample/demo criteria. Verify official campus notification before applying.'),
  ('accenture-aase', 'Accenture', 'Service-based', 6.5, JSON_ARRAY('CSE','ISE','IT','ECE','EEE','ME'), 0, JSON_ARRAY('Communication','Programming basics'), JSON_ARRAY('Java','SQL','Cloud basics'), 'Associate Software Engineer', 'Sample/demo criteria for guidance only.'),
  ('cognizant-pat', 'Cognizant', 'Service-based', 6.0, JSON_ARRAY('CSE','ISE','IT','ECE'), 0, JSON_ARRAY('Aptitude','Programming basics'), JSON_ARRAY('Java','SQL','OOP'), 'Programmer Analyst Trainee', 'Sample/demo criteria for guidance only.'),
  ('google-swe', 'Google', 'Product-based', 7.5, JSON_ARRAY('CSE','ISE','IT','ECE'), 0, JSON_ARRAY('DSA','Problem solving'), JSON_ARRAY('Java','Python','C++','System Design'), 'Software Engineer Intern / New Grad', 'Sample/demo criteria. Product company shortlisting is highly competitive and may include coding profiles.'),
  ('microsoft-swe', 'Microsoft', 'Product-based', 7.0, JSON_ARRAY('CSE','ISE','IT','ECE'), 0, JSON_ARRAY('DSA','OOP'), JSON_ARRAY('C++','Java','Python','Cloud basics'), 'Software Engineer', 'Sample/demo criteria. Official eligibility can differ by role and campus.'),
  ('amazon-sde', 'Amazon', 'Product-based', 7.0, JSON_ARRAY('CSE','ISE','IT','ECE'), 0, JSON_ARRAY('DSA','Problem solving'), JSON_ARRAY('Java','Python','System Design','OOP'), 'SDE I', 'Sample/demo criteria for guidance only.'),
  ('adobe-mts', 'Adobe', 'Product-based', 7.5, JSON_ARRAY('CSE','ISE','IT'), 0, JSON_ARRAY('DSA','OOP'), JSON_ARRAY('C++','Java','React','Computer Networks'), 'Member of Technical Staff', 'Sample/demo criteria for guidance only.'),
  ('bosch-core', 'Bosch', 'Core', 7.0, JSON_ARRAY('ECE','EEE','ME','CSE','ISE'), 0, JSON_ARRAY('Engineering fundamentals'), JSON_ARRAY('Embedded C','MATLAB','Python','IoT'), 'Graduate Engineer Trainee', 'Sample/demo criteria for guidance only.'),
  ('siemens-get', 'Siemens', 'Core', 7.0, JSON_ARRAY('ECE','EEE','ME','CSE'), 0, JSON_ARRAY('Engineering fundamentals'), JSON_ARRAY('Automation','PLC','Python','C'), 'Graduate Trainee Engineer', 'Sample/demo criteria for guidance only.'),
  ('lnt-core', 'Larsen & Toubro', 'Core', 6.5, JSON_ARRAY('Civil','ME','EEE','ECE'), 0, JSON_ARRAY('Engineering fundamentals'), JSON_ARRAY('AutoCAD','Project Management','Excel'), 'Graduate Engineer Trainee', 'Sample/demo criteria for guidance only.'),
  ('razorpay-startup', 'Razorpay', 'Startup', 7.0, JSON_ARRAY('CSE','ISE','IT'), 0, JSON_ARRAY('DSA','Backend basics'), JSON_ARRAY('JavaScript','Node.js','React','SQL'), 'Software Engineer', 'Sample/demo criteria. Startup hiring often prioritizes projects and internships.'),
  ('freshworks-startup', 'Freshworks', 'Startup', 6.5, JSON_ARRAY('CSE','ISE','IT','ECE'), 0, JSON_ARRAY('Programming basics','Problem solving'), JSON_ARRAY('JavaScript','React','Java','SQL'), 'Software Engineer', 'Sample/demo criteria for guidance only.'),
  ('zoho-startup', 'Zoho', 'Startup', 5.5, JSON_ARRAY('CSE','ISE','IT','ECE','EEE'), 1, JSON_ARRAY('Programming basics'), JSON_ARRAY('C','Java','SQL','Problem solving'), 'Software Developer', 'Sample/demo criteria. Some drives may emphasize coding rounds over CGPA.');
