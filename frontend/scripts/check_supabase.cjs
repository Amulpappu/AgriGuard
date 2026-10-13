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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function check() {
  const { data: bData, error: bErr } = await supabase.storage.createBucket('scan-images', { public: true });
  console.log('Create bucket scan-images result:', bData, 'Error:', bErr ? bErr.message : 'none');

  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('Current Buckets:', buckets ? buckets.map(b => b.name) : []);

  // Test inserting a dummy small base64 or testing scans table
  const testId = 'test_check_' + Date.now();
  const testDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  
  const { data: crops } = await supabase.from('crops').select('id').limit(1);
  const cropId = crops && crops[0] ? crops[0].id : null;

  if (cropId) {
    const { data: testIns, error: testErr } = await supabase.from('scans').insert({
      id: testId,
      user_id: 'dd23f951-ec3d-4bf3-a511-b30ef11d2c7d', // Lohith
      crop_id: cropId,
      image_url: testDataUrl,
      is_healthy: true,
      confidence: 0.99,
      status: 'healthy',
      severity: 'none',
      severity_pct: 0,
      model_version: 'test'
    }).select();
    console.log('Insert test with dataUrl error:', testErr ? testErr.message : 'SUCCESS!');
    
    // Clean up test row
    if (!testErr) {
      await supabase.from('scans').delete().eq('id', testId);
      console.log('Cleaned up test row.');
    }
  }
}

check();
