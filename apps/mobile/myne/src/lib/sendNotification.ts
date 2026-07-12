import { supabase } from "@/src/lib/supabase";

export const sendNotification = async (userId: string, message: string) => {
  try {
    const response = await fetch(
      'https://sbjlywvfxgufxxntggxu.supabase.co/functions/v1/sendNotification',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${((await supabase.auth.getSession()).data.session?.access_token)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          message: message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

