import { IconSymbol } from "@/components/ui/icon-symbol";
import { Palette } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { BackendService } from "@/services/backend";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const { width } = Dimensions.get("window");

const PLAYLIST = [
  {
    id: "1",
    title: "Morning Boost",
    artist: "SmartSense Mix",
    duration: "3:45",
  },
  { id: "2", title: "Focus Flow", artist: "Ambient Works", duration: "4:20" },
  { id: "3", title: "Running Tempo", artist: "High BPM", duration: "3:10" },
  { id: "4", title: "Night Chill", artist: "LoFi Beats", duration: "2:55" },
  { id: "5", title: "Deep Sleep", artist: "Nature Sounds", duration: "5:00" },
];

export default function MusicScreen() {
  const { user, spotifyToken, signInWithSpotify, isLoading } = useAuth();

  const handlePlayContext = async () => {
    if (spotifyToken) {
      // Mock context for now, ideally passed from global state
      const context = { activity: "Stationary", timeOfDay: "Morning" };
      await BackendService.playContextSong(spotifyToken, context);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Palette.gold} />
      </View>
    );
  }

  if (!spotifyToken || !user) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar style="light" />
        <LinearGradient
          colors={[Palette.black, Palette.darkGray]}
          style={StyleSheet.absoluteFill}
        />
        <IconSymbol name="music.note" size={60} color={"#1DB954"} />
        <Text style={styles.authTitle}>Connect Spotify</Text>
        <Text style={styles.authSubtitle}>Link your account to play music</Text>

        <TouchableOpacity
          style={[styles.authButton, { backgroundColor: "#1DB954" }]}
          onPress={signInWithSpotify}
        >
          <Text style={styles.authButtonText}>Connect Spotify</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>NOW PLAYING</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).duration(600)}
        style={styles.albumArtContainer}
      >
        <LinearGradient
          colors={[Palette.darkGray, "#000"]}
          style={styles.albumArt}
        >
          <IconSymbol name="music.note" size={80} color={Palette.gold} />
        </LinearGradient>
        {/* Reflection/Glow effect */}
        <View style={styles.glow} />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(600)}
        style={styles.trackInfo}
      >
        <Text style={styles.trackTitle}>Context Aware Mix</Text>
        <Text style={styles.artistName}>SmartSense AI</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).duration(600)}
        style={styles.controls}
      >
        <TouchableOpacity>
          <IconSymbol name="backward.fill" size={35} color={Palette.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayContext}>
          <LinearGradient
            colors={[Palette.gold, "#FFC107"]}
            style={styles.playButtonGradient}
          >
            <IconSymbol name="play.fill" size={35} color={Palette.black} />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity>
          <IconSymbol name="forward.fill" size={35} color={Palette.white} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(500).duration(600)}
        style={styles.playlistContainer}
      >
        <BlurView intensity={20} tint="dark" style={styles.blurList}>
          <Text style={styles.sectionTitle}>UP NEXT</Text>
          <FlatList
            data={PLAYLIST}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInDown.delay(600 + index * 100).duration(500)}
                style={styles.trackItem}
              >
                <View style={styles.trackIcon}>
                  <IconSymbol
                    name="music.note"
                    size={20}
                    color={Palette.lightGray}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemArtist}>{item.artist}</Text>
                </View>
                <Text style={styles.itemDuration}>{item.duration}</Text>
              </Animated.View>
            )}
          />
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
    paddingTop: 60,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Palette.white,
    marginTop: 20,
    marginBottom: 10,
  },
  authSubtitle: {
    fontSize: 16,
    color: Palette.lightGray,
    marginBottom: 30,
    textAlign: "center",
  },
  authButton: {
    backgroundColor: Palette.white,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: "80%",
    alignItems: "center",
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: Palette.black,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  headerTitle: {
    color: Palette.lightGray,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  albumArtContainer: {
    alignItems: "center",
    marginBottom: 30,
    position: "relative",
  },
  albumArt: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    zIndex: 2,
  },
  glow: {
    position: "absolute",
    top: 20,
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: Palette.gold,
    opacity: 0.15,
    borderRadius: 20,
    transform: [{ scale: 1.1 }],
    zIndex: 1,
    // Using shadow for glow
    shadowColor: Palette.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },
  trackInfo: {
    alignItems: "center",
    marginBottom: 40,
  },
  trackTitle: {
    color: Palette.white,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  artistName: {
    color: Palette.crimson,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 50,
    marginBottom: 40,
  },
  playButton: {
    shadowColor: Palette.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  playButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  playlistContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  blurList: {
    flex: 1,
    padding: 20,
    backgroundColor: "rgba(28, 28, 30, 0.6)",
  },
  sectionTitle: {
    color: Palette.lightGray,
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  trackIcon: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  itemTitle: {
    color: Palette.white,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemArtist: {
    color: "#888",
    fontSize: 12,
  },
  itemDuration: {
    color: "#666",
    fontSize: 12,
    fontWeight: "500",
  },
});
