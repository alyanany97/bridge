import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { useAppStore } from '@/stores/appStore';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const { setUser, setAuthenticated } = useAppStore();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      const user = userCredential.user;
      setUser({
        uid: user.uid,
        name: user.displayName || 'User',
        email: user.email || '',
        role: 'helper',
        stats: {
          itemsPosted: 0,
          itemsClaimed: 0,
          deliveriesCompleted: 0,
          rating: 0,
        },
      });
      setAuthenticated(true);
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Auth Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="title" style={styles.title}>
            Bridge
          </ThemedText>
          <ThemedText type="subtitle" style={styles.subtitle}>
            Connect. Donate. Deliver.
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TouchableOpacity
              style={styles.input}
              onPress={() => {}}
              activeOpacity={1}
            >
              <ThemedText
                selectable
                style={[styles.inputText, { color: email ? '#000' : '#999' }]}
              >
                {email || 'Enter your email'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <TouchableOpacity
              style={styles.input}
              onPress={() => {}}
              activeOpacity={1}
            >
              <ThemedText style={[styles.inputText, { color: password ? '#000' : '#999' }]}>
                {'•'.repeat(password.length) || 'Enter password'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <ThemedText style={styles.toggleText}>
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <ThemedText type="small" style={styles.footerText}>
            Your privacy is protected. No phone sharing during pickups.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  inputText: {
    fontSize: 16,
  },
  button: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleText: {
    textAlign: 'center',
    color: '#16A34A',
    marginTop: 16,
  },
  footer: {
    marginTop: 40,
  },
  footerText: {
    textAlign: 'center',
    opacity: 0.6,
  },
});
