# AI-Powered Placement Guidance Chatbot

A full-stack placement mentoring chatbot for students, built with React, Node.js, Express, MySQL, JWT authentication, Hugging Face Inference Providers, and optional OpenAI fallback. The app uses a local placement knowledge base first, then asks the LLM to compose structured markdown answers with context.

## Features

- AI placement mentor with RAG-backed knowledge base
- Service-based and product-based company guidance
- Placement roadmap, resume, aptitude, DSA, HR, technical interview, internship, salary, trend, and career guidance
- Multiple chat sessions with persisted history
- Create, rename, delete, and reload chats
- Auto-generated chat titles from the first question
- Greeting response for Hi, Hello, Hey, Good Morning, Good Afternoon, and Good Evening
- Suggested question cards on empty chats
- Markdown answers with bullet points and comparison tables
- TXT and PDF chat export
- Dark and light modes
- Responsive ChatGPT-like UI
- JWT authentication
- Hugging Face model integration through the Inference Providers chat API
- Optional OpenAI provider/fallback
- Express validation, rate limiting, error handling, and secure environment config

## Project Structure

```text
D:\placement_chatbot
├── client
│   ├── src
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   └── package.json
└── server
    ├── src
    │   ├── config
    │   ├── data
    │   ├── db
    │   ├── middleware
    │   ├── routes
    │   ├── services
    │   └── utils
    ├── .env.example
    └── package.json
```

## Database Schema

```sql
sessions
--------
id
user_id
title
created_at
updated_at

messages
--------
id
session_id
role
content
timestamp
```

The implementation also includes a `users` table for JWT authentication.

## Setup

1. Create the backend environment file:

```powershell
cd D:\placement_chatbot\server
copy .env.example .env
```

2. Edit `D:\placement_chatbot\server\.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=placement_chatbot
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173

# AI_PROVIDER can be: huggingface, openai, auto, or none
AI_PROVIDER=huggingface

# Hugging Face Inference Providers
HF_TOKEN=your_hugging_face_token
HF_MODEL=openai/gpt-oss-120b:fastest

# Optional OpenAI fallback/provider
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

For Hugging Face, create a token from Hugging Face settings with permission to call Inference Providers. You can change `HF_MODEL` to another supported chat model, for example with a provider policy suffix like `:fastest`, `:cheapest`, or `:preferred`.

3. Install dependencies:

```powershell
cd D:\placement_chatbot\server
npm install

cd D:\placement_chatbot\client
npm install
```

4. Initialize MySQL:

```powershell
cd D:\placement_chatbot\server
npm run db:init
```

5. Start the backend:

```powershell
cd D:\placement_chatbot\server
npm run dev
```

6. Start the frontend in a second terminal:

```powershell
cd D:\placement_chatbot\client
npm run dev
```

Open `http://localhost:5173`.

## API Endpoints

### Auth

- `POST /auth/register`
- `POST /auth/login`

### Chat

- `POST /chat`

Body:

```json
{
  "sessionId": "optional-session-id",
  "message": "Difference between product and service companies"
}
```

### Sessions

- `POST /sessions`
- `GET /sessions`
- `GET /sessions/:id`
- `PUT /sessions/:id`
- `DELETE /sessions/:id`

All chat and session endpoints require:

```http
Authorization: Bearer <jwt>
```

## Future Enhancement Hooks

The app is intentionally modular so these can be added cleanly:

- Resume Analyzer
- ATS Score Checker
- Mock Interview Bot
- Company Eligibility Checker
- Placement Statistics Dashboard
- Job Recommendation Engine
- Personalized Learning Roadmap
- College Placement Analytics
