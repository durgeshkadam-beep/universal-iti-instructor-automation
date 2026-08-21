# AI Workflow for Syllabus → Complete Training Plan

## The correct pipeline

```text
Official syllabus PDF/DOCX
        ↓
Document extraction / PDF text / OCR
        ↓
Gemini structured JSON
        ↓
Instructor review
        ↓ APPROVE
Universal syllabus database
        ↓
Deterministic calendar engine
        ↓
Annual plan / Split-up / Daily plan
        ↓
Demo plan + Theory/Lesson plan
        ↓
Reports
```

## AI should return structured JSON

The AI response should be validated before saving. Example:

```json
{
  "trade": "Electrician",
  "modules": [
    {
      "code": "M01",
      "name": "Safety",
      "hours": 24,
      "learningOutcomes": ["Apply basic electrical safety"],
      "practicals": [
        {"code":"P01","title":"Identify safety equipment","hours":3}
      ],
      "theory": [
        {"code":"T01","title":"Electrical safety principles","hours":2}
      ]
    }
  ]
}
```

The instructor must be able to edit the extracted result before it becomes official data.

## Demo plan generation

If the official syllabus provides demonstration-plan text, preserve it as the authoritative content.

Only ask AI to generate missing fields such as:
- Objective
- Tools/equipment
- Demonstration steps
- Questions
- Application/test
- Next demonstration

Mark AI-created content as **AI Draft** until the instructor approves it.

## Theory/Lesson plan generation

Use the same rule:

Official lesson-plan data → authoritative.
Missing content → AI draft → instructor approval.

## Calendar generation

Do not ask AI to decide dates. The application should calculate dates from:
- session start/end
- working days
- holidays
- hours/day
- module/topic hours
- teaching sequence

This prevents an AI response from accidentally creating impossible schedules.
