import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

export default function EventsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>イベント</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ 新規作成</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🎉</Text>
          <Text style={styles.emptyTitle}>イベントはまだありません</Text>
          <Text style={styles.emptySubtext}>
            コラボイベントを企画して、
            他の店舗オーナーと繋がりましょう！
          </Text>
          
          <TouchableOpacity style={styles.createButton}>
            <Text style={styles.createButtonText}>最初のイベントを作成</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#FF8C00',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  createButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});