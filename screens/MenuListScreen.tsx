import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface MenuListScreenProps {
  navigation: any;
}

function MenuListScreen({ navigation }: MenuListScreenProps) {
  const { theme } = useTheme();
  const [menuItems] = useState<MenuItem[]>([
    { id: '1', name: 'Margherita Pizza', price: 12.99, category: 'Italian' },
    { id: '2', name: 'Caesar Salad', price: 8.99, category: 'Salad' },
    { id: '3', name: 'Grilled Chicken', price: 15.99, category: 'Main Course' },
    { id: '4', name: 'Chocolate Cake', price: 6.99, category: 'Dessert' },
  ]);

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity
      style={[styles.menuItem, { borderColor: theme.primary }]}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuItemName, { color: theme.text }]}>{item.name}</Text>
        <View style={styles.menuItemDetails}>
          <Text style={[styles.menuItemPrice, { color: theme.primary }]}>${item.price.toFixed(2)}</Text>
          <Text style={[styles.menuItemCategory, { color: theme.textSecondary }]}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.primary }]}>✕</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Menu List</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Your Menu Items</Text>

        <FlatList
          data={menuItems}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContainer}
        />

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('AddMenuItem')}
        >
          <Text style={styles.addButtonText}>+ Add New Item</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
    marginBottom: 16,
  },
  menuItem: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
  },
  menuItemContent: {
    gap: 8,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuItemCategory: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  addButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 'auto',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MenuListScreen;
