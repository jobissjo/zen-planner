import { ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';

export default function IndexScreen() {
  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color="#3c87f7" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
