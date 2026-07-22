const allowed = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
})

const LANGUAGE_CODES = {
  'English': 'en',
  'Spanish': 'es',
  'French': 'fr',
  'German': 'de',
  'Italian': 'it',
  'Portuguese': 'pt',
  'Russian': 'ru',
  'Japanese': 'ja',
  'Korean': 'ko',
  'Chinese (Simplified)': 'zh-CN',
  'Chinese (Traditional)': 'zh-TW',
  'Arabic': 'ar',
  'Hindi': 'hi',
  'Dutch': 'nl',
  'Polish': 'pl',
  'Turkish': 'tr',
  'Vietnamese': 'vi',
  'Thai': 'th',
  'Indonesian': 'id',
  'Swedish': 'sv',
  'Norwegian': 'no',
  'Danish': 'da',
  'Finnish': 'fi',
  'Greek': 'el',
  'Hebrew': 'he',
  'Ukrainian': 'uk',
  'Czech': 'cs',
  'Romanian': 'ro',
  'Hungarian': 'hu',
}

export default async function handler(req, res) {
  Object.entries(allowed(req.headers.origin)).forEach(([k,v]) => res.setHeader(k,v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  try {
    const { text, targetLanguage } = req.body || {}
    console.log('Translation request received:', { 
      textLength: text?.length, 
      targetLanguage 
    })
    
    if (!text || typeof text !== 'string') {
      console.error('Missing or invalid text')
      return res.status(400).json({ error: 'Text is required for translation.' })
    }
    
    if (!targetLanguage || !LANGUAGE_CODES[targetLanguage]) {
      console.error('Invalid target language:', targetLanguage)
      return res.status(400).json({ error: 'Invalid target language.' })
    }
    
    const targetLangCode = LANGUAGE_CODES[targetLanguage]
    console.log('Target language code:', targetLangCode)
    
    // First try MyMemory Translation API
    let translatedText = null
    let serviceUsed = null
    
    try {
      console.log('Trying MyMemory API...')
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLangCode}`
      console.log('MyMemory URL:', myMemoryUrl)
      
      const myMemoryRes = await fetch(myMemoryUrl)
      const myMemoryData = await myMemoryRes.json()
      console.log('MyMemory response:', JSON.stringify(myMemoryData, null, 2))
      
      if (myMemoryData.responseStatus === 200 && myMemoryData.responseData?.translatedText) {
        translatedText = myMemoryData.responseData.translatedText
        serviceUsed = 'MyMemory'
      }
    } catch (myMemoryErr) {
      console.error('MyMemory failed:', myMemoryErr)
    }
    
    // If MyMemory didn't work, try a fallback (Lingva Translate - public instance)
    if (!translatedText) {
      try {
        console.log('Trying Lingva Translate (fallback)...')
        const lingvaRes = await fetch(`https://lingva.lunar.icu/api/v1/en/${targetLangCode}/${encodeURIComponent(text)}`)
        const lingvaData = await lingvaRes.json()
        console.log('Lingva response:', JSON.stringify(lingvaData, null, 2))
        
        if (lingvaData.translation) {
          translatedText = lingvaData.translation
          serviceUsed = 'Lingva'
        }
      } catch (lingvaErr) {
        console.error('Lingva failed:', lingvaErr)
      }
    }
    
    if (translatedText) {
      console.log('Translation successful using', serviceUsed)
      return res.status(200).json({ 
        translatedText,
        targetLanguage 
      })
    }
    
    throw new Error('All translation services failed. Please try again.')
  } catch (error) {
    console.error('Translation handler error:', error)
    return res.status(500).json({ error: error.message || 'Unable to translate text.' })
  }
}
