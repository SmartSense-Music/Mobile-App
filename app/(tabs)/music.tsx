import { IconSymbol } from "@/components/ui/icon-symbol";
import { Palette } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useSensor } from "@/context/SensorContext";
import { InteractionService, MusicService, Song } from "@/services/backend";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
const { width } = Dimensions.get("window");

export default function MusicScreen() {
  const { user } = useAuth();
  const { timeOfDay, locationName, environment, userAction } = useSensor();

  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Song | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [isLiked, setIsLiked] = useState(false);

  const playlistRef = useRef<Song[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    if (currentTrack) {
      setIsLiked(false);
    }
  }, [currentTrack]);

  // Build context object for MusicService
  const musicContext = useMemo(() => {
    return {
      timeOfDay,
      environment,
      location: locationName,
      userAction,
    };
  }, [timeOfDay, locationName, environment, userAction]);

  useEffect(() => {
    loadSongs();
  }, [musicContext]);

  // Pause music automatically when arriving at important places
  useEffect(() => {
    const importantKeywords = [
      "school",
      "institute",
      "police",
      "court",
      "hospital",
      "college",
      "university",
      "clinic",
    ];

    if (!locationName || locationName === "Unknown") return;

    const lowerName = String(locationName).toLowerCase();
    const matched = importantKeywords.some((k) => lowerName.includes(k));

    if (matched && soundRef.current) {
      (async () => {
        try {
          const status = await soundRef.current?.getStatusAsync();
          if (status?.isLoaded && status?.isPlaying) {
            await soundRef.current?.pauseAsync();
            setIsPlaying(false);
          }
        } catch (e) {
          console.warn("Failed to pause sound on important location:", e);
        }
      })();
    }
  }, [locationName]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadSongs = async () => {
    setIsLoading(true);

    console.log("Fetching playlist for:", musicContext, "User ID:", user?.id);

    const songs = await MusicService.getSongs({
      timeOfDay: musicContext.timeOfDay,
      environment: musicContext.environment,
      location: musicContext.location,
      action: musicContext.userAction,
      userId: user?.id,
    });

    setPlaylist(songs);

    if (songs.length > 0) {
      const firstSong = songs[0];
      // If current track is different from the new first song, reset
      if (!currentTrack || currentTrack.id !== firstSong.id) {
        setCurrentTrack(firstSong);

        // Unload previous sound so "Play" starts the new song
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
          setSound(null);
          setIsPlaying(false);
        }
      }
    }

    setIsLoading(false);
  };

  const playSound = async (track: Song) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true }
      );

      soundRef.current = newSound;
      setSound(newSound);
      setCurrentTrack(track);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);

          if (status.didJustFinish) {
            const currentPlaylist = playlistRef.current;
            const currentIndex = currentPlaylist.findIndex(
              (s) => s.id === track.id
            );
            if (
              currentIndex !== -1 &&
              currentIndex < currentPlaylist.length - 1
            ) {
              const nextSong = currentPlaylist[currentIndex + 1];
              await playSound(nextSong);
            }
          }
        }
      });
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  const handleSkip = async () => {
    if (!currentTrack) return;

    const currentIndex = playlist.findIndex((s) => s.id === currentTrack.id);
    if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
      await playSound(playlist[currentIndex + 1]);
    }
  };

  const handleLike = async () => {
    if (!currentTrack || !user?.id) return;

    setIsLiked(!isLiked);

    InteractionService.recordInteraction(user.id, currentTrack.id);
  };

  const togglePlayback = async () => {
    if (!soundRef.current && currentTrack) {
      await playSound(currentTrack);
      return;
    }

    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
      }
    }
  };

  console.log("Render State:", {
    isLoading,
    playlistLength: playlist.length,
    currentTrackId: currentTrack?.id,
    isPlaying,
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Palette.black, "#1a1a1a"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>SMARTSENSE PLAYER</Text>
        <View style={styles.contextBadge}>
          <IconSymbol name="sparkles" size={12} color={Palette.gold} />
          <Text style={styles.contextText}>
            {musicContext.timeOfDay} • {musicContext.environment}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Palette.gold} />
          <Text style={styles.loadingText}>Curating Playlist...</Text>
        </View>
      ) : (
        <>
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.playerSection}
          >
            <View style={styles.albumArtContainer}>
              <LinearGradient
                colors={[Palette.darkGray, "#000"]}
                style={styles.albumArt}
              >
                {currentTrack?.coverUrl ? (
                  <Image
                    source={{ uri: currentTrack.coverUrl }}
                    style={styles.coverImage}
                  />
                ) : (
                  <IconSymbol
                    name="music.note"
                    size={80}
                    color={Palette.gold}
                  />
                )}
              </LinearGradient>
              <View style={styles.glow} />
            </View>

            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {currentTrack?.title || "Select a Song"}
              </Text>
              <Text style={styles.artistName}>
                {currentTrack?.artist || "SmartSense"}
              </Text>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity onPress={handleLike}>
                <IconSymbol
                  name={isLiked ? "heart.fill" : "heart"}
                  size={24}
                  color={isLiked ? Palette.crimson : Palette.white}
                />
              </TouchableOpacity>
              <TouchableOpacity>
                <IconSymbol
                  name="backward.fill"
                  size={30}
                  color={Palette.white}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayback}
              >
                <LinearGradient
                  colors={[Palette.gold, "#FFC107"]}
                  style={styles.playButtonGradient}
                >
                  <IconSymbol
                    name={isPlaying ? "pause.fill" : "play.fill"}
                    size={35}
                    color={Palette.black}
                  />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSkip}>
                <IconSymbol
                  name="forward.fill"
                  size={30}
                  color={Palette.white}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={styles.playlistContainer}>
            <BlurView intensity={30} tint="dark" style={styles.blurList}>
              <Text style={styles.sectionTitle}>
                CURATED FOR {(musicContext.environment || "YOU").toUpperCase()}
              </Text>
              {playlist.length === 0 ? (
                <View style={styles.center}>
                  <Text style={{ color: Palette.subText }}>
                    No music found for this context.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={playlist}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 100 }}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity onPress={() => playSound(item)}>
                      <View
                        style={[
                          styles.trackItem,
                          currentTrack?.id === item.id &&
                            styles.activeTrackItem,
                        ]}
                      >
                        <View style={styles.trackIcon}>
                          <IconSymbol
                            name="music.note"
                            size={20}
                            color={
                              currentTrack?.id === item.id
                                ? Palette.gold
                                : Palette.lightGray
                            }
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.itemTitle,
                              currentTrack?.id === item.id &&
                                styles.activeTrackText,
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text style={styles.itemArtist} numberOfLines={1}>
                            {item.artist}
                          </Text>
                        </View>

                        <Text style={styles.itemDuration}>
                          {Math.floor(item.duration / 60)}.
                          {String(Math.floor(item.duration % 60)).padStart(
                            2,
                            "0"
                          )}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </BlurView>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
    paddingTop: 50,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: Palette.lightGray,
    marginTop: 10,
    fontSize: 12,
    letterSpacing: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    color: Palette.lightGray,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  contextBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  contextText: {
    color: Palette.gold,
    fontSize: 12,
    fontWeight: "600",
  },
  playerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  albumArtContainer: {
    alignItems: "center",
    marginBottom: 25,
    position: "relative",
  },
  albumArt: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    zIndex: 2,
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  glow: {
    position: "absolute",
    top: 20,
    width: width * 0.5,
    height: width * 0.5,
    backgroundColor: Palette.gold,
    opacity: 0.15,
    borderRadius: 20,
    transform: [{ scale: 1.1 }],
    zIndex: 1,
    shadowColor: Palette.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },
  trackInfo: {
    alignItems: "center",
    marginBottom: 25,
    paddingHorizontal: 40,
  },
  trackTitle: {
    color: Palette.white,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  artistName: {
    color: Palette.crimson,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
  },
  playButton: {
    shadowColor: Palette.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  playButtonGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  playlistContainer: {
    flex: 1,
    marginHorizontal: 15,
    marginBottom: 10,
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
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  trackIcon: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemTitle: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
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
  activeTrackItem: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginHorizontal: -10,
  },
  activeTrackText: {
    color: Palette.gold,
  },
});
