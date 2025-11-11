import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';

interface AddMenuItemScreenProps {
  navigation: any;
}

function AddMenuItemScreen({ navigation }: AddMenuItemScreenProps) {
  const { theme } = useTheme();
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddItem = async () => {
    if (!itemName.trim() || !price.trim() || !category.trim() || !description.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    if (isNaN(parseFloat(price))) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Adding menu item:', {
        itemName,
        price: parseFloat(price),
        category,
        description,
      });
      Alert.alert('Success', 'Menu item added successfully');
      setItemName('');
      setPrice('');
      setCategory('');
      setDescription('');
      navigation.navigate('BusinessDashboard');
    } catch (error) {
      console.error('Error adding menu item:', error);
      Alert.alert('Error', 'Failed to add menu item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.navigate('BusinessDashboard')} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Add Menu Item</Text>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Add New Menu Item</Text>

          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.primary,
                backgroundColor: theme.inputBackground,
                color: theme.text,
              },
            ]}
            placeholder="Item Name"
            placeholderTextColor={theme.textSecondary}
            value={itemName}
            onChangeText={setItemName}
          />

          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.primary,
                backgroundColor: theme.inputBackground,
                color: theme.text,
              },
            ]}
            placeholder="Price (e.g., $12.99)"
            placeholderTextColor={theme.textSecondary}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />

          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.primary,
                backgroundColor: theme.inputBackground,
                color: theme.text,
              },
            ]}
            placeholder="Category"
            placeholderTextColor={theme.textSecondary}
            value={category}
            onChangeText={setCategory}
          />

          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.primary,
                backgroundColor: theme.inputBackground,
                color: theme.text,
              },
            ]}
            placeholder="Description"
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={handleAddItem}
            disabled={isLoading}
          >
            <Text style={styles.addButtonText}>{isLoading ? 'Adding...' : 'Add Item'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 24,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    minHeight: 48,
  },
  addButton: {
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddMenuItemScreen;
