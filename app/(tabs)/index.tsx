import { IconSymbol } from "@/components/ui/icon-symbol";
import { Palette } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { Accelerometer, Gyroscope } from "expo-sensors";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ColorValue,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type SavedLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

const THEMES = {
  dark: {
    background: [Palette.black, Palette.darkGray],
    text: Palette.white,
    subText: Palette.lightGray,
    cardTint: "dark" as const,
    cardBorder: "rgba(255,255,255,0.1)",
    blurBg: "rgba(28, 28, 30, 0.6)",
    secondaryBtnBg: "rgba(255,255,255,0.1)",
    secondaryBtnBorder: "rgba(255,255,255,0.1)",
    secondaryBtnText: Palette.white,
    iconColor: Palette.white,
    accent: Palette.red,
  },
  light: {
    background: ["#FFFFFF", "#E5E5EA"],
    text: Palette.black,
    subText: "#666666",
    cardTint: "light" as const,
    cardBorder: "rgba(0,0,0,0.05)",
    blurBg: "rgba(255, 255, 255, 0.7)",
    secondaryBtnBg: "rgba(0,0,0,0.05)",
    secondaryBtnBorder: "rgba(0,0,0,0.1)",
    secondaryBtnText: Palette.black,
    iconColor: Palette.black,
    accent: Palette.red,
  },
};

export default function HomeScreen() {
  const router = useRouter();

  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [activity, setActivity] = useState("Stationary");
  const [environment, setEnvironment] = useState("Indoors");
  const [timeOfDay, setTimeOfDay] = useState("Day");
  const [locationName, setLocationName] = useState("Unknown");
  const [soundLevel, setSoundLevel] = useState(0);

  const isRecordingRef = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Environment Logic (Time, Location, Sound)
  useEffect(() => {
    const checkEnvironment = async () => {
      // 1. Time
      const hour = new Date().getHours();
      const time = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
      setTimeOfDay(time);

      // 2. Location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});

          // Check if near any saved location
          let foundLocation = "Unknown";
          let minDistance = Infinity;

          const stored = await AsyncStorage.getItem("userLocations");
          const locations: SavedLocation[] = stored ? JSON.parse(stored) : [];

          for (const saved of locations) {
            const dist = Math.sqrt(
              Math.pow(loc.coords.latitude - saved.latitude, 2) +
                Math.pow(loc.coords.longitude - saved.longitude, 2)
            );
            if (dist < 0.001 && dist < minDistance) {
              minDistance = dist;
              foundLocation = saved.name;
            }
          }
          setLocationName(foundLocation);
        }
      } catch (e) {
        console.log("Location error", e);
      }

      // 3. Sound (Brief sampling)
      if (isRecordingRef.current) return; // Skip if already recording

      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status === "granted") {
          isRecordingRef.current = true;

          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });

          // Ensure previous recording is unloaded
          if (recordingRef.current) {
            try {
              await recordingRef.current.stopAndUnloadAsync();
            } catch (e) {
              // Ignore unload errors
            }
            recordingRef.current = null;
          }

          const recording = new Audio.Recording();
          recordingRef.current = recording;

          await recording.prepareToRecordAsync(
            Audio.RecordingOptionsPresets.LOW_QUALITY
          );
          await recording.startAsync();

          // Sample for a short time
          setTimeout(async () => {
            try {
              if (recordingRef.current) {
                const status = await recordingRef.current.getStatusAsync();
                if (status.isRecording) {
                  const metering = status.metering || -160;
                  setSoundLevel(metering);
                }
                await recordingRef.current.stopAndUnloadAsync();
              }
            } catch (e) {
              console.log("Audio stop error", e);
            } finally {
              recordingRef.current = null;
              isRecordingRef.current = false;
            }
          }, 500);
        }
      } catch (e) {
        console.log("Audio start error", e);
        isRecordingRef.current = false;
        if (recordingRef.current) {
          try {
            await recordingRef.current.stopAndUnloadAsync();
          } catch (err) {}
          recordingRef.current = null;
        }
      }
    };

    // Run check every 10 seconds
    const interval = setInterval(checkEnvironment, 10000);
    checkEnvironment(); // Initial check

    return () => {
      clearInterval(interval);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  // Derive Environment Label
  useEffect(() => {
    let env = "Indoors";

    if (activity === "Running") env = "Exercise";
    else if (locationName !== "Unknown")
      env = locationName; // e.g. "Gym", "Home"
    else if (soundLevel > -10) env = "Noisy"; // Threshold for loud environment
    else if (timeOfDay === "Evening" || timeOfDay === "Night") env = "Relaxing";

    setEnvironment(env);
  }, [activity, locationName, soundLevel, timeOfDay]);

  // Sensor Logic
  useEffect(() => {
    Accelerometer.setUpdateInterval(500);
    Gyroscope.setUpdateInterval(500);

    let accelData = { x: 0, y: 0, z: 0 };
    let gyroData = { x: 0, y: 0, z: 0 };

    const handleUpdate = () => {
      const accelMag = Math.sqrt(
        accelData.x ** 2 + accelData.y ** 2 + accelData.z ** 2
      );
      const gyroMag = Math.sqrt(
        gyroData.x ** 2 + gyroData.y ** 2 + gyroData.z ** 2
      );

      // Combined threshold logic
      if (accelMag > 1.6 || gyroMag > 3.0) {
        setActivity("Running");
      } else if (accelMag > 1.1 || gyroMag > 0.5) {
        setActivity("Walking");
      } else {
        setActivity("Stationary");
      }
    };

    const accelSub = Accelerometer.addListener((data) => {
      accelData = data;
      handleUpdate();
    });

    const gyroSub = Gyroscope.addListener((data) => {
      gyroData = data;
      handleUpdate();
    });

    return () => {
      accelSub && accelSub.remove();
      gyroSub && gyroSub.remove();
    };
  }, []);

  // Theme State
  const [themeMode, setThemeMode] = useState<"auto" | "light" | "dark">("auto");
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">("dark");

  // Animation Values
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // Theme Logic
  useEffect(() => {
    if (themeMode === "auto") {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 18) {
        setActiveTheme("light");
      } else {
        setActiveTheme("dark");
      }
    } else {
      setActiveTheme(themeMode);
    }
  }, [themeMode]);

  const toggleTheme = () => {
    if (themeMode === "auto") setThemeMode("light");
    else if (themeMode === "light") setThemeMode("dark");
    else setThemeMode("auto");
  };

  const currentTheme = THEMES[activeTheme];

  // Load saved locations whenever the screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadLocations = async () => {
        try {
          const stored = await AsyncStorage.getItem("userLocations");
          if (stored) {
            setSavedLocations(JSON.parse(stored));
          }
        } catch (e) {
          console.error(e);
        }
      };
      loadLocations();
    }, [])
  );

  return (
    <View style={styles.container}>
      <StatusBar style={activeTheme === "dark" ? "light" : "dark"} />
      <LinearGradient
        colors={currentTheme.background as readonly [ColorValue, ColorValue]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(600)}
        style={styles.header}
      >
        <View>
          <Text style={[styles.logoTitle, { color: currentTheme.text }]}>
            SmartSense
          </Text>
          <Text style={[styles.logoSubtitle, { color: currentTheme.accent }]}>
            MUSIC
          </Text>
        </View>

        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.themeButton,
            {
              backgroundColor: currentTheme.secondaryBtnBg,
              borderColor: currentTheme.secondaryBtnBorder,
            },
          ]}
        >
          <IconSymbol
            name={
              themeMode === "auto"
                ? "sparkles"
                : themeMode === "dark"
                ? "moon.fill"
                : "sun.max.fill"
            }
            size={18}
            color={currentTheme.iconColor}
          />
          <Text style={[styles.themeButtonText, { color: currentTheme.text }]}>
            {themeMode === "auto"
              ? "Auto"
              : themeMode === "dark"
              ? "Dark"
              : "Light"}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Main Context Display */}
      <View style={styles.content}>
        <Animated.View
          entering={FadeInDown.delay(200).duration(600)}
          style={[
            styles.cardContainer,
            { borderColor: currentTheme.cardBorder },
          ]}
        >
          <BlurView
            intensity={30}
            tint={currentTheme.cardTint}
            style={[
              styles.blurContainer,
              { backgroundColor: currentTheme.blurBg },
            ]}
          >
            <Animated.View style={[styles.contextCard, animatedPulseStyle]}>
              <View style={styles.iconContainer}>
                <IconSymbol name="figure.walk" size={32} color={Palette.red} />
              </View>
              <View style={styles.textContainer}>
                <Text
                  style={[styles.contextLabel, { color: currentTheme.subText }]}
                >
                  ACTIVITY
                </Text>
                <Text
                  style={[styles.contextValue, { color: currentTheme.text }]}
                >
                  {activity}
                </Text>
              </View>
            </Animated.View>
          </BlurView>
        </Animated.View>

        <View style={styles.row}>
          <Animated.View
            entering={FadeInDown.delay(300).duration(600)}
            style={[
              styles.cardContainer,
              styles.halfCard,
              { borderColor: currentTheme.cardBorder },
            ]}
          >
            <BlurView
              intensity={30}
              tint={currentTheme.cardTint}
              style={[
                styles.blurContainer,
                { backgroundColor: currentTheme.blurBg },
              ]}
            >
              <View style={styles.contextCardVertical}>
                <IconSymbol
                  name="clock.fill"
                  size={28}
                  color={Palette.gold}
                  style={{ marginBottom: 12 }}
                />
                <Text
                  style={[styles.contextLabel, { color: currentTheme.subText }]}
                >
                  TIME
                </Text>
                <Text
                  style={[
                    styles.contextValueSmall,
                    { color: currentTheme.text },
                  ]}
                >
                  {timeOfDay}
                </Text>
              </View>
            </BlurView>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            style={[
              styles.cardContainer,
              styles.halfCard,
              { borderColor: currentTheme.cardBorder },
            ]}
          >
            <BlurView
              intensity={30}
              tint={currentTheme.cardTint}
              style={[
                styles.blurContainer,
                { backgroundColor: currentTheme.blurBg },
              ]}
            >
              <View style={styles.contextCardVertical}>
                <IconSymbol
                  name="location.fill"
                  size={28}
                  color={Palette.gold}
                  style={{ marginBottom: 12 }}
                />
                <Text
                  style={[styles.contextLabel, { color: currentTheme.subText }]}
                >
                  LOCATION
                </Text>
                <Text
                  style={[
                    styles.contextValueSmall,
                    { color: currentTheme.text },
                  ]}
                  numberOfLines={1}
                >
                  {locationName}
                </Text>
              </View>
            </BlurView>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInDown.delay(500).duration(600)}
          style={[
            styles.cardContainer,
            { borderColor: currentTheme.cardBorder },
          ]}
        >
          <BlurView
            intensity={30}
            tint={currentTheme.cardTint}
            style={[
              styles.blurContainer,
              { backgroundColor: currentTheme.blurBg },
            ]}
          >
            <View style={styles.contextCard}>
              <View style={styles.iconContainer}>
                <IconSymbol
                  name="sun.max.fill"
                  size={32}
                  color={Palette.gold}
                />
              </View>
              <View style={styles.textContainer}>
                <Text
                  style={[styles.contextLabel, { color: currentTheme.subText }]}
                >
                  ENVIRONMENT
                </Text>
                <Text
                  style={[styles.contextValue, { color: currentTheme.text }]}
                >
                  {environment}
                </Text>
                <Text
                  style={[styles.debugText, { color: currentTheme.subText }]}
                >
                  {soundLevel.toFixed(1)} dB
                </Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Animated.View
          entering={FadeInUp.delay(600).duration(600)}
          style={styles.actionContainer}
        >
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/music")}
          >
            <LinearGradient
              colors={[Palette.red, Palette.crimson]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              <View style={styles.buttonIconCircle}>
                <IconSymbol name="music.note" size={24} color={Palette.red} />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.actionButtonTitle}>Start Listening</Text>
                <Text style={styles.actionButtonSubtitle}>
                  Smart Playlist Ready
                </Text>
              </View>
              <IconSymbol
                name="play.fill"
                size={28}
                color={Palette.white}
                style={{ opacity: 0.9 }}
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(700).duration(600)}>
          <Text style={[styles.footerText, { color: currentTheme.subText }]}>
            Context updated every 10m
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  actionContainer: {
    width: "100%",
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 4,
    marginTop: 2,
  },
  themeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  cardContainer: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  blurContainer: {
    padding: 16,
  },
  contextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  contextCardVertical: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
  },
  halfCard: {
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  contextLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 2,
    opacity: 0.8,
  },
  contextValue: {
    fontSize: 20,
    fontWeight: "600",
  },
  contextValueSmall: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  debugText: {
    fontSize: 9,
    marginTop: 2,
    opacity: 0.6,
  },
  footer: {
    marginBottom: 90,
    alignItems: "center",
    gap: 12,
  },
  footerText: {
    fontSize: 11,
    opacity: 0.7,
  },
  actionButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Palette.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradientButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  buttonTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  actionButtonTitle: {
    color: Palette.white,
    fontSize: 17,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  actionButtonSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "500",
  },
});
