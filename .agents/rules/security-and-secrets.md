# Security and Secrets Prevention Rule

## Directive
1. **Zero Secret Leakage:**
   - Never print database passwords, Supabase service role keys, API tokens, or private keys to chat responses or terminal standard output.
2. **Environment File Quarantine:**
   - Verify that `.env`, `.env.local`, and `*.pem` are listed in `.gitignore`.
   - Use `.env.example` to document required variable keys without sensitive values.
3. **Public vs Private API Keys:**
   - Only client-safe publishable keys (e.g. `NEXT_PUBLIC_SUPABASE_ANON_KEY`) may be bundled into frontend client applications.
   - Privileged administrative keys (e.g. `SUPABASE_SERVICE_ROLE_KEY` or `SECRET_KEY`) must remain strictly on server-side runtimes.
4. **Input Sanitization:**
   - Validate and sanitize all user-supplied input strings, image uploads, and sensor parameters against Pydantic schema constraints.
