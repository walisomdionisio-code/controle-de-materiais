const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) return response;
      lastError = new Error("HTTP " + response.status);
    } catch (err) {
      lastError = err;
    }
    if (i < attempts) await wait(500 * i);
  }
  throw lastError || new Error("Falha de comunicação.");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { editingId, payload } = body;

    if (!payload || !payload.nome || !payload.data_rito) {
      return res.status(400).json({ error: "Dados obrigatórios ausentes." });
    }

    const cfgResp = await fetchWithRetry(
      "https://jyocklhngsylbbghdsyy.supabase.co/functions/v1/controle-materiais-config",
      { headers: { "Accept": "application/json" } },
      3
    );

    if (!cfgResp.ok) {
      return res.status(502).json({ error: "A configuração do banco está temporariamente indisponível." });
    }

    const cfg = await cfgResp.json();
    if (!cfg?.url || !cfg?.key) {
      return res.status(502).json({ error: "Configuração do banco incompleta." });
    }

    const isEdit = Boolean(editingId);
    const url = isEdit
      ? cfg.url + "/rest/v1/controle_materiais?id=eq." + encodeURIComponent(editingId)
      : cfg.url + "/rest/v1/controle_materiais";

    const dbResp = await fetchWithRetry(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: {
        "apikey": cfg.key,
        "Authorization": "Bearer " + cfg.key,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(isEdit ? payload : [payload])
    }, 3);

    const raw = await dbResp.text();
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch {}

    if (!dbResp.ok) {
      return res.status(dbResp.status).json({
        error: parsed?.message || parsed?.error || "Falha ao salvar no banco."
      });
    }

    const row = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!row) {
      return res.status(502).json({ error: "O banco não retornou o registro salvo." });
    }

    return res.status(200).json({ data: row });
  } catch (err) {
    console.error("material-save", err);
    return res.status(500).json({
      error: "O servidor não conseguiu concluir o salvamento agora.",
      detail: err?.message || "Erro interno."
    });
  }
}
