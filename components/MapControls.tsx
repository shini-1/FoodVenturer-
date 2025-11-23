import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MapControlsProps {
  onInfoPress?: () => void;
  markerCount?: number;
}

function MapControls({
  onInfoPress,
  markerCount = 0,
}: MapControlsProps) {
  return (
    <>
      {/* Status indicator - top left */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>✅ Map ready with {markerCount} markers</Text>
      </View>

      {/* Info button - bottom right */}
      <TouchableOpacity
        style={styles.infoButton}
        onPress={onInfoPress}
        activeOpacity={0.7}
      >
        <Text style={styles.infoButtonText}>i</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  statusContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
  },
  infoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    backgroundColor: '#000000',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  infoButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default MapControls;
