import { createClient } from '@supabase/supabase-js'

const allowed = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
})

const toTranscript = (item) => {
  if (typeof item.fullText === 'string') return item.fullText
  if (typeof item.transcript === 'string') return item.transcript
  if (typeof item.text === 'string') return item.text
  if (Array.isArray(item.transcript)) return item.transcript.map(x => x.text || x.content || x.utterance || '').filter(Boolean).join('\n')
  if (Array.isArray(item.segments)) return item.segments.map(x => x.text || x.content || x.utterance || '').filter(Boolean).join('\n')
  if (Array.isArray(item.captions)) return item.captions.map(x => x.text || x.content || x.utterance || '').filter(Boolean).join('\n')
  // Also check for items directly
  if (Array.isArray(item) && item.length > 0) {
    return item.map(x => x.text || x.content || x.utterance || '').filter(Boolean).join('\n')
  }
  return ''
}

const chunkText = (text, maxChunkSize = 1000) => {
  const chunks = []
  let currentChunk = ''
  const sentences = text.split(/(?<=[.!?])\s+/) // Split by sentence endings

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).length <= maxChunkSize) {
      currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence
    } else {
      if (currentChunk) chunks.push(currentChunk)
      currentChunk = sentence.length > maxChunkSize ? sentence.slice(0, maxChunkSize) : sentence
    }
  }

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

const translateTextToEnglish = async (text) => {
  if (!text || typeof text !== 'string') return text
  
  console.log('Starting translation to English, text length:', text.length)
  
  const chunks = chunkText(text)
  console.log(`Split into ${chunks.length} chunks for translation`)
  
  const translatedChunks = []
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    console.log(`Translating chunk ${i+1}/${chunks.length}, length: ${chunk.length}`)
    
    let translatedChunk = null
    
    // Try MyMemory first
    try {
      const myMemoryRes = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=|en`
      )
      const myMemoryData = await myMemoryRes.json()
      if (myMemoryData.responseStatus === 200 && myMemoryData.responseData?.translatedText) {
        translatedChunk = myMemoryData.responseData.translatedText
        console.log(`Chunk ${i+1} translated with MyMemory`)
      }
    } catch (e) {
      console.error('MyMemory translation failed for chunk:', e)
    }
    
    // Try Lingva as fallback
    if (!translatedChunk) {
      try {
        const lingvaRes = await fetch(`https://lingva.lunar.icu/api/v1/auto/en/${encodeURIComponent(chunk)}`)
        const lingvaData = await lingvaRes.json()
        if (lingvaData.translation) {
          translatedChunk = lingvaData.translation
          console.log(`Chunk ${i+1} translated with Lingva`)
        }
      } catch (e) {
        console.error('Lingva translation failed for chunk:', e)
      }
    }
    
    translatedChunks.push(translatedChunk || chunk)
  }
  
  const finalTranslatedText = translatedChunks.join(' ')
  console.log('Translation completed, final length:', finalTranslatedText.length)
  
  return finalTranslatedText
}

const transcribeWithAssemblyAI = async (videoId) => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) {
    throw new Error('AssemblyAI API key is missing')
  }
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

  console.log('Starting AssemblyAI transcription for video:', videoId)

  // Submit transcription request - auto-detect language
  const submitResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'authorization': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: videoUrl,
      language_detection: true, // Auto-detect language
      auto_chapters: false
    })
  })

  if (!submitResponse.ok) {
    const error = await submitResponse.text()
    console.error('AssemblyAI submission error:', error)
    throw new Error(`AssemblyAI submission failed: ${error}`)
  }

  const { id } = await submitResponse.json()
  console.log('AssemblyAI job submitted, ID:', id)

  // Poll for completion - 3 seconds, 300 attempts (15 minutes max)
  let status = 'processing'
  let attempts = 0
  const maxAttempts = 300 // 15 minutes max for very long videos

  while ((status === 'processing' || status === 'queued') && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3 seconds
    attempts++

    console.log(`Checking AssemblyAI status (attempt ${attempts}/${maxAttempts}):`, status)

    const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { 'authorization': apiKey }
    })

    if (!statusResponse.ok) {
      throw new Error('Failed to check transcription status')
    }

    const result = await statusResponse.json()
    status = result.status

    if (status === 'completed') {
      console.log('AssemblyAI transcription completed!')
      // If not English, translate to English
      if (result.language && result.language !== 'en') {
        console.log(`Translating from ${result.language} to English`)
        return await translateTextToEnglish(result.text)
      }
      return result.text
    }

    if (status === 'error') {
      console.error('AssemblyAI transcription error:', result.error)
      throw new Error(result.error || 'Transcription failed')
    }
  }

  console.error('AssemblyAI transcription timed out after', attempts, 'attempts')
  throw new Error('Transcription timed out. This video may be too long.')
}

export default async function handler(req, res) {
  Object.entries(allowed(req.headers.origin)).forEach(([k,v]) => res.setHeader(k,v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Please sign in to generate a transcript.' })
    const { videoId } = req.body || {}
    console.log('Generating transcript for video ID:', videoId)
    if (!/^[\w-]{11}$/.test(videoId || '')) {
      console.error('Invalid video ID:', videoId)
      return res.status(400).json({ error: 'Invalid YouTube video ID.' })
    }

    // Credit system removed - unlimited access

    let transcript = ''
    let title = ''
    let channel = ''
    
    // Try Apify first for existing captions (any language)
    try {
      console.log('Trying Apify for existing captions...')
      const actor = process.env.APIFY_ACTOR_ID || 'automation-lab/youtube-transcript'
      const apify = await fetch(`https://api.apify.com/v2/acts/${encodeURIComponent(actor).replace('/', '~')}/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          urls: [`https://www.youtube.com/watch?v=${videoId}`],
          includeAutoGenerated: true,
          mergeSegments: true
        })
      })
      if (apify.ok) {
        const rows = await apify.json()
        console.log('Apify response:', JSON.stringify(rows, null, 2))
        const item = Array.isArray(rows) ? rows[0] : rows
        transcript = toTranscript(item || {})
        title = item?.title || item?.videoTitle || ''
        channel = item?.channel || item?.channelName || ''
        console.log('Transcript from Apify:', transcript ? 'Success' : 'Empty')

        // If we got a transcript, translate to English
        if (transcript) {
          try {
            console.log('Translating transcript to English...')
            transcript = await translateTextToEnglish(transcript)
          } catch (translateErr) {
            console.error('Failed to translate transcript, keeping original:', translateErr)
          }
        }
      } else {
        console.error('Apify request failed:', apify.status, apify.statusText)
        const errorText = await apify.text()
        console.error('Apify error details:', errorText)
      }
    } catch (e) {
      console.log('Apify failed, falling back to AssemblyAI:', e)
    }

    // Fallback to AssemblyAI if no transcript found
    if (!transcript) {
      try {
        console.log('Falling back to AssemblyAI...')
        transcript = await transcribeWithAssemblyAI(videoId)
        // Fetch video metadata
        console.log('Fetching video metadata from noembed...')
        const metadataResponse = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`)
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json()
          console.log('Noembed metadata:', metadata)
          title = metadata.title || ''
          channel = metadata.author_name || ''
        }
      } catch (e) {
        console.error('AssemblyAI transcription failed:', e)
        throw new Error(e.message || 'Unable to generate transcript for this video.')
      }
    }
    
    if (!transcript) throw new Error('No captions were available for this video.')
    console.log('Transcript generated successfully! Length:', transcript.length)
    const record = { user_id: user.id, video_id: videoId, title, channel, transcript }
    const { data, error } = await admin.from('transcripts').insert(record).select().single()
    if (error) throw error
    console.log('Transcript saved to database!')
    return res.status(200).json(data)
  } catch (error) {
    console.error('Error in generate-transcript handler:', error)
    return res.status(500).json({ error: error.message || 'Unable to create transcript.' })
  }
}
