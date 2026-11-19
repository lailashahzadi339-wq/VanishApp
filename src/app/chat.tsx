
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Message = {
  id: string;
  text: string;
  sender: string;
  mine: boolean;
  expiresAt?: number;
  deliveryStatus?: 'pending' | 'delivered' | 'dropped';
};

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    name?: string;
    relayAddress?: string;
    classCode?: string;
    deviceId?: string;
  }>();

  const name = params.name ?? '';
  const relayAddress = params.relayAddress ?? '';
  const classCode = params.classCode ?? '';
  const deviceId = params.deviceId ?? '';

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [membersVisible, setMembersVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowReconnectRef = useRef(true);
  const joinedRef = useRef(false);

  function parseServerTime(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return value < 1000000000000 ? value * 1000 : value;
    }

    if (typeof value === 'string') {
      const numeric = Number(value);

      if (value.trim() !== '' && Number.isFinite(numeric)) {
        return numeric < 1000000000000 ? numeric * 1000 : numeric;
      }

      const parsed = Date.parse(value);

      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  function sendPacket(
    socket: WebSocket,
    type: string,
    payload: object
  ) {
    if (socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(
      JSON.stringify({
        version: '1.0',
        type,
        payload,
      })
    );

    return true;
  }

  useEffect(() => {
    if (!relayAddress || !classCode || !deviceId) {
      Alert.alert(
        'Connection Error',
        'Connection details are missing. Please join the class again.'
      );
      return;
    }

    let active = true;
    allowReconnectRef.current = true;

    function clearHeartbeat() {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    }

    function connect() {
      if (!active || !allowReconnectRef.current) {
        return;
      }

      try {
        setConnected(false);
        joinedRef.current = false;

        console.log('Connecting to VANISH relay:', relayAddress);

        const socket = new WebSocket(relayAddress);
        socketRef.current = socket;

        socket.onopen = () => {
          if (!active) {
            socket.close();
            return;
          }

          console.log('WebSocket opened. Joining class...');

          sendPacket(socket, 'JOIN', {
            device_id: deviceId,
            display_name: name || 'Student',
            room_code: classCode,
          });
        };

        socket.onmessage = (event) => {
          if (!active) {
            return;
          }

          try {
            const packet = JSON.parse(String(event.data));
            const payload = packet.payload ?? {};

            switch (packet.type) {
              case 'JOIN_ACK': {
                if (payload.ok === true) {
                  joinedRef.current = true;
                  setConnected(true);
                  setOnlineCount(Number(payload.online_count ?? 0));

                  console.log('Successfully joined VANISH class.');

                  clearHeartbeat();

                  heartbeatRef.current = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                      sendPacket(socket, 'HEARTBEAT', {
                        client_time: Date.now(),
                      });
                    }
                  }, 15000);
                } else {
                  joinedRef.current = false;
                  allowReconnectRef.current = false;
                  setConnected(false);

                  Alert.alert(
                    'Unable to Join',
                    payload.error === 'invalid_room_code'
                      ? 'The room code is incorrect.'
                      : `Could not join the class: ${payload.error ?? 'Unknown error'}`
                  );

                  socket.close();
                }

                break;
              }

              case 'HEARTBEAT_ACK': {
                setOnlineCount(Number(payload.online_count ?? 0));
                break;
              }

              case 'MESSAGE_DELIVER': {
                if (payload.device_id === deviceId) {
                  break;
                }

                const expiry =
                  parseServerTime(payload.expires_at) ??
                  Date.now() + 30000;

                if (expiry <= Date.now()) {
                  break;
                }

                const incomingMessage: Message = {
                  id: String(payload.id),
                  text: String(payload.text ?? ''),
                  sender: String(payload.sender ?? 'Classmate'),
                  mine: false,
                  expiresAt: expiry,
                  deliveryStatus: 'delivered',
                };

                setMessages(previous => {
                  if (previous.some(item => item.id === incomingMessage.id)) {
                    return previous;
                  }

                  return [incomingMessage, ...previous];
                });

                break;
              }

              case 'DELIVERY_ACK': {
                console.log('Delivery acknowledgement:', payload);

                const messageId = String(payload.message_id ?? '');

                if (payload.status === 'DELIVERED') {
                  const expiry = parseServerTime(payload.expires_at);

                  setMessages(previous =>
                    previous.map(item =>
                      item.id === messageId
                        ? {
                            ...item,
                            deliveryStatus: 'delivered',
                            expiresAt: expiry ?? Date.now() + 30000,
                          }
                        : item
                    )
                  );
                } else if (payload.status === 'DROPPED') {
                  setMessages(previous =>
                    previous.map(item =>
                      item.id === messageId
                        ? { ...item, deliveryStatus: 'dropped' }
                        : item
                    )
                  );
                }

                break;
              }

              case 'MESSAGE_EXPIRED': {
                const messageId = String(payload.message_id ?? '');

                setMessages(previous =>
                  previous.filter(item => item.id !== messageId)
                );

                break;
              }

              case 'DISCONNECT': {
                console.log(
                  'Relay disconnected:',
                  payload.reason ?? 'No reason provided'
                );
                break;
              }

              default:
                console.log('Unknown relay packet:', packet.type);
            }
          } catch (error) {
            console.log('Packet error:', error);
          }
        };

        socket.onerror = (error) => {
          console.log('WebSocket error:', error);
        };

        socket.onclose = () => {
          if (socketRef.current === socket) {
            socketRef.current = null;
          }

          joinedRef.current = false;
          clearHeartbeat();

          if (!active) {
            return;
          }

          setConnected(false);
          console.log('Relay connection closed.');

          if (allowReconnectRef.current) {
            reconnectRef.current = setTimeout(connect, 3000);
          }
        };
      } catch (error) {
        console.log('Connection error:', error);

        if (active && allowReconnectRef.current) {
          reconnectRef.current = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    return () => {
      active = false;
      allowReconnectRef.current = false;
      joinedRef.current = false;

      clearHeartbeat();

      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }

      const socket = socketRef.current;
      socketRef.current = null;

      if (socket) {
        socket.close();
      }
    };
  }, [relayAddress, classCode, deviceId, name]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      setCurrentTime(now);

      setMessages(previous => {
        const hasExpired = previous.some(
          item => item.expiresAt !== undefined && item.expiresAt <= now
        );

        if (!hasExpired) {
          return previous;
        }

        return previous.filter(
          item => item.expiresAt === undefined || item.expiresAt > now
        );
      });
    }, 250);

    return () => clearInterval(timer);
  }, []);

  function sendMessage() {
    Keyboard.dismiss();

    const cleanMessage = message.trim();

    if (!cleanMessage) {
      return;
    }

    if (cleanMessage.length > 280) {
      Alert.alert(
        'Message Too Long',
        'Messages cannot exceed 280 characters.'
      );
      return;
    }

    const socket = socketRef.current;

    if (
      !socket ||
      socket.readyState !== WebSocket.OPEN ||
      !connected ||
      !joinedRef.current
    ) {
      Alert.alert(
        'Not Connected',
        'Please wait until VANISH connects to the class relay.'
      );
      return;
    }

    setSending(true);

    try {
      const clientMessageId = Crypto.randomUUID();

      const packetSent = sendPacket(socket, 'MESSAGE_SEND', {
        id: clientMessageId,
        sender: name || 'Student',
        device_id: deviceId,
        text: cleanMessage,
        queued_ms: 0,
      });

      if (!packetSent) {
        throw new Error('The relay connection is not available.');
      }

      const newMessage: Message = {
        id: clientMessageId,
        text: cleanMessage,
        sender: name || 'You',
        mine: true,
        deliveryStatus: 'pending',
      };

      setMessages(previous => [newMessage, ...previous]);
      setMessage('');
    } catch (error) {
      Alert.alert(
        'Message Not Sent',
        error instanceof Error
          ? error.message
          : 'Could not send your message.'
      );
    } finally {
      setSending(false);
    }
  }

  function openMembers() {
    setMembersVisible(true);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>V</Text>

          <View style={styles.headerText}>
            <Text style={styles.title}>Class Chat</Text>

            <Text
              style={[
                styles.status,
                !connected && styles.disconnectedStatus,
              ]}
            >
              {connected
                ? `Connected to ${classCode}`
                : 'Connecting to relay...'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.membersButton}
            onPress={openMembers}
          >
            <Text style={styles.membersButtonText}>Members</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Messages disappear 30 seconds after delivery.
          </Text>
        </View>

        <FlatList
          data={messages}
          inverted
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No messages yet. Send the first message!
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const remainingSeconds = item.expiresAt
              ? Math.max(
                  0,
                  Math.ceil((item.expiresAt - currentTime) / 1000)
                )
              : null;

            return (
              <View
                style={[
                  styles.messageRow,
                  item.mine && styles.myMessageRow,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    item.mine && styles.myBubble,
                  ]}
                >
                  <Text style={styles.sender}>{item.sender}</Text>

                  <Text
                    style={[
                      styles.messageText,
                      item.mine && styles.myMessageText,
                    ]}
                  >
                    {item.text}
                  </Text>

                  <Text
                    style={[
                      styles.messageTime,
                      item.mine && styles.myMessageTime,
                    ]}
                  >
                    {item.deliveryStatus === 'dropped'
                      ? 'Not delivered'
                      : remainingSeconds !== null
                        ? `Expires in ${remainingSeconds}s`
                        : 'Waiting for delivery'}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            placeholderTextColor="#94A3B8"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={280}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!connected || sending) && styles.disabledButton,
            ]}
            onPress={sendMessage}
            disabled={!connected || sending}
          >
            <Text style={styles.sendText}>
              {sending ? 'Sending...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={membersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMembersVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Class Members</Text>
                <Text style={styles.modalSubtitle}>{classCode}</Text>
              </View>

              <TouchableOpacity
                onPress={() => setMembersVisible(false)}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.onlineCount}>{onlineCount}</Text>

            <Text style={styles.onlineDescription}>
              {onlineCount === 1 ? 'device online' : 'devices online'} (including you when connected)
            </Text>

            {!connected && (
              <Text style={styles.loadingText}>
                Waiting for relay connection...
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1426',
  },
  keyboard: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101D35',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#263B59',
  },
  logo: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#1769AA',
    color: '#FFFFFF',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 25,
    fontWeight: 'bold',
  },
  headerText: {
    marginLeft: 13,
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  status: {
    fontSize: 12,
    color: '#42D69B',
    marginTop: 3,
  },
  disconnectedStatus: {
    color: '#F6B94A',
  },
  membersButton: {
    backgroundColor: '#203B60',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#31577F',
  },
  membersButtonText: {
    color: '#70B9FF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  notice: {
    backgroundColor: '#142B49',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#263B59',
  },
  noticeText: {
    color: '#80BFFF',
    fontSize: 12,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#8299B8',
    fontSize: 14,
    textAlign: 'center',
  },
  messageRow: {
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  myMessageRow: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: '#1B2D49',
    padding: 13,
    borderRadius: 15,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: '#2B4262',
  },
  myBubble: {
    backgroundColor: '#1769AA',
    borderColor: '#2787D2',
  },
  sender: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#91B6DC',
    marginBottom: 5,
  },
  messageText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 10,
    color: '#8299B8',
    marginTop: 7,
  },
  myMessageTime: {
    color: '#D1E9FF',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101D35',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#263B59',
  },
  input: {
    flex: 1,
    backgroundColor: '#1B2D49',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    maxHeight: 100,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#304763',
  },
  sendButton: {
    backgroundColor: '#2585E8',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 9,
  },
  disabledButton: {
    opacity: 0.6,
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(3, 9, 20, 0.8)',
    justifyContent: 'center',
    padding: 22,
  },
  modalContent: {
    backgroundColor: '#15243B',
    borderRadius: 20,
    padding: 20,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: '#304763',
    alignItems: 'center',
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#91A6C2',
    marginTop: 4,
  },
  closeButton: {
    fontSize: 22,
    color: '#AFC4E0',
    padding: 5,
  },
  onlineCount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#70B9FF',
  },
  onlineDescription: {
    color: '#91A6C2',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    color: '#F6B94A',
    padding: 18,
  },
});
