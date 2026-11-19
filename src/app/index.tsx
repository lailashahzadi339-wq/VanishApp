import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JoinClassScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [relayAddress, setRelayAddress] = useState('');
  const [classCode, setClassCode] = useState('cs2024');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function createDeviceId() {
      try {
        const existingId = await AsyncStorage.getItem('vanish_device_id');

        if (!existingId) {
          const newId = Crypto.randomUUID();
          await AsyncStorage.setItem('vanish_device_id', newId);
        }
      } catch (error) {
        console.log('Device ID error:', error);
      }
    }

    createDeviceId();
  }, []);

  async function handleConnect() {
    Keyboard.dismiss();

    const cleanName = name.trim();
    const cleanAddress = relayAddress.trim().replace(/\/+$/, '');
    const cleanCode = classCode.trim();

    if (!cleanName || !cleanAddress || !cleanCode) {
      Alert.alert(
        'Missing Information',
        'Please enter your name, relay address, and class code.'
      );
      return;
    }

    if (cleanName.length > 24) {
      Alert.alert(
        'Name Too Long',
        'Your name must not exceed 24 characters.'
      );
      return;
    }

    try {
      const parsedAddress = new URL(cleanAddress);

      if (
        parsedAddress.protocol !== 'ws:' &&
        parsedAddress.protocol !== 'wss:'
      ) {
        throw new Error('Invalid protocol');
      }
    } catch {
      Alert.alert(
        'Invalid Relay Address',
        'Enter a valid WebSocket address beginning with ws:// or wss://.'
      );
      return;
    }

    setLoading(true);

    try {
      let deviceId = await AsyncStorage.getItem('vanish_device_id');

      if (!deviceId) {
        deviceId = Crypto.randomUUID();
        await AsyncStorage.setItem('vanish_device_id', deviceId);
      }

      router.push({
        pathname: '/chat',
        params: {
          name: cleanName,
          relayAddress: cleanAddress,
          classCode: cleanCode,
          deviceId: deviceId,
        },
      });
    } catch (error) {
      Alert.alert(
        'Connection Failed',
        error instanceof Error
          ? error.message
          : 'Could not prepare your connection.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topLabel}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <Text style={styles.appName}>VANISH</Text>
          <Text style={styles.version}>CLASS MESSAGING NETWORK</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YOUR PRIVACY, YOUR CONTROL</Text>
          <Text style={styles.heroTitle}>
            Your class.{'\n'}Your space.
          </Text>
          <Text style={styles.heroDescription}>
            Connect with classmates and share messages that disappear
            30 seconds after delivery.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Join your class</Text>
          <Text style={styles.description}>
            Enter your details to securely connect.
          </Text>

          <Text style={styles.label}>YOUR NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#8495AE"
            value={name}
            onChangeText={setName}
            maxLength={24}
            autoCapitalize="words"
          />

          <Text style={styles.label}>RELAY ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="wss://your-relay-address"
            placeholderTextColor="#8495AE"
            value={relayAddress}
            onChangeText={setRelayAddress}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={styles.label}>CLASS CODE</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your class code"
            placeholderTextColor="#8495AE"
            value={classCode}
            onChangeText={setClassCode}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={50}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleConnect}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Preparing...' : 'Connect to Class  →'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.privacyRow}>
          <Text style={styles.privacyIcon}>✦</Text>
          <Text style={styles.privacyText}>
            Messages disappear 30 seconds after delivery.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1426',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 28,
  },
  topLabel: {
    alignItems: 'center',
    marginBottom: 34,
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: '#1769AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 5,
  },
  version: {
    color: '#7794B9',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 5,
  },
  hero: {
    marginBottom: 25,
  },
  eyebrow: {
    color: '#42A5F5',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
    lineHeight: 43,
  },
  heroDescription: {
    color: '#9BAFC9',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#15243B',
    borderRadius: 22,
    padding: 21,
    borderWidth: 1,
    borderColor: '#263B59',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: 'bold',
  },
  description: {
    color: '#91A6C2',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 25,
  },
  label: {
    color: '#AFC4E0',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 9,
  },
  input: {
    height: 51,
    borderWidth: 1,
    borderColor: '#304763',
    borderRadius: 11,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 19,
    backgroundColor: '#0F1C30',
  },
  button: {
    height: 54,
    backgroundColor: '#2585E8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },
  privacyIcon: {
    color: '#42A5F5',
    fontSize: 16,
    marginRight: 8,
  },
  privacyText: {
    color: '#8299B8',
    fontSize: 11,
    textAlign: 'center',
  },
});