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
        'x-api-key': process.env.VITE_ANTHROPIC_KEY,
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
    console.log('Anthropic response:', text)
    const data = JSON.parse(text)
    return res.status(200).json(data)
  } catch (error) {
    console.error('Error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}