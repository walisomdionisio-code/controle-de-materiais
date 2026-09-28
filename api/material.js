export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { editingId, payload } = req.body || {};
    if (!payload || !payload.nome || !payload.data_rito) {
      return res.status(400).json({ error: "Dados obrigatórios ausentes." });
    }

    const cfgResp = await fetch("https://jyocklhngsylbbghdsyy.supabase.co/functions/v1/controle-materiais-config", {
      headers: { "Accept": "application/json" }
    });

    if (!cfgResp.ok) {
      const txt = await cfgResp.text();
      return res.status(502).json({ error: "Falha ao obter configuração do Supabase.", detail: txt });
    }

    const cfg = await cfgResp.json();
    if (!cfg?.url || !cfg?.key) {
      return res.status(502).json({ error: "Configuração do Supabase incompleta." });
    }

    const isEdit = Boolean(editingId);
    const url = isEdit
      ? `${cfg.url}/rest/v1/controle_materiais?id=eq.${encodeURIComponent(editingId)}`
      : `${cfg.url}/rest/v1/controle_materiais`;

    const dbResp = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: {
        "apikey": cfg.key,
        "Authorization": `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(isEdit ? payload : [payload])
    });

    const raw = await dbResp.text();
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch {}

    if (!dbResp.ok) {
      return res.status(dbResp.status).json({
        error: parsed?.message || parsed?.error || "Falha ao salvar no Supabase.",
        detail: parsed || raw
      });
    }

    const row = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!row) {
      return res.status(502).json({ error: "O Supabase não retornou o registro salvo." });
    }

    return res.status(200).json({ data: row });
  } catch (err) {
    console.error("material-save", err);
    return res.status(500).json({ error: err?.message || "Erro interno ao salvar." });
  }
}
