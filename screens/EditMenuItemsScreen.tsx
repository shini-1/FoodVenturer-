import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
}

interface EditMenuItemsScreenProps {
  navigation: any;
}

function EditMenuItemsScreen({ navigation }: EditMenuItemsScreenProps) {
  const { theme } = useTheme();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    {
      id: '1',
      name: 'Margherita Pizza',
      price: 12.99,
      category: 'Italian',
      description: 'Classic pizza with tomato and cheese',
    },
    {
      id: '2',
      name: 'Caesar Salad',
      price: 8.99,
      category: 'Salad',
      description: 'Fresh greens with Caesar dressing',
    },
    {
      id: '3',
      name: 'Grilled Chicken',
      price: 15.99,
      category: 'Main Course',
      description: 'Grilled chicken with herbs',
    },
  ]);

  const handleEdit = (item: MenuItem) => {
    console.log('Edit item:', item);
    Alert.alert('Edit', `Edit functionality for ${item.name}`);
  };

  const handleDelete = (itemId: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: () => {
          setMenuItems(menuItems.filter((item) => item.id !== itemId));
          Alert.alert('Success', 'Item deleted successfully');
        },
        style: 'destructive',
      },
    ]);
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <View style={[styles.menuItem, { borderColor: theme.primary }]}>
      <Text style={[styles.menuItemName, { color: theme.text }]}>{item.name}</Text>
      <Text style={[styles.menuItemPrice, { color: theme.primary }]}>${item.price.toFixed(2)}</Text>
      <Text style={[styles.menuItemCategory, { color: theme.textSecondary }]}>{item.category}</Text>
      <Text style={[styles.menuItemDescription, { color: theme.textSecondary }]}>
        {item.description}
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: theme.primary }]}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.navigate('BusinessDashboard')} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Edit Menu Items</Text>

        <FlatList
          data={menuItems}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContainer}
        />
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
    marginBottom: 20,
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
  },
  menuItem: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  menuItemCategory: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  menuItemDescription: {
    fontSize: 13,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default EditMenuItemsScreen;
