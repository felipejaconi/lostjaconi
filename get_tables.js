import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/`;
  const res = await fetch(url, { 
    headers: { 
        'Accept': 'application/openapi+json',
        'apikey': process.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
    }
  });
  const data = await res.json();
  console.log(Object.keys(data.definitions || {}));
}
check();
