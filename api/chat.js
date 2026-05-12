export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_KEY
  console.log('API Key starts with:', apiKey ? apiKey.substring(0, 15) : 'UNDEFINED')

  try {
    const { messages, system } = req.body

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system,
        messages
      })
    })

    const text = await response.text()
    console.log('Response:', text.substring(0, 200))
    const data = JSON.parse(text)
    const reply = data?.content?.[0]?.text || data?.error?.message || 'Sin respuesta'
    return res.status(200).json({ reply })
  } catch (error) {
    return res.status(500).json({ reply: 'Error: ' + error.message })
  }
}