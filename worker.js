// Cloudflare Worker to proxy requests to OpenAI API

// Define the configuration
const BOT_ID = 'bot-20250301110252-phnr8';
const SYSTEM_PROMPT = '#角色名称：智慧教师';
const OPENAI_API_KEY = '3654c0c8-acfd-469e-a1a4-eca3a9a95a5e'; // Replace with your actual OpenAI API key

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://your-cloudflare-pages-url.pages.dev', // Replace with your Cloudflare Pages URL
  'http://localhost:8787' // For local development
];

// Helper to handle CORS preflight requests
function handleCORS(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  return null;
}

// Helper to validate the API key in the request
function validateAPIKey(request) {
  const authHeader = request.headers.get('Authorization') || '';
  const providedKey = authHeader.replace('Bearer ', '');
  
  // Check if the API key matches the expected key
  // In a production environment, you would use a more secure method
  if (providedKey !== '3654c0c8-acfd-469e-a1a4-eca3a9a95a5e') {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  return null;
}

// Main event handler for the worker
async function handleRequest(request) {
  // Handle CORS
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;
  
  // Get origin for CORS header
  const origin = request.headers.get('Origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  // Validate the API key
  const authResponse = validateAPIKey(request);
  if (authResponse) return authResponse;
  
  try {
    // Only handle POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        }
      });
    }
    
    // Parse the request body
    const requestData = await request.json();
    
    // Prepare messages with system prompt
    let messages = requestData.messages || [];
    let hasSystemMessage = false;
    
    // Check if there's already a system message
    for (const msg of messages) {
      if (msg.role === 'system') {
        hasSystemMessage = true;
        break;
      }
    }
    
    // If no system message, prepend it
    if (!hasSystemMessage) {
      messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
    }
    
    // Make the request to OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: BOT_ID,
        messages: messages,
        temperature: requestData.temperature || 0.7,
        max_tokens: requestData.max_tokens || 2000
      })
    });
    
    // Check if OpenAI response is OK
    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      return new Response(JSON.stringify({ error: 'OpenAI API error', details: errorData }), {
        status: openaiResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        }
      });
    }
    
    // Return the OpenAI response
    const responseData = await openaiResponse.json();
    
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: responseData.choices[0].message.content
        }
      }]
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin
      }
    });
    
  } catch (error) {
    // Handle any errors
    return new Response(JSON.stringify({ error: `Worker error: ${error.message}` }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin
      }
    });
  }
}

// Register the worker event listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
}); 