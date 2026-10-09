(The file `c:\Users\DELL\Desktop\AgenticAiInterview\README.md` exists, but is empty)
Agentic AI Interview

Quick start

Backend:

```bash
cd backend
npm install
cp .env.example .env    # fill MONGO_URI, GROQ_API_KEY (optional), JWT_SECRET
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

New environment flags
- `COMPANY_API_DISABLED` — set to `true` to disable internal company APIs.

Employer workflow notes
- Companies register with a `uid` (you choose) used as a lightweight credential.
- Frontend stores `companyUid` in localStorage and sends it as header `x-company-uid` for protected endpoints.

Skill extraction
- The backend uses a heuristic extractor with synonyms and fuzzy matching to extract skills and assign weights from job descriptions.
- If you want a more accurate LLM-based extractor, provide `GROQ_API_KEY` and I can wire an optional extraction call.
