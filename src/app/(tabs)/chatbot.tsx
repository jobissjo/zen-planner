import { useCallback, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  RefreshCw,
  Mic,
  MicOff,
} from 'lucide-react-native';
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: (event: string, callback: (...args: any[]) => void) => void = () => {};

try {
  const SpeechLib = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = SpeechLib.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = SpeechLib.useSpeechRecognitionEvent;
} catch (e) {
  console.warn("Speech recognition native module is not available in this environment. Voice features will be disabled.");
}

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { Spacing } from '@/constants/theme';
import type { ChatMessage } from '@/types';

const SUGGESTIONS = [
  { label: "Show today's tasks", text: "List my tasks for today" },
  { label: "Add gym today", text: "Add a task: Workout today from 6:00 PM to 7:00 PM" },
  { label: "Show weekly stats", text: "How are my stats looking this week?" },
  { label: "Check my streak", text: "What is my current streak status?" },
];

function FormattedMessage({ text, textColor }: { text: string; textColor?: string }) {
  if (!text) return null;

  // Split by code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <View style={styles.messageContent}>
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const language = match ? match[1] : "";
          const code = match ? match[2] : part.slice(3, -3);
          return (
            <View key={index} style={styles.codeBlock}>
              {language ? (
                <ThemedText style={styles.codeBlockLang}>{language.toUpperCase()}</ThemedText>
              ) : null}
              <ThemedText style={styles.codeBlockText}>{code.trim()}</ThemedText>
            </View>
          );
        }

        // Process line-by-line
        const lines = part.split("\n");
        return (
          <View key={index} style={{ gap: 4 }}>
            {lines.map((line, lineIndex) => {
              let cleanLine = line.trim();
              const isBullet = cleanLine.startsWith("- ") || cleanLine.startsWith("* ");
              if (isBullet) {
                cleanLine = cleanLine.substring(2);
              }

              // Bold styling
              const boldParts = cleanLine.split(/(\*\*.*?\*\*)/g);
              const formattedLine = boldParts.map((boldPart, bpIndex) => {
                if (boldPart.startsWith("**") && boldPart.endsWith("**")) {
                  return (
                    <ThemedText key={bpIndex} style={{ fontWeight: 'bold', color: textColor }}>
                      {boldPart.slice(2, -2)}
                    </ThemedText>
                  );
                }
                
                // Inline code styling
                const codeParts = boldPart.split(/(\`.*?\`)/g);
                return codeParts.map((codePart, cpIndex) => {
                  if (codePart.startsWith("`") && codePart.endsWith("`")) {
                    return (
                      <ThemedText key={cpIndex} style={styles.inlineCode}>
                        {codePart.slice(1, -1)}
                      </ThemedText>
                    );
                  }
                  return <ThemedText key={cpIndex} style={{ color: textColor }}>{codePart}</ThemedText>;
                });
              });

              if (isBullet) {
                return (
                  <View key={lineIndex} style={styles.bulletRow}>
                    <ThemedText style={[styles.bulletDot, { color: textColor }]}>•</ThemedText>
                    <ThemedText style={[styles.bulletText, { color: textColor }]}>{formattedLine}</ThemedText>
                  </View>
                );
              }

              return cleanLine ? (
                <ThemedText key={lineIndex} style={{ color: textColor, lineHeight: 20 }}>
                  {formattedLine}
                </ThemedText>
              ) : (
                <View key={lineIndex} style={{ height: 6 }} />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

export default function ChatbotScreen() {
  const { session } = useAuth();
  const theme = useTheme();
  
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Load chat history from AsyncStorage on mount or session change
  useEffect(() => {
    if (!session?.user?.email) return;
    
    const loadHistory = async () => {
      try {
        const key = `zen_chat_history_${session.user.email}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          setMessages(JSON.parse(stored));
        } else {
          // Default welcome message
          const welcome: ChatMessage = {
            role: "assistant",
            content: `Hi ${session.user.first_name || "there"}! 🧘‍♂️ I'm your Zen AI assistant.\n\nI can help you manage your weekly planner using natural language. Try asking me:\n- *"List my tasks for today"* \n- *"Add a task: Yoga session tomorrow at 7 AM"* \n- *"Mark my team sync task as completed"* \n- *"Delete my meeting task"*`,
          };
          setMessages([welcome]);
          await AsyncStorage.setItem(key, JSON.stringify([welcome]));
        }
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    };

    loadHistory();
  }, [session]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      try {
        ExpoSpeechRecognitionModule?.stop();
      } catch {}
    };
  }, []);

  // Save messages to AsyncStorage
  const saveMessages = async (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    if (!session?.user?.email) return;
    try {
      const key = `zen_chat_history_${session.user.email}`;
      await AsyncStorage.setItem(key, JSON.stringify(newMessages));
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  };

  // Register speech recognition listeners
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results.map((r: { transcript: string }) => r.transcript).join(" ");
    if (text.trim()) {
      setInput(text);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error("Speech recognition error:", event.error);
    setIsListening(false);
    if (event.error === 'not-allowed') {
      Alert.alert("Permission Denied", "Microphone or Speech Recognition permission was denied.");
    } else {
      Alert.alert("Speech Error", `Recognition error: ${event.error || "unknown"}`);
    }
  });

  const toggleListening = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(
        "Expo Go Fallback",
        "Speech recognition requires native modules which are not available in Expo Go. To use voice functionality, please build a native development client.\n\nText chat is fully functional!"
      );
      return;
    }

    if (isListening) {
      try {
        await ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
      } catch (e) {
        console.error("Failed to stop listening:", e);
      }
    } else {
      try {
        const isAvailable = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
        if (!isAvailable) {
          Alert.alert("Not Supported", "Speech recognition is not available on this device.");
          return;
        }

        const micPerm = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
        const speechPerm = await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync();

        if (!micPerm.granted || !speechPerm.granted) {
          Alert.alert("Permissions Required", "Microphone and Speech Recognition permissions are required to use voice typing.");
          return;
        }

        await ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          continuous: true,
        });
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start listening:", err);
        Alert.alert("Error", "Could not start voice recognition.");
      }
    }
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    // Stop listening if we are typing/sending
    if (isListening) {
      try {
        await ExpoSpeechRecognitionModule?.stop();
        setIsListening(false);
      } catch {}
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: textToSend,
    };

    const updatedMessages = [...messages, userMessage];
    await saveMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    // Auto scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const chatHistoryForApi = updatedMessages.slice(0, -1);
      const response = await api.chatWithBot(textToSend, chatHistoryForApi);
      
      const botMessage: ChatMessage = {
        role: "assistant",
        content: response.reply,
      };

      await saveMessages([...updatedMessages, botMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message || "Something went wrong on the server."}`,
      };
      await saveMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const clearChat = async () => {
    if (!session?.user?.email) return;
    
    Alert.alert(
      "Reset Conversation",
      "Are you sure you want to clear your chat history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            const welcome: ChatMessage = {
              role: "assistant",
              content: `Hi ${session.user.first_name || "there"}! Let's start fresh. How can I help you with your planner today?`,
            };
            await saveMessages([welcome]);
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
        <View style={[
          styles.avatar,
          isUser ? [styles.userAvatar, { backgroundColor: '#3c87f7' }] : [styles.botAvatar, { backgroundColor: theme.backgroundSelected }]
        ]}>
          {isUser ? (
            <UserIcon size={14} color="#fff" />
          ) : (
            <Bot size={14} color="#3c87f7" />
          )}
        </View>
        <View style={[
          styles.bubble,
          isUser ? [styles.userBubble, { backgroundColor: '#3c87f7' }] : [styles.botBubble, { backgroundColor: theme.backgroundElement }]
        ]}>
          <FormattedMessage text={item.content} textColor={isUser ? '#ffffff' : theme.text} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}>
        <View style={styles.headerLeft}>
          <Sparkles size={20} color="#3c87f7" style={{ marginRight: 8 }} />
          <View>
            <ThemedText type="smallBold" style={styles.headerTitle}>Zen AI Assistant</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.headerSubtitle}>
              Manage your tasks with AI
            </ThemedText>
          </View>
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={clearChat}>
          <RefreshCw size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </ThemedView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={() => (
            <View>
              {isLoading && (
                <View style={[styles.messageRow, styles.botRow]}>
                  <View style={[styles.avatar, styles.botAvatar, { backgroundColor: theme.backgroundSelected }]}>
                    <Bot size={14} color="#3c87f7" />
                  </View>
                  <View style={[styles.bubble, styles.botBubble, styles.loadingBubble, { backgroundColor: theme.backgroundElement }]}>
                    <ActivityIndicator size="small" color="#3c87f7" style={{ marginRight: 8 }} />
                    <ThemedText type="small" themeColor="textSecondary">AI is working...</ThemedText>
                  </View>
                </View>
              )}

              {/* Suggestions (Only show when history is only the greeting) */}
              {!isLoading && messages.length <= 1 && (
                <View style={styles.suggestionsContainer}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.suggestionsTitle}>
                    Suggested requests:
                  </ThemedText>
                  <View style={styles.suggestionsList}>
                    {SUGGESTIONS.map((s, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.suggestionChip, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
                        onPress={() => handleSend(s.text)}
                      >
                        <ThemedText type="small" themeColor="textSecondary" style={styles.suggestionText}>
                          {s.label}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        />

        {/* Input Panel */}
        <ThemedView style={[styles.inputPanel, { borderTopColor: theme.backgroundSelected, backgroundColor: theme.background }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderColor: theme.backgroundSelected,
                }
              ]}
              placeholder={isListening ? "Listening..." : "Type message or ask to add task..."}
              placeholderTextColor={theme.textSecondary}
              value={input}
              onChangeText={setInput}
              editable={!isLoading}
              multiline
            />

            {/* Microphone / Speech Recognition Button */}
            <TouchableOpacity
              onPress={toggleListening}
              disabled={isLoading}
              style={[
                styles.iconButton,
                isListening
                  ? [styles.micActiveButton, { backgroundColor: '#ef4444' }]
                  : [styles.micInactiveButton, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]
              ]}
            >
              {isListening ? (
                <MicOff size={18} color="#fff" />
              ) : (
                <Mic size={18} color={theme.textSecondary} />
              )}
            </TouchableOpacity>

            {/* Send Button */}
            <TouchableOpacity
              onPress={() => handleSend(input)}
              disabled={isLoading || !input.trim() || isListening}
              style={[
                styles.iconButton,
                styles.sendButton,
                { backgroundColor: (isLoading || !input.trim() || isListening) ? theme.backgroundSelected : '#3c87f7' }
              ]}
            >
              <Send size={18} color={(isLoading || !input.trim() || isListening) ? theme.textSecondary : '#fff'} />
            </TouchableOpacity>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  resetButton: {
    padding: Spacing.two,
  },
  listContainer: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.two,
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  botRow: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {
    marginLeft: Spacing.two,
  },
  botAvatar: {
    marginRight: Spacing.two,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  userBubble: {
    borderBottomRightRadius: 2,
  },
  botBubble: {
    borderBottomLeftRadius: 2,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 2,
  },
  messageContent: {
    gap: 4,
  },
  codeBlock: {
    marginVertical: 6,
    padding: 8,
    backgroundColor: '#1e1e24',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#33343c',
  },
  codeBlockLang: {
    fontSize: 9,
    color: '#888',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  codeBlockText: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    color: '#f8f8f2',
  },
  inlineCode: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 6,
    marginVertical: 1,
  },
  bulletDot: {
    marginRight: 6,
    fontSize: 14,
  },
  bulletText: {
    flex: 1,
    lineHeight: 18,
  },
  suggestionsContainer: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  suggestionsTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  suggestionChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12,
  },
  inputPanel: {
    borderTopWidth: 1,
    padding: Spacing.three,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActiveButton: {
    elevation: 2,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  micInactiveButton: {
    borderWidth: 1,
  },
  sendButton: {
    elevation: 1,
  },
});
