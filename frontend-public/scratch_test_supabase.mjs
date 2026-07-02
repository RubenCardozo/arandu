import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ulzvqnphawocufhqyfet.supabase.co';
const supabaseKey = 'sb_publishable_AzXWXv2I5HzBX_-U3LIRiw_Yx-Eiz2X';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log('Testing Supabase query...');
  try {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(6);

    if (error) {
      console.error('Supabase Error:', error);
    } else {
      console.log('Successfully retrieved data count:', data ? data.length : 0);
      console.log('Sample data:', JSON.stringify(data?.[0], null, 2));
    }
  } catch (err) {
    console.error('Unexpected Exception:', err);
  }
}

testQuery();
