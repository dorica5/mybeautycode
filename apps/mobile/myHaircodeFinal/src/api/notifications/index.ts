/*import { supabase } from "@/src/lib/supabase";
import * as Notifications from "expo-notifications";

export const savePushToken = async (userId: string) => {
    console.log("Saving push token...");
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") {
        return;
      }
    }
  
    try {
        console.log("Requesting push token...");
        const pushToken = (await Notifications.getExpoPushTokenAsync()).data;
        console.log("Push token fetched:", pushToken);
      } catch (error) {
        console.error("Error fetching push token:", error);
      }
      
  
    const { error } = await supabase
      .from("profiles")
      .update({ push_token: pushToken }) 
      .eq("id", userId);
  
    if (error) {
      console.error("Error saving push token:", error.message);
    }
  };

  
  export const sendNotification = async (userId: string, message: string) => {
    const response = await fetch("https://sbjlywvfxgufxxntggxu.supabase.co/functions/v1/sendNotification", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId, message }),
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error sending notification: ${error.message}`);
    }
  
    return response.json();
  };

export const createNotification = async (
    clientId: string | string[],
    hairdresserId: string,
    message: string,
) => {
    const { error } = await supabase.from("notifications").insert([
        {
            user_id: clientId,
            message: `${hairdresserId} is asking for your visit.`,
            read: false,
        },
    ]);

    if (error) {
        throw new Error(error.message);
    }
};



export const handleClientResponse = async (
    notificationId: string,
    accept: boolean,
) => {
    const { data: notification, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", notificationId)
        .single();

    if (error) {
        throw new Error(error.message);
    }

    if (accept) {
        const { error: relationshipError } = await supabase
            .from("hairdresser_clients")
            .insert({
                hairdresser_id: notification.hairdresser_id,
                client_id: notification.user_id,
            });

        if (relationshipError) {
            throw new Error(relationshipError.message);
        }
    }

    const { error: notificationError } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

    if (notificationError) {
        throw new Error(notificationError.message);
    }
};


export const saveNotificationToDatabase = async (notification: Notifications.Notification) => {
    const { title, body } = notification.request.content;

    const { error } = await supabase
        .from("notifications")
        .insert({ 
            user_id: "your-user-id", 
            title, 
            body 
        });

    if (error) {
        console.error("Error saving notification:", error);
    }
};



export const handleFriendRequest = async (
  senderId: string,
  recipientId: string,
  senderName: string,
  isHairdresser: boolean
) => {
  try {
    const message = isHairdresser
      ? `${senderName} wants to view your visits`
      : `${senderName} has been added to your clients`;

    await supabase.from('notifications').insert({
      user_id: recipientId,
      sender_id: senderId,
      message,
      type: 'FRIEND_REQUEST',
      read: false,
    });

    if (!isHairdresser) {
      await supabase.from('hairdresser_clients').insert({
        hairdresser_id: recipientId,
        client_id: senderId,
      });
    }
  } catch (error) {
    console.error('Error handling friend request:', error);
  }
};

export const acceptFriendRequest = async (
  notificationId: string,
  hairdresserId: string,
  clientId: string
) => {
  try {
    await supabase.from('hairdresser_clients').insert({
      hairdresser_id: hairdresserId,
      client_id: clientId,
    });

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    return true;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return false;
  }
};

export const shareInspiration = async (
  senderId: string,
  recipientId: string,
  senderName: string,
  imageUrl: string
) => {
  try {
    await supabase.from('notifications').insert({
      user_id: recipientId,
      sender_id: senderId,
      message: `${senderName} shared inspiration with you`,
      type: 'INSPIRATION_SHARED',
      image_url: imageUrl,
      read: false,
    });

    await supabase.from('shared_inspiration').insert({
      sender_id: senderId,
      recipient_id: recipientId,
      image_url: imageUrl,
    });
  } catch (error) {
    console.error('Error sharing inspiration:', error);
  }
};
*/

