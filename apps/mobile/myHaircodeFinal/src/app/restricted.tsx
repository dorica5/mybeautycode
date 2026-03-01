// app/restricted.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { router } from 'expo-router';

export default function RestrictedPage() {
  const { userStatus, profile, signOut } = useAuth();

  const getTimeRemaining = () => {
    if (!userStatus?.restriction_end) return 'unknown time';
    
    const endDate = new Date(userStatus.restriction_end);
    const now = new Date();
    const timeDiff = endDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) return 'restriction should be lifted (please restart app)';
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⏳</Text>
      </View>

      <Text style={styles.title}>Account Temporarily Restricted</Text>
      
      <View style={styles.messageContainer}>
        <Text style={styles.message}>
          Your account access has been temporarily limited due to policy violations.
        </Text>
        
        <Text style={styles.timeInfo}>
          Time remaining: {getTimeRemaining()}
        </Text>
        
        <Text style={styles.details}>
          During this time, you have limited access to app features. Your full access will be restored automatically when the restriction period ends.
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.supportButton} 
          onPress={() => router.push('/support')}
        >
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={signOut}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>What this means:</Text>
        <Text style={styles.infoText}>• Limited access to core app features</Text>
        <Text style={styles.infoText}>• Cannot create new bookings or appointments</Text>
        <Text style={styles.infoText}>• Cannot send messages to other users</Text>
        <Text style={styles.infoText}>• Restriction will lift automatically</Text>
      </View>

      <Text style={styles.appealText}>
        Believe this is an error? Contact our support team for review.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter-Bold",
    textAlign: 'center',
    marginBottom: 20,
    color: '#ef6c00',
  },
  messageContainer: {
    backgroundColor: '#fff8e1',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#ff8f00',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
    lineHeight: 22,
  },
  timeInfo: {
    fontSize: 18,
    fontFamily: "Inter-Bold",
    textAlign: 'center',
    marginBottom: 15,
    color: '#ef6c00',
  },
  details: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  actionsContainer: {
    width: '100%',
    marginBottom: 30,
  },
  supportButton: {
    backgroundColor: '#22c55e',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: "Inter-Bold",
  },
  signOutButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  signOutButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontFamily: "Inter-Bold",
  },
  infoContainer: {
    backgroundColor: '#f0f9ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
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
  appealText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});