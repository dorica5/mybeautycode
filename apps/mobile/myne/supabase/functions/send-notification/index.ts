import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN')
console.log("Edge function starting, Expo token exists:", !!EXPO_ACCESS_TOKEN);

serve(async (req) => {
  console.log("Received request method:", req.method);
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, x-client-info, apikey, content-type',
      }
      
    });
  }

  try {
    const body = await req.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));

    const { pushToken, title, message, data } = body;

    if (!pushToken) {
      throw new Error('Push token is required');
    }

    if (!EXPO_ACCESS_TOKEN) {
      throw new Error('EXPO_ACCESS_TOKEN is not configured');
    }

    const pushMessage = {
      to: pushToken,
      title,
      body: message,
      data: data || {},
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      _displayInForeground: true
    };

    console.log('Sending push message:', JSON.stringify(pushMessage, null, 2));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${EXPO_ACCESS_TOKEN}`
      },
      body: JSON.stringify(pushMessage),
    });

    const responseText = await response.text();
    console.log('Expo API response:', responseText);

    if (!response.ok) {
      throw new Error(`Expo push API error: ${response.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);
    
    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});