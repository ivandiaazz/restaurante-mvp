// In-memory cache — persists while the serverless instance stays warm (best-effort)
// Client-side localStorage is the reliable cache; this is a secondary optimisation
const serverCache = new Map()

const LANG_NAMES = { EN: 'English', FR: 'French', DE: 'German' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { platos, idioma, restauranteId } = body ?? {}

    if (!platos?.length || !idioma) {
      return res.status(400).json({ error: 'Faltan campos: platos, idioma' })
    }

    // No-op: Spanish is the source language
    if (idioma === 'ES') return res.status(200).json({ traducidos: platos })

    const langName = LANG_NAMES[idioma]
    if (!langName) return res.status(400).json({ error: `Idioma no soportado: ${idioma}` })

    const apiKey = process.env.ANTHROPIC_KEY
    if (!apiKey) {
      console.error('[translate] ANTHROPIC_KEY no configurada')
      return res.status(500).json({ error: 'ANTHROPIC_KEY not configured' })
    }

    // Check server-side warm cache
    const cacheKey = `${restauranteId}_${idioma}`
    if (serverCache.has(cacheKey)) {
      console.log('[translate] server cache HIT:', cacheKey)
      return res.status(200).json({ traducidos: serverCache.get(cacheKey), fromCache: true })
    }

    // Build compact payload — only translate nombre + descripcion; alergenos stay in Spanish
    const platosSimples = platos.map(p => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
    }))

    const prompt = `You are a professional restaurant menu translator.
Translate the following dishes from Spanish to ${langName}.
Return ONLY a valid JSON array. Each object must have exactly the fields: id, nombre, descripcion.
Keep the "id" field unchanged (it is a UUID). Do not add explanations, markdown, or code fences.

Dishes to translate:
${JSON.stringify(platosSimples)}`

    console.log('[translate] calling Claude Haiku:', idioma, restauranteId, `${platosSimples.length} platos`)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[translate] Anthropic API error:', response.status, errText.slice(0, 300))
      return res.status(500).json({ error: `Anthropic error ${response.status}` })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    // Extract JSON array — Claude may wrap it in markdown code fences
    let traducidos
    try {
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('No JSON array found in response')
      traducidos = JSON.parse(match[0])
    } catch (parseErr) {
      console.error('[translate] JSON parse error:', parseErr.message)
      console.error('[translate] raw response:', text.slice(0, 400))
      return res.status(500).json({ error: 'Respuesta inválida del modelo' })
    }

    // Validate structure
    if (!Array.isArray(traducidos)) {
      return res.status(500).json({ error: 'La respuesta no es un array' })
    }

    serverCache.set(cacheKey, traducidos)
    console.log('[translate] OK:', idioma, restauranteId, `${traducidos.length} platos traducidos`)
    return res.status(200).json({ traducidos })

  } catch (err) {
    console.error('[translate] error no controlado:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
