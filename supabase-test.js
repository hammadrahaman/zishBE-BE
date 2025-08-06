require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uibrvlpufjuchkalmirx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnJ2bHB1Zmp1Y2hrYWxtaXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDcxNDQsImV4cCI6MjA2OTk4MzE0NH0.UevwOvgIS17piaTNncZzgzL6P3jY1J4oLEYkFgUiSd0';

const supabase = createClient(supabaseUrl, supabaseKey);

const testSupabase = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test connection by fetching from a table
    const { data, error } = await supabase
      .from('feedback') // I can see you have a feedback table
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase API error:', error.message);
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('Tables accessible, sample data:', data);
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
};

testSupabase(); 