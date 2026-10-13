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
  const email = 'pappurithu12@gmail.com';
  const fullName = 'Suba';
  const password = 'aeiou&1984';

  const { data: existing } = await supabase.from('users').select('*').ilike('email', email).maybeSingle();
  if (existing) {
    console.log('User already exists in DB:', existing);
    return;
  }

  const crypto = require('crypto');
  const newId = crypto.randomUUID();
  const { data: newUser, error } = await supabase.from('users').insert({
    id: newId,
    email: email,
    hashed_password: password,
    full_name: fullName,
    is_active: true
  }).select();

  console.log('Inserted Suba into users:', newUser, 'Error:', error);
}

run();
