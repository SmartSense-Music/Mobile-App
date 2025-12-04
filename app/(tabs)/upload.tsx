import { IconSymbol } from "@/components/ui/icon-symbol";
import { Palette } from "@/constants/theme";
import { MusicService } from "@/services/backend";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

const TIME_OPTIONS = ["Morning", "Afternoon", "Evening", "Night"];
const ENV_OPTIONS = [
  "Indoor",
  "Outdoor",
  "Gym",
  "Commute",
  "Dark",
  "Bright",
  "Office",
  "Cafe",
  "Park",
  "Beach",
  "Rainy",
  "Sunny",
  "Study",
  "Party",
  "Relax",
  "Sleep",
  "Drive",
  "Walk",
];

export default function UploadScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [selectedTimes, setSelectedTimes] = useState<string[]>([
    TIME_OPTIONS[0],
  ]);
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>([ENV_OPTIONS[0]]);
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);

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

  const toggleSelection = (
    item: string,
    list: string[],
    setList: (items: string[]) => void
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
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

    if (selectedTimes.length === 0 || selectedEnvs.length === 0) {
      Alert.alert(
        "Missing Information",
        "Please select at least one time and environment."
      );
      return;
    }

    setIsUploading(true);
    try {
      const success = await MusicService.uploadMusic(file.uri, {
        title,
        artist,
        timeOfDay: selectedTimes,
        environment: selectedEnvs,
        location: "Unknown", // TODO: Get real location
      });

      if (success) {
        Alert.alert("Success", "Music uploaded successfully!");
        console.log("Music uploaded:", {
          title,
          artist,
          selectedTimes,
          selectedEnvs,
        });
        // Reset form
        setTitle("");
        setArtist("");
        setFile(null);
        setSelectedTimes([TIME_OPTIONS[0]]);
        setSelectedEnvs([ENV_OPTIONS[0]]);
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

          <Text style={styles.label}>Time of Day (Select multiple)</Text>
          <View style={styles.optionsContainer}>
            {TIME_OPTIONS.map((option) => {
              const isSelected = selectedTimes.includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionChip, isSelected && styles.activeOption]}
                  onPress={() =>
                    toggleSelection(option, selectedTimes, setSelectedTimes)
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.activeOptionText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Environment (Select multiple)</Text>
          <View style={styles.optionsContainer}>
            {ENV_OPTIONS.map((option) => {
              const isSelected = selectedEnvs.includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionChip, isSelected && styles.activeOption]}
                  onPress={() =>
                    toggleSelection(option, selectedEnvs, setSelectedEnvs)
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.activeOptionText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
