# AI Recruiter Copilot

## Included
- Company-only protected Copilot API under `/api/recruiter-copilot`.
- Candidate ranking using existing `jobMatchScore`, `atsScore`, skill coverage and experience breakdown.
- Natural-language recruiter chat powered by the project's existing Gemini integration, with a deterministic fallback when Gemini is unavailable.
- Top-candidate overview and quick actions.
- Candidate comparison endpoint.
- Tailored interview-question generation endpoint.
- Optional MongoDB conversation history through `RecruiterCopilotSession`.
- Professional responsive Copilot modal on Company Dashboard and Applications page.

## API
- `GET /api/recruiter-copilot/overview`
- `GET /api/recruiter-copilot/sessions`
- `GET /api/recruiter-copilot/top-candidates/:jobId`
- `POST /api/recruiter-copilot/chat`
- `POST /api/recruiter-copilot/compare`
- `POST /api/recruiter-copilot/interview-questions/:applicationId`

All endpoints require a valid company JWT.

## Recruiter score
The UI/API uses a transparent deterministic score before AI explanation:
- Job match: 50%
- ATS score: 20%
- Skill coverage: 20%
- Experience: 10%

AI is used for explanations and recruiter assistance rather than silently inventing candidate facts.

## Gemini
The feature reuses `GEMINI_API_KEY` and `GEMINI_MODEL` from the existing backend environment. No new AI provider is required.

## MongoDB
No changes are required to existing `JobApplication`, `JobPost`, or `User` documents. `RecruiterCopilotSession` is only used when a recruiter starts a Copilot conversation.
