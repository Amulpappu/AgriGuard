# AgriGuard AI Safety & Decision-Support Guidelines

## 1. Ethical Mission Statement
Smallholder farmers in India risk devastating financial losses from crop failure or incorrect pesticide application. AgriGuard is **an AI-assisted screening and decision-support tool, NOT a guaranteed diagnosis or a prescription service**.

## 2. Hard Agronomic Safety Rules
1. **Zero Chemical Prescriptions:**
   - AgriGuard advisories **NEVER** recommend commercial pesticide/fungicide brand names (e.g., Mancozeb, Chlorothalonil, Carbendazim).
   - AgriGuard advisories **NEVER** specify chemical dosages (e.g., "apply 2 ml/L", "500 g/ha").
   - This rule is automated and protected by continuous integration tests (`tests/test_phase1.py::test_advisory_no_chemical_names`).
2. **Mandatory KVK Disclaimer:**
   - Every advisory concludes with mandatory guidance:
     > *"Consult your local agriculture officer or Krishi Vigyan Kendra (KVK) for treatment and dosage recommendations."*
3. **Explicit Uncertainty Handling:**
   - If model confidence falls below 55%, or if the top two predicted candidates are within 15% margin:
     - The disease name is **strictly withheld**.
     - The status is marked as `uncertain`.
     - The user is instructed: *"AI confidence is low. Please take another clear, well-lit photo of the affected leaf in daylight, or consult your nearest KVK officer."*
4. **Estimated Severity:**
   - Disease severity is always flagged with `is_estimate: true` and displayed with an "AI estimate" badge to avoid false precision.
5. **Contextual Environmental Telemetry:**
   - Ambient telemetry (temperature, humidity, soil moisture) is clearly presented as **environmental context** (e.g., *"High humidity favours fungal disease"*), and never presented as proof of infection.
