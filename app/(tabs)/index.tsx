import { IconSymbol } from "@/components/ui/icon-symbol";
import { Palette } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { Accelerometer, Gyroscope, LightSensor } from "expo-sensors";
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
  const [sensorData, setSensorData] = useState({
    accelerometer: { x: 0, y: 0, z: 0 },
    gyroscope: { x: 0, y: 0, z: 0 },
    location: null as Location.LocationObject | null,
    light: 0,
  });

  const [context, setContext] = useState({
    activity: "Stationary",
    timeOfDay: "Day",
    locationName: "Unknown",
    environment: "Unknown",
  });

  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);

  // Theme State
  const [themeMode, setThemeMode] = useState<"auto" | "light" | "dark">("auto");
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">("dark");

  const lastUpdateRef = useRef<number>(0);
  const accelHistory = useRef<number[]>([]);

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
      if (sensorData.light > 100) {
        setActiveTheme("light");
      } else {
        setActiveTheme("dark");
      }
    } else {
      setActiveTheme(themeMode);
    }
  }, [sensorData.light, themeMode]);

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

  useEffect(() => {
    let accelSubscription: any;
    let gyroSubscription: any;
    let lightSubscription: any;

    const startSensors = async () => {
      Accelerometer.setUpdateInterval(100);
      accelSubscription = Accelerometer.addListener((data) => {
        const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
        accelHistory.current.push(magnitude);
        if (accelHistory.current.length > 20) accelHistory.current.shift();
        setSensorData((prev) => ({ ...prev, accelerometer: data }));
      });

      Gyroscope.setUpdateInterval(500);
      gyroSubscription = Gyroscope.addListener((data) => {
        setSensorData((prev) => ({ ...prev, gyroscope: data }));
      });

      if (await LightSensor.isAvailableAsync()) {
        LightSensor.setUpdateInterval(1000);
        lightSubscription = LightSensor.addListener((data) => {
          setSensorData((prev) => ({ ...prev, light: data.illuminance }));
        });
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
    };

    startSensors();

    const intervalId = setInterval(async () => {
      await updateContext();
    }, 10000);

    updateContext();

    return () => {
      accelSubscription && accelSubscription.remove();
      gyroSubscription && gyroSubscription.remove();
      lightSubscription && lightSubscription.remove();
      clearInterval(intervalId);
    };
  }, [savedLocations]);

  const updateContext = async () => {
    let activity = "Stationary";
    if (accelHistory.current.length > 0) {
      const avg =
        accelHistory.current.reduce((a, b) => a + b, 0) /
        accelHistory.current.length;
      const variance =
        accelHistory.current.reduce((a, b) => a + (b - avg) ** 2, 0) /
        accelHistory.current.length;
      if (variance > 0.05) activity = "Running";
      else if (variance > 0.005) activity = "Walking";
      else activity = "Stationary";
    }

    const hour = new Date().getHours();
    let timeOfDay = "Night";
    if (hour >= 5 && hour < 12) timeOfDay = "Morning";
    else if (hour >= 12 && hour < 17) timeOfDay = "Afternoon";
    else if (hour >= 17 && hour < 21) timeOfDay = "Evening";

    let locationName = "Not Specificed";
    let currentLocation = null;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        currentLocation = await Location.getCurrentPositionAsync({});
        let foundSavedLocation = false;
        for (const loc of savedLocations) {
          const dist = getDistanceFromLatLonInKm(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude,
            loc.latitude,
            loc.longitude
          );
          if (dist < 0.1) {
            locationName = loc.name;
            foundSavedLocation = true;
            break;
          }
        }

        if (!foundSavedLocation) {
          try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            });
            if (reverseGeocode.length > 0) {
              const addr = reverseGeocode[0];
              const place = addr.city || addr.street || "Unknown Place";
              locationName = place;
            } else {
              locationName = "Unknown Area";
            }
          } catch (e) {
            locationName = "Unknown Area";
          }
        }
      }
    } catch (e) {
      console.log("Location error", e);
    }

    let environment = "Indoors";
    if (sensorData.light > 1000) environment = "Outdoors";
    else if (sensorData.light < 50) environment = "Dark";
    else environment = "Indoors";

    const newContext = { activity, timeOfDay, locationName, environment };
    setContext(newContext);
  };

  function getDistanceFromLatLonInKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) {
    var R = 6371;
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
  }

  function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

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
                  {context.activity}
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
                  {context.timeOfDay}
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
                  {context.locationName}
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
                  {context.environment}
                </Text>
                <Text
                  style={[styles.debugText, { color: currentTheme.subText }]}
                >
                  {Math.round(sensorData.light)} lux
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
            Context updated every 10s
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
