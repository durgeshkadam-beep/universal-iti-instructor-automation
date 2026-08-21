# AI architecture

### AI responsibilities
1. Read uploaded syllabus PDF/DOCX/Excel.
2. Extract trade, modules, units, practicals, theory, hours, sequence and learning outcomes.
3. Return strict structured JSON.
4. Draft demonstration plans for practical topics.
5. Draft theory/lesson plans for theory topics.
6. Explain ambiguities and request instructor approval.

### Deterministic responsibilities
1. Working-day calculation.
2. Holiday exclusion.
3. Hours-to-date allocation.
4. Week/month allocation.
5. Syllabus completion percentage.
6. Attendance calculations.
7. Evaluation totals.
8. Official report generation.

### Approval gate
AI Draft -> Instructor Review -> Approve -> Official Record.
AI must never silently overwrite an approved official record.
