import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { chatbotService, type ChatbotMessage } from '@/services/chatbot.services';

const WELCOME_MESSAGE: ChatbotMessage = {
  role: 'assistant',
  content: 'Hi, I am your SeaTachys assistant. Ask me about ordering, pickup, delivery, or how to use the app.',
};

export default function AssistantScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatbotMessage[]>([WELCOME_MESSAGE]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const sendMessage = async () => {
    const message = draft.trim();
    if (!message || sending) {
      return;
    }

    const nextMessages: ChatbotMessage[] = [...messages, { role: 'user', content: message }];
    setMessages(nextMessages);
    setDraft('');
    setSending(true);

    try {
      const response = await chatbotService.sendMessage(message, messages);
      setMessages((current) => [...current, { role: 'assistant', content: response.reply }]);
    } catch (error: any) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: error?.message || 'I could not reach the assistant right now. Please try again.',
        },
      ]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#0F2F57" />
            </Pressable>
            <View style={styles.headerCopy}>
              <ThemedText style={styles.title}>SeaTachys Assistant</ThemedText>
              <ThemedText style={styles.subtitle}>Local AI powered by your backend</ThemedText>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messages}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((message, index) => (
              <View
                key={`${message.role}-${index}`}
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <ThemedText
                  style={[
                    styles.messageText,
                    message.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                  ]}
                >
                  {message.content}
                </ThemedText>
              </View>
            ))}

            {sending ? (
              <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
                <ActivityIndicator size="small" color="#0F2F57" />
                <ThemedText style={styles.assistantMessageText}>Thinking...</ThemedText>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask SeaTachys..."
              placeholderTextColor="#7C8798"
              style={styles.input}
              multiline
              maxLength={1200}
            />
            <Pressable
              style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!draft.trim() || sending}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF3F8',
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 2,
  },
  messages: {
    flexGrow: 1,
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  messageBubble: {
    maxWidth: '86%',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0F2F57',
    borderTopRightRadius: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  assistantMessageText: {
    color: '#111827',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,47,87,0.08)',
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: '#EEF3F8',
    color: '#111827',
    fontSize: 15,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF8E00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7CDD7',
  },
});
