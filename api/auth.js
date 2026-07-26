import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kowymzmrtowdesokhbcv.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvd3ltem1ydG93ZGVzb2toYmN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDYzOTU2OCwiZXhwIjoyMTAwMjE1NTY4fQ.MHCzWXpAv8Kcl-wCD5kc-Vfx274qOg-G0GU3_J8ejfw';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, email, password, pinCode } = req.body;

    if (action === 'login') {
      const { data: users, error } = await supabase
        .from('store_users')
        .select('*')
        .or(`email.eq.${email},pin_code.eq.${pinCode || email}`);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      if (!users || users.length === 0) {
        return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور/الرمز غير صحيح' });
      }

      const user = users[0];
      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token: `token-${user.id}-${Date.now()}`
      });
    }

    return res.status(400).json({ error: 'إجراء غير معروف' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
