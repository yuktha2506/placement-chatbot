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
