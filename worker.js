// Cloudflare Worker to proxy requests to DeepSeek API

// Define the configuration
const API_BASE_URL = API_BASE_URL || 'https://api.deepseek.com';
const API_KEY = CLIENT_API_KEY;
const MODEL = MODEL;
const SYSTEM_PROMPT = '';

// Allowed origins for CORS - temporarily allow all origins for development
const ALLOWED_ORIGINS = ['*'];

// Helper to handle CORS preflight requests
function handleCORS(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = origin || '*';
  
  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
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
  
  // Check if the API key matches the expected key from environment variable
  if (providedKey !== CLIENT_API_KEY) {
    return new Response(JSON.stringify({ 
      error: 'Invalid API key',
      message: 'Please provide a valid API key in the Authorization header'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  return null;
}

// Helper to handle GET requests
function handleGET(request) {
  const url = new URL(request.url);
  
  // If it's the root path, return a helpful message
  if (url.pathname === '/') {
    return new Response(JSON.stringify({
      message: 'Welcome to the ARK DS API',
      status: 'running',
      documentation: 'This API accepts POST requests with an Authorization header containing a Bearer token.',
      example: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 3654c0c8-acfd-469e-a1a4-eca3a9a95a5e'
        },
        body: {
          messages: [
            { role: 'user', content: 'Hello!' }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  // For any other GET request, return 404
  return new Response(JSON.stringify({ 
    error: 'Not Found',
    message: 'This endpoint only accepts POST requests'
  }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Main event handler for the worker
async function handleRequest(request) {
  try {
    // Handle CORS
    const corsResponse = handleCORS(request);
    if (corsResponse) return corsResponse;
    
    // Get origin for CORS header
    const origin = request.headers.get('Origin');
    const allowedOrigin = origin || '*';
    
    // Handle GET requests
    if (request.method === 'GET') {
      return handleGET(request);
    }
    
    // For POST requests, validate the API key
    const authResponse = validateAPIKey(request);
    if (authResponse) return authResponse;
    
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
    
    // Make the request to DeepSeek API
    const apiResponse = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: requestData.temperature || 0.7,
        max_tokens: requestData.max_tokens || 2000
      })
    });
    
    // Check if API response is OK
    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      console.error('API Error:', errorData); // Add logging
      return new Response(JSON.stringify({ 
        error: 'API error', 
        details: errorData,
        message: 'Failed to get response from API',
        status: apiResponse.status,
        url: `${API_BASE_URL}/v1/chat/completions`
      }), {
        status: apiResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        }
      });
    }
    
    // Return the API response
    const responseData = await apiResponse.json();
    
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
    console.error('Worker Error:', error); // Add logging
    return new Response(JSON.stringify({ 
      error: 'Worker error',
      message: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Register the worker event listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
}); 
