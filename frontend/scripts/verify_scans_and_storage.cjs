const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    env[k] = v;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const DEMO_USER_ID = '11264654-2ade-4424-8cb7-6ca9dc397c77';
const LOHITH_USER_ID = 'dd23f951-ec3d-4bf3-a511-b30ef11d2c7d';

async function verify() {
  console.log('=== VERIFYING DATABASE STATE & SCANS ===');

  // 1. Verify demo user is gone
  const { data: demoUser } = await supabase.from('users').select('id, email').eq('id', DEMO_USER_ID).maybeSingle();
  console.log('1. Demo user in DB:', demoUser ? 'STILL EXISTS (ERROR)' : 'NOT FOUND (CONFIRMED REMOVED)');

  // 2. Verify demo scans count
  const { count: demoScansCount } = await supabase.from('scans').select('id', { count: 'exact', head: true }).eq('user_id', DEMO_USER_ID);
  console.log('2. Demo scans in DB:', demoScansCount === 0 ? '0 (CONFIRMED ZERO DEMO SCANS)' : `${demoScansCount} found (ERROR)`);

  // 3. Test inserting a full base64 scan (simulating real scan creation)
  const testScanId = 'test_real_scan_' + Date.now();
  const sampleBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAEAAQBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  
  const { data: crops } = await supabase.from('crops').select('id').limit(1);
  const cropId = crops[0].id;

  const testRecord = {
    id: testScanId,
    user_id: LOHITH_USER_ID,
    crop_id: cropId,
    image_url: sampleBase64,
    thumb_url: sampleBase64,
    is_healthy: true,
    confidence: 0.98,
    top3: [{ disease_slug: 'test', confidence: 0.98 }],
    severity: 'none',
    severity_pct: 0,
    low_confidence: false,
    status: 'healthy',
    model_version: 'EdgeVision-v2.0',
    crop_auto_detected: true,
    condition_type: 'disease',
    created_at: new Date().toISOString()
  };

  const { error: insErr } = await supabase.from('scans').insert(testRecord);
  console.log('3. Real human scan insert test:', insErr ? `FAILED: ${insErr.message}` : 'SUCCESSFUL');

  // 4. Retrieve back the scan to verify persistence
  const { data: retrievedScan, error: getErr } = await supabase.from('scans').select('*').eq('id', testScanId).single();
  if (retrievedScan) {
    const hasImage = retrievedScan.image_url && retrievedScan.image_url.startsWith('data:image/');
    const isLohith = retrievedScan.user_id === LOHITH_USER_ID;
    console.log(`4. Retrieved scan test: user_id=${retrievedScan.user_id} (Matched Lohith: ${isLohith}), image_url length=${retrievedScan.image_url.length} (Valid Data URL: ${hasImage})`);
  } else {
    console.log('4. Retrieved scan test: FAILED', getErr);
  }

  // 5. Clean up test scan row
  await supabase.from('scans').delete().eq('id', testScanId);
  console.log('5. Test scan cleaned up.');

  // 6. List all human scans
  const { data: allHumanScans } = await supabase.from('scans').select('id, user_id, crop_id, created_at, status').order('created_at', { ascending: false });
  console.log(`\n6. Total Real Human Scans in DB: ${allHumanScans.length}`);
  allHumanScans.forEach((s, idx) => {
    console.log(`   [#${idx + 1}] ID: ${s.id.slice(0, 8)}... User: ${s.user_id} Created: ${s.created_at} Status: ${s.status}`);
  });
}

verify();
