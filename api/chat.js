export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages, system } = req.body

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system,
        messages
      })
    })

    const data = await response.json()
    const reply = data?.content?.[0]?.text || data?.error?.message || 'Sin respuesta'
    return res.status(200).json({ reply: String(reply) })
  } catch (error) {
    return res.status(500).json({ reply: 'Error: ' + error.message })
  }
}