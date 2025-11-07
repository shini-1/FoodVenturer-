import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, Alert, TouchableOpacity, Modal, TextInput, ScrollView, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { getRestaurants, deleteRestaurant, getApprovedRestaurants, getPendingRestaurants, approveRestaurant, rejectRestaurant, deleteRestaurantOwner, updateRestaurantOwner, getRestaurantStats } from '../services/restaurants';
import { uploadAndUpdateRestaurantImage } from '../services/imageService';
import { Restaurant, RestaurantOwner, RestaurantSubmission } from '../types';
import { useWebLocation } from '../src/hooks/useWebLocation';
import { reverseGeocode } from '../src/services/geocodingService';
import { useWebImagePicker } from '../src/hooks/useWebImagePicker';

function AdminPanelScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { location: webLocation, loading: locationLoading, error: locationError, getCurrentLocation, isAvailable } = useWebLocation();
  const { pickImage: pickImageWeb, isAvailable: imagePickerAvailable, loading: imagePickerLoading } = useWebImagePicker();

  // Debug logging
  console.log('🔧 AdminPanel Debug:');
  console.log('📍 Location available:', isAvailable);
  console.log('📍 Location loading:', locationLoading);
  console.log('📷 Image picker available:', imagePickerAvailable);
  console.log('📷 Image picker loading:', imagePickerLoading);

  // Force availability for testing
  const locationAvailable = true; // isAvailable;
  const imageAvailable = true; // imagePickerAvailable;
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pendingBusinesses, setPendingBusinesses] = useState<RestaurantSubmission[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectingBusinessId, setRejectingBusinessId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loadingPending, setLoadingPending] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    image: ''
  });
  const [activeTab, setActiveTab] = useState<'restaurants' | 'pending'>('restaurants');
  const [addressCache, setAddressCache] = useState<{[key: string]: string}>({});
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const data = await getRestaurants();
        setRestaurants(data);
      } catch (error) {
        console.error('Failed to fetch restaurants:', error);
        Alert.alert('Error', 'Failed to load restaurants');
      }
    };
    fetchRestaurants();
  }, []);

  useEffect(() => {
    const fetchPendingBusinesses = async () => {
      try {
        setLoadingPending(true);
        const data = await getPendingRestaurants();
        setPendingBusinesses(data);
      } catch (error) {
        console.error('Failed to fetch pending businesses:', error);
        Alert.alert('Error', 'Failed to load pending submissions');
      } finally {
        setLoadingPending(false);
      }
    };
    fetchPendingBusinesses();
  }, [activeTab]); // Re-fetch when tab changes

  const handleDeleteBusiness = async (businessId: string) => {
    try {
      await deleteRestaurantOwner(businessId);
      // Note: This function is kept for pending submissions, but businesses are removed
    } catch (error: any) {
      Alert.alert('Error', `Delete failed: ${error.message}`);
    }
  };

  const handleApproveBusiness = async (submissionId: string) => {
    try {
      await approveRestaurant(submissionId);
      setPendingBusinesses(prev => prev.filter(s => s.id !== submissionId));
      Alert.alert('Success', 'Restaurant approved successfully!');
      // Refresh pending list
      const updatedPending = await getPendingRestaurants();
      setPendingBusinesses(updatedPending);
    } catch (error: any) {
      Alert.alert('Error', `Approval failed: ${error.message}`);
    }
  };

  const handleRejectBusiness = async () => {
    if (!rejectingBusinessId) return;

    try {
      await rejectRestaurant(rejectingBusinessId, rejectionReason);
      setPendingBusinesses(prev => prev.filter(s => s.id !== rejectingBusinessId));
      setShowRejectionModal(false);
      setRejectingBusinessId(null);
      setRejectionReason('');
      Alert.alert('Success', 'Restaurant listing rejected successfully!');
    } catch (error: any) {
      Alert.alert('Error', `Rejection failed: ${error.message}`);
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      await getCurrentLocation();
      if (webLocation) {
        // Update the appropriate form based on which modal is open
        if (editingRestaurant) {
          setEditForm(prev => ({
            ...prev,
            latitude: webLocation.latitude.toString(),
            longitude: webLocation.longitude.toString()
          }));
        }

        // Try to reverse geocode
        const address = await reverseGeocode(webLocation.latitude, webLocation.longitude);
        Alert.alert('Success', `Location updated!\n${address}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const pickImage = async () => {
    try {
      const result = await pickImageWeb({
        mediaTypes: 'images'
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setImageUploading(true);

        try {
          // Get the restaurant ID from editingBusiness or editingRestaurant
          const restaurantId = editingRestaurant?.id;
          if (!restaurantId) {
            Alert.alert('Error', 'No restaurant selected for editing');
            return;
          }

          // Upload to Firebase Storage and update database
          const uploadedImageUrl = await uploadAndUpdateRestaurantImage(imageUri, restaurantId, 'logo');

          // Update the appropriate form state
          if (editingRestaurant) {
            setEditForm(prev => ({
              ...prev,
              image: uploadedImageUrl
            }));

            // Update the restaurants list
            setRestaurants(prev => prev.map(r =>
              r.id === editingRestaurant.id ? { ...r, image: uploadedImageUrl } : r
            ));
          }

          Alert.alert('Success', 'Image uploaded and saved successfully!');

        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          Alert.alert('Error', 'Failed to upload image');
        } finally {
          setImageUploading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const getAddressDisplay = (latitude: number, longitude: number): string => {
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    return addressCache[key] || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  };

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setEditForm({
      name: restaurant.name,
      latitude: restaurant.location.latitude.toString(),
      longitude: restaurant.location.longitude.toString(),
      image: restaurant.image || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRestaurant(id);
      setRestaurants(prev => prev.filter(r => r.id !== id));
      Alert.alert('Success', 'Restaurant deleted!');
    } catch (error: any) {
      Alert.alert('Error', `Delete failed: ${error.message}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRestaurant) return;

    try {
      // Validate form
      const name = editForm.name.trim();
      const latitude = parseFloat(editForm.latitude);
      const longitude = parseFloat(editForm.longitude);

      if (!name) {
        Alert.alert('Error', 'Restaurant name is required');
        return;
      }

      if (isNaN(latitude) || isNaN(longitude)) {
        Alert.alert('Error', 'Valid latitude and longitude are required');
        return;
      }

      // For now, we'll just update local state since we don't have updateRestaurant function
      // TODO: Implement updateRestaurant in services
      const updatedRestaurant: Restaurant = {
        ...editingRestaurant,
        name,
        location: { latitude, longitude },
        image: editForm.image.trim() || undefined
      };

      setRestaurants(prev => prev.map(r =>
        r.id === editingRestaurant.id ? updatedRestaurant : r
      ));

      setShowEditModal(false);
      setEditingRestaurant(null);

      Alert.alert('Success', 'Restaurant updated successfully!');

      // TODO: Call actual update API when implemented
      console.log('TODO: Implement updateRestaurant API call for:', updatedRestaurant);

    } catch (error: any) {
      Alert.alert('Error', `Update failed: ${error.message}`);
    }
  };

  const handleCleanupDuplicates = async () => {
    try {
      Alert.alert('Cleaning up', 'Removing duplicate restaurants...');
      const { cleanupDuplicateRestaurants } = await import('../services/restaurants');
      const result = await cleanupDuplicateRestaurants();
      Alert.alert('Success', `Cleanup complete! Deleted ${result.deleted} duplicates, kept ${result.kept} unique restaurants.`);
    } catch (error: any) {
      Alert.alert('Error', `Cleanup failed: ${error.message}`);
    }
  };

  const handleShowStats = async () => {
    try {
      const { getRestaurantStats } = await import('../services/restaurants');
      const stats = await getRestaurantStats();

      Alert.alert(
        'Restaurant Statistics',
        `Total: ${stats.total}\nUnique: ${stats.unique}\nDuplicates: ${stats.duplicates}\n\nName duplicates: ${stats.nameDuplicates.length}\nCoord duplicates: ${stats.coordDuplicates.length}`
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to get stats: ${error.message}`);
    }
  };

  const handleVerifyDataIntegrity = async () => {
    try {
      const { getRestaurants } = await import('../services/restaurants');
      const { restaurantUrls } = await import('../utils/importRestaurants');
      const { parseGoogleMapsUrl } = await import('../utils/googleMapsParser');

      const currentRestaurants = await getRestaurants();
      const expectedRestaurants = restaurantUrls.map(url => parseGoogleMapsUrl(url)).filter(r => r !== null);

      console.log('🔍 Data Integrity Check:');
      console.log('📊 Current in DB:', currentRestaurants.length);
      console.log('📊 Expected from URLs:', expectedRestaurants.length);
      console.log('📊 URLs provided:', restaurantUrls.length);

      // Check what restaurants are present vs expected
      const currentNames = currentRestaurants.map(r => r.name.toLowerCase().trim());
      const expectedNames = expectedRestaurants.map(r => r.name.toLowerCase().trim());

      const missing = expectedNames.filter(name => !currentNames.includes(name));
      const extra = currentNames.filter(name => !expectedNames.includes(name));

      let message = `Data Integrity Check:\n\nCurrent: ${currentRestaurants.length} restaurants\nExpected: ${expectedRestaurants.length} restaurants\nURLs: ${restaurantUrls.length}\n\n`;

      if (missing.length > 0) {
        message += `❌ Missing restaurants: ${missing.length}\n${missing.join(', ')}\n\n`;
      }

      if (extra.length > 0) {
        message += `⚠️ Extra restaurants: ${extra.length}\n${extra.join(', ')}\n\n`;
      }

      if (missing.length === 0 && extra.length === 0) {
        message += '✅ Data integrity verified - all expected restaurants present!';
      }

      Alert.alert('Data Integrity Check', message);

      console.log('Missing restaurants:', missing);
      console.log('Extra restaurants:', extra);
      console.log('Current names:', currentNames);
      console.log('Expected names:', expectedNames);

    } catch (error: any) {
      Alert.alert('Error', `Integrity check failed: ${error.message}`);
    }
  };

  const handleClearDatabase = async () => {
    Alert.alert(
      '⚠️ Clear Database',
      'This will permanently delete ALL restaurants from the database. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DELETE ALL',
          style: 'destructive',
          onPress: async () => {
            try {
              const { clearAllRestaurants } = await import('../services/restaurants');
              const deletedCount = await clearAllRestaurants();
              Alert.alert('Success', `Database cleared! Deleted ${deletedCount} restaurants.`);
            } catch (error: any) {
              Alert.alert('Error', `Clear failed: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const handleImportRestaurants = async () => {
    // Import the URLs from the utils
    const { addRestaurantsFromGoogleMaps } = await import('../services/restaurants');
    const { restaurantUrls } = await import('../utils/importRestaurants');

    try {
      Alert.alert('Importing', 'Please wait...');
      await addRestaurantsFromGoogleMaps(restaurantUrls);
      Alert.alert('Success', 'Restaurants imported successfully!');
      // Refresh the list
      // const data = await getRestaurants();
      // setRestaurants(data);
    } catch (error: any) {
      Alert.alert('Error', `Import failed: ${error.message}`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, padding: 20 }}>
      <Header />
      <TouchableOpacity
        onPress={() => navigation.navigate('RoleSelection')}
        style={{ padding: 10, backgroundColor: theme.primary, marginBottom: 20, alignSelf: 'flex-start', borderRadius: 5 }}
      >
        <Text style={{ color: theme.background }}>Back to Role Selection</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 24, marginBottom: 20, color: theme.text }}>Admin Panel</Text>

      {/* Tab Navigation */}
      <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: theme.surface, borderRadius: 10, padding: 5 }}>
        <TouchableOpacity
          onPress={() => setActiveTab('restaurants')}
          style={[
            styles.tabButton,
            activeTab === 'restaurants' && { backgroundColor: theme.primary }
          ]}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'restaurants' ? theme.background : theme.text }
          ]}>
            🍽️ Restaurants
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('pending')}
          style={[
            styles.tabButton,
            activeTab === 'pending' && { backgroundColor: theme.primary }
          ]}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'pending' ? theme.background : theme.text }
          ]}>
            ⏳ Pending
          </Text>
        </TouchableOpacity>
      </View>

      {/* Icon Toolbar */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 10 }}>
        <TouchableOpacity
          onPress={handleImportRestaurants}
          style={[styles.iconButton, { backgroundColor: theme.secondary }]}
        >
          <Text style={styles.iconText}>📥</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCleanupDuplicates}
          style={[styles.iconButton, { backgroundColor: 'orange' }]}
        >
          <Text style={styles.iconText}>🧹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShowStats}
          style={[styles.iconButton, { backgroundColor: 'purple' }]}
        >
          <Text style={styles.iconText}>📊</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleClearDatabase}
          style={[styles.iconButton, { backgroundColor: 'red' }]}
        >
          <Text style={styles.iconText}>🗑️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleVerifyDataIntegrity}
          style={[styles.iconButton, { backgroundColor: 'teal' }]}
        >
          <Text style={styles.iconText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'restaurants' && (
        <>
          <Text style={{ fontSize: 18, marginBottom: 10, color: theme.text }}>Restaurants:</Text>
          <FlatList
            data={restaurants}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500' }} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleEdit(item)}
                    style={{ backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}
                  >
                    <Text style={{ color: theme.background, fontSize: 12, fontWeight: 'bold' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={{ backgroundColor: '#dc3545', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            style={{ backgroundColor: theme.surface, borderRadius: 8, marginTop: 10 }}
          />
        </>
      )}

      {activeTab === 'pending' && (
        <>
          <Text style={{ fontSize: 18, marginBottom: 10, color: theme.text }}>Pending Reviews</Text>
          {loadingPending ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Text style={{ color: theme.textSecondary }}>Loading pending submissions...</Text>
            </View>
          ) : pendingBusinesses.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 8, marginTop: 10 }}>
              <Text style={{ fontSize: 24, color: theme.textSecondary, marginBottom: 10 }}>⏳</Text>
              <Text style={{ fontSize: 18, color: theme.text, marginBottom: 10 }}>No Pending Submissions</Text>
              <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center' }}>
                Restaurant owner submissions will appear here{'\n'}for approval or rejection.
              </Text>
            </View>
          ) : (
            <FlatList
              data={pendingBusinesses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500' }} numberOfLines={2}>
                      {item.businessName}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                      Owner: {item.ownerName}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                      📧 {item.email} | 📞 {item.phone}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                      📍 {getAddressDisplay(item.location.latitude, item.location.longitude)}
                    </Text>
                    <Text style={{ color: '#ffc107', fontSize: 12, marginTop: 2 }}>
                      Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                    </Text>
                    {item.description && (
                      <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' }} numberOfLines={2}>
                        "{item.description}"
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleApproveBusiness(item.id)}
                      style={{ backgroundColor: '#28a745', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✅ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setRejectingBusinessId(item.id);
                        setShowRejectionModal(true);
                      }}
                      style={{ backgroundColor: '#dc3545', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>❌ Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              style={{ backgroundColor: theme.surface, borderRadius: 8, marginTop: 10 }}
            />
          )}
        </>
      )}

      {/* Edit Restaurant Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 10, padding: 20, width: '90%', maxWidth: 400, maxHeight: '80%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: theme.text }}>
              Edit Restaurant
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Name:</Text>
              <TextInput
                value={editForm.name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="Restaurant name"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Latitude:</Text>
              <TextInput
                value={editForm.latitude}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, latitude: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="e.g. 11.7061"
                keyboardType="numeric"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Longitude:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <TextInput
                  value={editForm.longitude}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, longitude: text }))}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 5,
                    padding: 10,
                    color: theme.text,
                    backgroundColor: theme.background
                  }}
                  placeholder="e.g. 122.3649"
                  keyboardType="numeric"
                  placeholderTextColor={theme.textSecondary}
                />
                <TouchableOpacity
                  onPress={handleGetCurrentLocation}
                  disabled={locationLoading}
                  style={{
                    marginLeft: 10,
                    backgroundColor: locationLoading ? theme.border : '#28a745',
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 5
                  }}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={theme.text} />
                  ) : (
                    <Text style={{
                      color: !isAvailable ? theme.textSecondary : 'white',
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}>
                      {!isAvailable ? '📍 Location Unavailable' : '📍 Get Location'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Restaurant Image:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={pickImage}
                  disabled={imagePickerLoading || !imagePickerAvailable}
                  style={{
                    backgroundColor: imagePickerLoading ? theme.border :
                                   !imagePickerAvailable ? '#ccc' : '#007bff',
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 5,
                    marginRight: 10
                  }}
                >
                  {imagePickerLoading ? (
                    <ActivityIndicator size="small" color={theme.text} />
                  ) : (
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                      {!imagePickerAvailable ? '📷 Unavailable' : '📷 Select Image'}
                    </Text>
                  )}
                </TouchableOpacity>
                {editForm.image ? (
                  <Image
                    source={{ uri: editForm.image }}
                    style={{ width: 50, height: 50, borderRadius: 5 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No image selected</Text>
                )}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setEditingRestaurant(null);
                }}
                style={{ backgroundColor: theme.border, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, flex: 1, marginRight: 10 }}
              >
                <Text style={{ color: theme.text, textAlign: 'center', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveEdit}
                style={{ backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, flex: 1, marginLeft: 10 }}
              >
                <Text style={{ color: theme.background, textAlign: 'center', fontWeight: 'bold' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal
        visible={showRejectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRejectionModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 10, padding: 20, width: '90%', maxWidth: 400 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: theme.text }}>
              Reject Restaurant Submission
            </Text>

            <Text style={{ fontSize: 16, marginBottom: 15, color: theme.text }}>
              Please provide a reason for rejection:
            </Text>

            <View style={{ marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => setRejectionReason("Incomplete information provided")}
                style={{ padding: 10, backgroundColor: rejectionReason === "Incomplete information provided" ? theme.primary : theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 5, marginBottom: 5 }}
              >
                <Text style={{ color: rejectionReason === "Incomplete information provided" ? theme.background : theme.text }}>📝 Incomplete information</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRejectionReason("Invalid location coordinates")}
                style={{ padding: 10, backgroundColor: rejectionReason === "Invalid location coordinates" ? theme.primary : theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 5, marginBottom: 5 }}
              >
                <Text style={{ color: rejectionReason === "Invalid location coordinates" ? theme.background : theme.text }}>📍 Invalid location</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRejectionReason("Business already exists")}
                style={{ padding: 10, backgroundColor: rejectionReason === "Business already exists" ? theme.primary : theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 5, marginBottom: 5 }}
              >
                <Text style={{ color: rejectionReason === "Business already exists" ? theme.background : theme.text }}>🏢 Duplicate business</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRejectionReason("Violates platform policies")}
                style={{ padding: 10, backgroundColor: rejectionReason === "Violates platform policies" ? theme.primary : theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 5, marginBottom: 15 }}
              >
                <Text style={{ color: rejectionReason === "Violates platform policies" ? theme.background : theme.text }}>⚖️ Policy violation</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Custom Reason:</Text>
            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 5,
                padding: 10,
                marginBottom: 20,
                color: theme.text,
                backgroundColor: theme.background,
                minHeight: 80,
                textAlignVertical: 'top'
              }}
              placeholder="Or enter custom rejection reason..."
              multiline
              numberOfLines={3}
              placeholderTextColor={theme.textSecondary}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectionModal(false);
                  setRejectingBusinessId(null);
                  setRejectionReason('');
                }}
                style={{ backgroundColor: theme.border, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, flex: 1, marginRight: 10 }}
              >
                <Text style={{ color: theme.text, textAlign: 'center', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRejectBusiness}
                style={{ backgroundColor: '#dc3545', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, flex: 1, marginLeft: 10 }}
                disabled={!rejectionReason.trim()}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                  {rejectionReason.trim() ? 'Reject Submission' : 'Enter Reason'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TODO: User management */}
    </View>
  );
}

const styles = StyleSheet.create({
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconText: {
    fontSize: 20,
  },
});

export default AdminPanelScreen;
