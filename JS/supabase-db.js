(function setupSupabaseDb() {
  const cfg = (window.WR_CONFIG && window.WR_CONFIG.supabase) || {};
  const url = (cfg.url || '').trim();
  const anonKey = (cfg.anonKey || '').trim();

  let client = null;
  if (url && anonKey && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(url, anonKey);
  }

  async function upsertUser(user) {
    if (!client || !user || !user.email) return;

    const payload = {
      email: user.email,
      name: user.name,
      checks: user.checks || 0,
      words: user.words || 0,
      joined_at: user.joined || Date.now(),
      provider: user.provider || '',
      model: user.model || ''
    };

    const { error } = await client.from('wr_users').upsert(payload, { onConflict: 'email' });
    if (error) throw error;
  }

  async function getHistory(email) {
    if (!client || !email) return [];

    const { data, error } = await client
      .from('wr_history')
      .select('time,input_preview,full_input,output,mode')
      .eq('email', email)
      .order('time', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data || []).map((row) => ({
      time: row.time,
      inputPreview: row.input_preview,
      fullInput: row.full_input,
      output: row.output,
      mode: row.mode
    }));
  }

  async function saveHistory(email, item) {
    if (!client || !email || !item) return;

    const payload = {
      email,
      time: item.time,
      input_preview: item.inputPreview || '',
      full_input: item.fullInput || '',
      output: item.output || '',
      mode: item.mode || 'grammar'
    };

    const { error } = await client.from('wr_history').insert(payload);
    if (error) throw error;
  }

  window.WR_DB = {
    enabled: !!client,
    upsertUser,
    getHistory,
    saveHistory
  };
})();
