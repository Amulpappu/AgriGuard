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

async function run() {
  const { data: users, error: uErr } = await supabase.from('users').select('id, email, full_name, is_active');
  console.log('Users in DB:', users, uErr);

  const testUid = 'test_' + Date.now();
  const { data: testU, error: testUErr } = await supabase.from('users').insert({
    id: testUid,
    email: 'test_insert@agri.com',
    hashed_password: 'plain_or_hash',
    full_name: 'Test Farmer',
    is_active: true
  }).select();
  console.log('Insert into users result:', testU, 'Error:', testUErr ? testUErr.message : 'SUCCESS!');
  if (!testUErr) {
    await supabase.from('users').delete().eq('id', testUid);
  }

  const { data: scans, error } = await supabase.from('scans').select('id, user_id, crop_id, image_url, created_at, status');
  if (error) {
    console.error('Error fetching scans:', error);
    return;
  }
  console.log('Total scans in DB:', scans.length);
  scans.forEach((s, i) => {
    console.log(`[${i+1}] id=${s.id} user_id=${s.user_id} img=${s.image_url?.slice(0, 50)} created_at=${s.created_at}`);
  });
}

run();
