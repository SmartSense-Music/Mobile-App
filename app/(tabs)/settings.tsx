import { IconSymbol } from "@/components/ui/icon-symbol";
import { Palette } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { MusicService, SavedLocation } from "@/services/backend";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [locationName, setLocationName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Map State
  const [mapVisible, setMapVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [tempMapLocation, setTempMapLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadLocations();
    }
  }, [user]);

  const loadLocations = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const backendLocations = await MusicService.getLocations(user.id);
      setLocations(backendLocations);
    } catch (error) {
      console.error("Failed to load locations", error);
      Alert.alert("Error", "Failed to load locations from backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseGPS = async () => {
    setLoading(true);
    Keyboard.dismiss();
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Allow location access to use GPS.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      await updateSelectedLocation(latitude, longitude);
    } catch (e) {
      Alert.alert("Error", "Failed to get current location");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Input Required", "Please enter an address to search.");
      return;
    }
    setLoading(true);
    Keyboard.dismiss();
    try {
      const geocoded = await Location.geocodeAsync(searchQuery);
      if (geocoded.length > 0) {
        const { latitude, longitude } = geocoded[0];
        await updateSelectedLocation(latitude, longitude, searchQuery);
      } else {
        Alert.alert(
          "Not Found",
          "Could not find coordinates for this address."
        );
        setSelectedLocation(null);
      }
    } catch (e) {
      Alert.alert("Error", "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openMap = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const loc = await Location.getCurrentPositionAsync({});
      setMapRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setTempMapLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    }
    setMapVisible(true);
  };

  const confirmMapSelection = async () => {
    if (tempMapLocation) {
      setMapVisible(false);
      setLoading(true);
      await updateSelectedLocation(
        tempMapLocation.latitude,
        tempMapLocation.longitude
      );
      setLoading(false);
    }
  };

  const updateSelectedLocation = async (
    latitude: number,
    longitude: number,
    providedAddress?: string
  ) => {
    let address = providedAddress || "Unknown Location";
    if (!providedAddress) {
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (reverse.length > 0) {
          const addr = reverse[0];
          address = `${addr.street || ""} ${addr.city || ""}, ${
            addr.region || ""
          }`.trim();
        }
      } catch (e) {
        console.log("Reverse geocode failed", e);
      }
    }

    setSelectedLocation({ lat: latitude, lng: longitude, address });
    setSearchQuery(address);
  };

  const saveLocation = async () => {
    if (!locationName.trim()) {
      Alert.alert(
        "Missing Name",
        "Please enter a name for this location (e.g., Home, Gym)."
      );
      return;
    }
    if (!selectedLocation) {
      Alert.alert(
        "Missing Location",
        "Please search for an address or use GPS first."
      );
      return;
    }

    setLoading(true);
    try {
      const newLoc = await MusicService.saveLocation(user?.id || "guest", {
        name: locationName,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        address: selectedLocation.address || "",
      });

      if (newLoc) {
        setLocations((prev) => [...prev, newLoc]);

        // Reset form
        setLocationName("");
        setSearchQuery("");
        setSelectedLocation(null);
        Alert.alert("Success", "Location saved to backend successfully!");
      } else {
        Alert.alert("Error", "Failed to save location to backend.");
      }
    } catch (e) {
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const deleteLocation = async (id: string) => {
    Alert.alert(
      "Delete Location",
      "Are you sure you want to delete this location?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const success = await MusicService.deleteLocation(id);
            if (success) {
              setLocations((prev) => prev.filter((loc) => loc.id !== id));
            } else {
              Alert.alert("Error", "Failed to delete location.");
            }
            setLoading(false);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Palette.black, Palette.darkGray]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        entering={FadeInDown.delay(100).duration(600)}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>MANAGE LOCATIONS</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(600)}>
        <Text style={styles.subTitle}>
          Add locations to improve context detection.
        </Text>
      </Animated.View>

      {/* Add Location Form */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(600)}
        style={styles.formContainer}
      >
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          <Text style={styles.label}>LOCATION NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Home, Gym, Office"
            placeholderTextColor="#666"
            value={locationName}
            onChangeText={setLocationName}
          />

          <Text style={styles.label}>ADDRESS / SEARCH</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Enter address or city"
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Palette.black} />
              ) : (
                <IconSymbol
                  name="paperplane.fill"
                  size={20}
                  color={Palette.black}
                />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.gpsButton, { flex: 1 }]}
              onPress={handleUseGPS}
              disabled={loading}
            >
              <IconSymbol name="location.fill" size={18} color={Palette.gold} />
              <Text style={styles.gpsButtonText}>Use GPS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gpsButton, { flex: 1 }]}
              onPress={openMap}
              disabled={loading}
            >
              <IconSymbol name="map" size={18} color={Palette.gold} />
              <Text style={styles.gpsButtonText}>Select on Map</Text>
            </TouchableOpacity>
          </View>

          {selectedLocation && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewText}>
                Selected: {selectedLocation.lat.toFixed(4)},{" "}
                {selectedLocation.lng.toFixed(4)}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.saveButton,
              !selectedLocation && styles.disabledButton,
            ]}
            onPress={saveLocation}
            disabled={!selectedLocation}
          >
            <LinearGradient
              colors={
                !selectedLocation
                  ? ["#444", "#444"]
                  : [Palette.red, Palette.crimson]
              }
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>SAVE LOCATION</Text>
            </LinearGradient>
          </TouchableOpacity>
        </BlurView>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(400).duration(600)}
        style={{ flex: 1 }}
      >
        <Text style={styles.listHeader}>SAVED LOCATIONS</Text>
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(500 + index * 100).duration(500)}
              style={styles.locationItem}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.locationName}>{item.name}</Text>
                <Text style={styles.locationAddress} numberOfLines={1}>
                  {item.address || "GPS Coordinates"}
                </Text>
                <Text style={styles.locationCoords}>
                  {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => deleteLocation(item.id)}
                style={styles.deleteButton}
              >
                <IconSymbol name="trash" size={20} color={Palette.crimson} />
              </TouchableOpacity>
            </Animated.View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No saved locations yet.</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </Animated.View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={() => {
          Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign Out",
              style: "destructive",
              onPress: async () => {
                try {
                  await AsyncStorage.removeItem("userLocations");
                  await signOut();
                  if (Platform.OS !== "web") {
                    await SecureStore.deleteItemAsync("__clerk_client_jwt");
                  }
                } catch (e) {
                  console.error("Sign out error", e);
                }
              },
            },
          ]);
        }}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Map Modal */}
      <Modal visible={mapVisible} animationType="slide">
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
            onPress={(e) => setTempMapLocation(e.nativeEvent.coordinate)}
          >
            {tempMapLocation && <Marker coordinate={tempMapLocation} />}
          </MapView>

          <View style={styles.mapOverlay}>
            <Text style={styles.mapInstruction}>Tap to select location</Text>
            <View style={styles.mapButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setMapVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmMapSelection}
              >
                <Text style={styles.confirmButtonText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Palette.white,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  subTitle: {
    fontSize: 12,
    color: Palette.lightGray,
    marginBottom: 20,
    textAlign: "center",
  },
  formContainer: {
    borderRadius: 20,
    marginBottom: 25,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  blurContainer: {
    padding: 20,
    backgroundColor: "rgba(28, 28, 30, 0.6)",
  },
  label: {
    color: Palette.gold,
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10,
    padding: 12,
    color: Palette.white,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 15,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },
  iconButton: {
    backgroundColor: Palette.gold,
    width: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.gold,
    borderRadius: 10,
    backgroundColor: "rgba(255, 214, 10, 0.1)",
  },
  gpsButtonText: {
    color: Palette.gold,
    fontWeight: "600",
    fontSize: 12,
  },
  previewContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: "center",
  },
  previewText: {
    color: Palette.lightGray,
    fontSize: 12,
  },
  saveButton: {
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: Palette.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonGradient: {
    paddingVertical: 15,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: Palette.white,
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  listHeader: {
    fontSize: 12,
    fontWeight: "bold",
    color: Palette.lightGray,
    marginBottom: 15,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  locationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  locationName: {
    fontSize: 16,
    fontWeight: "bold",
    color: Palette.white,
  },
  locationAddress: {
    fontSize: 12,
    color: "#AAA",
    marginTop: 2,
  },
  locationCoords: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
    fontFamily: "monospace",
  },
  deleteButton: {
    padding: 8,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
  },
  mapInstruction: {
    color: Palette.white,
    marginBottom: 15,
    fontWeight: "bold",
  },
  mapButtons: {
    flexDirection: "row",
    gap: 15,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    backgroundColor: "#333",
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: Palette.white,
    fontWeight: "bold",
  },
  confirmButton: {
    flex: 1,
    padding: 15,
    backgroundColor: Palette.gold,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmButtonText: {
    color: Palette.black,
    fontWeight: "bold",
  },
  signOutButton: {
    marginTop: 10,
    padding: 15,
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.red,
    alignItems: "center",
    marginBottom: 80,
  },
  signOutText: {
    color: Palette.red,
    fontWeight: "bold",
    fontSize: 16,
  },
});
