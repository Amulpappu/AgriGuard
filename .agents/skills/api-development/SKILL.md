---
name: api-development
description: >-
  Designs, implements, and tests robust REST APIs using FastAPI, Pydantic v2,
  and SQLAlchemy async engines. Use when creating endpoints or data contracts.
---

# API Development Skill

## When to Use It
Activate this skill when creating new API endpoints, modifying request/response schemas, integrating authentication middleware, or adding database queries.

## Prerequisites
- FastAPI backend configured in `backend/app/`.
- Pydantic v2 schemas in `backend/app/schemas/`.

## Step-by-Step Procedure
1. **Define Schema Contract:**
   - Define strict input and output schemas in `app/schemas/schemas.py`.
   - Specify boundary constraints (e.g. `ge`, `le`, `max_length`).
2. **Implement Endpoint:**
   - Add router function with explicit dependency injection (`Depends(get_db)`).
   - Use async session operations (`select`, `execute`, `scalars`).
3. **Error Handling:**
   - Raise `HTTPException` with structured details (`{"code": str, "message": str}`).
4. **Integration & Documentation:**
   - Register router in `app/main.py`.
   - Verify OpenAPI docs generated at `/docs`.
5. **Automated Testing:**
   - Write unit test in `backend/tests/` asserting status codes, payloads, and validation rejections.

## Verification Checklist
- [ ] Endpoints validate query parameters, paths, and body payloads.
- [ ] Database transactions commit and rollback cleanly.
- [ ] Corresponding pytest test cases pass cleanly.

## Failure Recovery
- If database sessions fail, check whether sessions are awaited properly (`await session.commit()`).

## Safety Constraints
- Protect sensitive endpoints with authentication guards (`Depends(get_current_user)`).
