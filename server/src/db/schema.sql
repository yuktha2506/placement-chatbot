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
