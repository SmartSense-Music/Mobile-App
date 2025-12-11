import { IconSymbol } from "@/components/ui/icon-symbol";
import { MultiSelect } from "@/components/ui/multi-select";
import { Palette } from "@/constants/theme";
import {
  Environment,
  LocationService,
  MetadataService,
  MusicService,
  SavedLocation,
  TimeOfDay,
  UserAction,
} from "@/services/backend";
import { useUser } from "@clerk/clerk-expo";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UploadScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");

  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [timeOptions, setTimeOptions] = useState<TimeOfDay[]>([]);
  const [envOptions, setEnvOptions] = useState<Environment[]>([]);
  const [userActionOptions, setUserActionOptions] = useState<UserAction[]>([]);

  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedTimeIds, setSelectedTimeIds] = useState<string[]>([]);
  const [selectedEnvIds, setSelectedEnvIds] = useState<string[]>([]);
  const [selectedUserActionIds, setSelectedUserActionIds] = useState<string[]>(
    []
  );

  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null
  );
  const [detectedLocationName, setDetectedLocationName] = useState("Unknown");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          const reverse = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (reverse.length > 0) {
            const addr = reverse[0];
            const name = `${addr.city || ""}, ${addr.region || ""}`.trim();
            if (name) setDetectedLocationName(name);
          }
        }
      } catch (e) {
        console.log("Failed to get location for upload", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [locs, times, envs, actions] = await Promise.all([
        LocationService.getLocations(user.id),
        MetadataService.getTimeOfDay(),
        MetadataService.getEnvironments(),
        MetadataService.getUserActions(),
      ]);
      setLocations(locs);
      setTimeOptions(times);
      setEnvOptions(envs);
      setUserActionOptions(actions);
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        setFile(result.assets[0]);
        // Auto-fill title if empty
        if (!title) {
          const name = result.assets[0].name.replace(/\.[^/.]+$/, "");
          setTitle(name);
        }
      }
    } catch (err) {
      console.error("Error picking document:", err);
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !artist) {
      Alert.alert(
        "Missing Information",
        "Please select a file and fill in all fields."
      );
      return;
    }

    if (
      selectedTimeIds.length === 0 ||
      selectedEnvIds.length === 0 ||
      selectedUserActionIds.length === 0
    ) {
      Alert.alert(
        "Missing Information",
        "Please select at least one time, environment, and user action."
      );
      return;
    }

    setIsUploading(true);
    try {
      if (!user) {
        Alert.alert("Error", "You must be logged in to upload music.");
        setIsUploading(false);
        return;
      }

      // Map IDs to names for backend if needed, or just use IDs if backend expects IDs.
      // Assuming backend expects names based on previous code.
      const selectedTimeNames = timeOptions
        .filter((t) => selectedTimeIds.includes(t.id))
        .map((t) => t.name);

      const selectedEnvNames = envOptions
        .filter((e) => selectedEnvIds.includes(e.id))
        .map((e) => e.name);

      const selectedUserActionNames = userActionOptions
        .filter((a) => selectedUserActionIds.includes(a.id))
        .map((a) => a.name);

      const selectedLocationNames = locations
        .filter((l) => selectedLocationIds.includes(l.id))
        .map((l) => l.name);

      // If no location selected, maybe use detected location?
      // Or just join selected locations.
      const locationString =
        selectedLocationNames.length > 0
          ? selectedLocationNames.join(", ")
          : detectedLocationName;

      const success = await MusicService.uploadMusic(file.uri, {
        title,
        artist,
        timeOfDay: selectedTimeNames,
        environment: selectedEnvNames,
        userActions: selectedUserActionNames,
        location: locationString,
        userId: user.id,
      });

      if (success) {
        Alert.alert("Success", "Music uploaded successfully!");
        // Reset form
        setTitle("");
        setArtist("");
        setFile(null);
        setSelectedTimeIds([]);
        setSelectedEnvIds([]);
        setSelectedUserActionIds([]);
        setSelectedLocationIds([]);
        // Navigate to music tab to see the new song
        router.push("/(tabs)/music");
      } else {
        Alert.alert("Error", "Failed to upload music. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Palette.black, Palette.darkGray]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>UPLOAD MUSIC</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.label}>Music File</Text>
          <TouchableOpacity style={styles.fileButton} onPress={pickDocument}>
            <IconSymbol
              name={file ? "checkmark.circle.fill" : "arrow.up.doc.fill"}
              size={24}
              color={file ? Palette.gold : Palette.white}
            />
            <Text style={styles.fileButtonText}>
              {file ? file.name : "Select Audio File"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Song Title"
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Artist</Text>
          <TextInput
            style={styles.input}
            placeholder="Artist Name"
            placeholderTextColor="#666"
            value={artist}
            onChangeText={setArtist}
          />

          <MultiSelect
            label="Locations"
            options={locations}
            selectedValues={selectedLocationIds}
            onSelectionChange={setSelectedLocationIds}
            placeholder="Select locations..."
          />

          <MultiSelect
            label="Time of Day"
            options={timeOptions}
            selectedValues={selectedTimeIds}
            onSelectionChange={setSelectedTimeIds}
            placeholder="Select time of day..."
          />

          <MultiSelect
            label="Environment"
            options={envOptions}
            selectedValues={selectedEnvIds}
            onSelectionChange={setSelectedEnvIds}
            placeholder="Select environments..."
          />

          <MultiSelect
            label="User Actions"
            options={userActionOptions}
            selectedValues={selectedUserActionIds}
            onSelectionChange={setSelectedUserActionIds}
            placeholder="Select user actions..."
          />

          <TouchableOpacity
            style={[styles.uploadButton, isUploading && styles.disabledButton]}
            onPress={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color={Palette.black} />
            ) : (
              <Text style={styles.uploadButtonText}>Upload Music</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  headerTitle: {
    color: Palette.white,
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Extra padding for tab bar
  },
  label: {
    color: Palette.lightGray,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 15,
    color: Palette.white,
    fontSize: 16,
  },
  fileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderStyle: "dashed",
  },
  fileButtonText: {
    color: Palette.white,
    marginLeft: 10,
    fontSize: 16,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    padding: 10,
    borderRadius: 10,
    alignSelf: "flex-start",
    gap: 8,
  },
  locationText: {
    color: Palette.gold,
    fontSize: 14,
    fontWeight: "600",
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionChip: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  activeOption: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderColor: Palette.gold,
  },
  optionText: {
    color: Palette.lightGray,
    fontSize: 14,
  },
  activeOptionText: {
    color: Palette.gold,
    fontWeight: "bold",
  },
  uploadButton: {
    backgroundColor: Palette.gold,
    padding: 18,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  disabledButton: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: Palette.black,
    fontSize: 16,
    fontWeight: "bold",
  },
});
