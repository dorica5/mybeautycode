// app/support.tsx (or wherever your pages go)
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { sendSupportRequest } from '../api/support';
import { router } from 'expo-router';

export default function SupportPage() {
  const { profile, userStatus } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setLoading(true);
    try {
      await sendSupportRequest({
        subject: userStatus?.is_banned ? 'Account Ban Appeal' : 'Account Restriction Appeal',
        message: message.trim(),
        status: 'open',
        priority: userStatus?.is_banned ? 'high' : 'medium'
      });

      Alert.alert(
        'Support Request Sent',
        'Your message has been sent to our support team. We will review your case and respond as soon as possible.',
        [
          {
            text: 'OK',
            onPress: () => {
              setMessage('');
              if (userStatus?.is_banned) {
                router.replace('/Splash');
              } else {
                router.back();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error sending support request:', error);
      Alert.alert('Error', 'Failed to send support request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openEmailSupport = () => {
    const subject = userStatus?.is_banned ? 'Account Ban Appeal' : 'Account Support Request';
    const body = `User ID: ${profile?.id}\nUser: ${profile?.full_name}\nEmail: ${profile?.email}\n\nMessage: `;
    
    Linking.openURL(`mailto:support@myhaircode.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contact Support</Text>
      
      {userStatus?.is_banned && (
        <View style={styles.banNotice}>
          <Text style={styles.banTitle}>Account Suspended</Text>
          <Text style={styles.banText}>
            Your account has been suspended. {userStatus.ban_reason ? `Reason: ${userStatus.ban_reason}` : ''}
          </Text>
          <Text style={styles.banText}>
            Use this form to appeal the decision or contact our support team.
          </Text>
        </View>
      )}

      {userStatus?.is_restricted && (
        <View style={styles.restrictionNotice}>
          <Text style={styles.restrictionTitle}>Account Temporarily Restricted</Text>
          <Text style={styles.restrictionText}>
            Your account is temporarily restricted until {userStatus.restriction_end ? new Date(userStatus.restriction_end).toLocaleDateString() : 'further notice'}.
          </Text>
          <Text style={styles.restrictionText}>
            Contact support if you believe this is an error.
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <Text style={styles.label}>Your Message:</Text>
        <TextInput
          style={styles.textArea}
          value={message}
          onChangeText={setMessage}
          placeholder="Please describe your issue or appeal..."
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Sending...' : 'Send Support Request'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.emailButton} 
          onPress={openEmailSupport}
        >
          <Text style={styles.emailButtonText}>
            Or Email Support Directly
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>Support Information</Text>
        <Text style={styles.infoText}>• Response time: 1-3 business days</Text>
        <Text style={styles.infoText}>• Email: support@myhaircode.com</Text>
        <Text style={styles.infoText}>• Include your user ID: {profile?.id?.substring(0, 8)}...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter-Bold",
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  banNotice: {
    backgroundColor: '#fee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#e53e3e',
  },
  banTitle: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    color: '#c53030',
    marginBottom: 8,
  },
  banText: {
    color: '#c53030',
    lineHeight: 20,
  },
  restrictionNotice: {
    backgroundColor: '#fff8e1',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff8f00',
  },
  restrictionTitle: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    color: '#ef6c00',
    marginBottom: 8,
  },
  restrictionText: {
    color: '#ef6c00',
    lineHeight: 20,
  },
  form: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    marginBottom: 8,
    color: '#333',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 120,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#22c55e',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: "Inter-Bold",
  },
  emailButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  emailButtonText: {
    color: '#22c55e',
    fontSize: 16,
    fontFamily: "Inter-Bold",
  },
  info: {
    backgroundColor: '#f0f9ff',
    padding: 15,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    marginBottom: 10,
    color: '#0369a1',
  },
  infoText: {
    color: '#0369a1',
    marginBottom: 5,
    lineHeight: 20,
  },
});