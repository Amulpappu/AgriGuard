import httpx

# Login
r = httpx.post('http://localhost:8000/api/v1/auth/login', json={'email':'demo@agriguard.in','password':'Demo1234!'})
token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}
print("LOGIN: OK")

# Get crops
crops = httpx.get('http://localhost:8000/api/v1/crops', headers=headers).json()
print(f"CROPS: {[c['slug'] for c in crops]}")

# Upload scan
tomato_id = [c for c in crops if c['slug']=='tomato'][0]['id']
with open('test_leaf.jpg','rb') as f:
    r2 = httpx.post('http://localhost:8000/api/v1/scans',
        headers=headers,
        data={'crop_id': tomato_id},
        files={'image': ('test_leaf.jpg', f, 'image/jpeg')}
    )

result = r2.json()
disease_slug = (result.get('disease') or {}).get('slug', 'none (uncertain)')
print(f"SCAN STATUS: {result['status']}")
print(f"CONFIDENCE: {result['confidence']:.2%}")
print(f"SEVERITY: {result['severity']['level']}")
print(f"DISEASE: {disease_slug}")
print(f"LOW CONFIDENCE: {result['low_confidence']}")
print(f"MODEL: {result['model_version']}")
scan_id = result['id']

# Verify scan appears in history
scans = httpx.get('http://localhost:8000/api/v1/scans?limit=5', headers=headers).json()
assert any(s['id'] == scan_id for s in scans), "Scan not in history!"
print(f"HISTORY: scan visible in list (total returned={len(scans)})")

# Dashboard
dash = httpx.get('http://localhost:8000/api/v1/dashboard/summary', headers=headers).json()
print(f"DASHBOARD: total={dash['total_scans']}, healthy={dash['healthy_count']}, affected={dash['affected_count']}, uncertain={dash['uncertain_count']}")

# Compare two scans
if len(scans) >= 2:
    compare = httpx.get(f"http://localhost:8000/api/v1/scans/compare?a={scans[0]['id']}&b={scans[1]['id']}", headers=headers).json()
    print(f"COMPARE: severity_delta={compare.get('severity_delta')}, status_change={compare['status_change']}")
else:
    print("COMPARE: skipped (need 2 scans)")

# Advisory
adv = httpx.get('http://localhost:8000/api/v1/advisory/tomato_early_blight?lang=en', headers=headers).json()
print(f"ADVISORY (en): {adv['name']}, {len(adv['symptoms'])} symptoms")
adv_ta = httpx.get('http://localhost:8000/api/v1/advisory/tomato_early_blight?lang=ta', headers=headers).json()
print(f"ADVISORY (ta): {adv_ta['name']}")

# Health
health = httpx.get('http://localhost:8000/api/v1/health').json()
print(f"HEALTH: {health}")

print("\nALL CHECKS PASSED!")
