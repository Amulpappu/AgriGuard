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

async function cleanup() {
  console.log('--- Cleaning Up Demo Data from Supabase ---');

  // 1. Delete all scans belonging to demo user
  const { data: delDemoScans, error: errDemoScans } = await supabase
    .from('scans')
    .delete()
    .eq('user_id', DEMO_USER_ID)
    .select('id');
  console.log(`Deleted ${delDemoScans ? delDemoScans.length : 0} demo user scans. Error:`, errDemoScans ? errDemoScans.message : 'none');

  // 2. Delete any scans with demo image urls
  const { data: delImgDemo, error: errImgDemo } = await supabase
    .from('scans')
    .delete()
    .ilike('image_url', '%/demo%')
    .select('id');
  console.log(`Deleted ${delImgDemo ? delImgDemo.length : 0} legacy demo image scans. Error:`, errImgDemo ? errImgDemo.message : 'none');

  // 3. Delete demo user record from users table
  const { data: delUser, error: errUser } = await supabase
    .from('users')
    .delete()
    .eq('id', DEMO_USER_ID)
    .select('id, email');
  console.log(`Deleted demo user (${delUser ? delUser.length : 0} rows). Error:`, errUser ? errUser.message : 'none');

  // 4. Reassign anonymous scans (scans with user_id is null created by Lohith) to Lohith
  const { data: reassignScans, error: errReassign } = await supabase
    .from('scans')
    .update({ user_id: LOHITH_USER_ID })
    .is('user_id', null)
    .select('id');
  console.log(`Reassigned ${reassignScans ? reassignScans.length : 0} unassigned scans to Lohith (${LOHITH_USER_ID}). Error:`, errReassign ? errReassign.message : 'none');

  // 5. Query remaining scans in DB
  const { data: remainingScans, error: errRem } = await supabase
    .from('scans')
    .select('id, user_id, image_url, created_at, status');
  console.log('\nRemaining Scans in DB (Real Human Scans only):', remainingScans ? remainingScans.length : 0);
  if (remainingScans) {
    remainingScans.forEach((s, i) => {
      console.log(`[${i+1}] id=${s.id} user=${s.user_id} img=${s.image_url?.slice(0, 45)} created_at=${s.created_at}`);
    });
  }
}

cleanup();
