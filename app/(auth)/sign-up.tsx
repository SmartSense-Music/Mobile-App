import { IconSymbol } from "@/components/ui/icon-symbol";
import { Palette } from "@/constants/theme";
import { useSignUp } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BACKEND_URL } from "@/constants/config";
import { useAuth } from "@/context/AuthContext";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const { user } = useAuth();

  const onSignUpPress = async () => {
    if (!isLoaded) {
      return;
    }

    if (!emailAddress || !password) {
      alert("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      await signUp.create({
        emailAddress: emailAddress.trim(),
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      alert(err.errors[0].message);
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) {
      return;
    }
    setLoading(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        console.log(completeSignUp.createdUserId);
        // Add user to database backend
        try {
          const createUserResponse = await fetch(
            `${BACKEND_URL}/api/users/create`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: completeSignUp.createdUserId,
                emailAddress,
              }),
            }
          );
          if (createUserResponse.ok) {
            console.log("User added to database");
          } else {
            console.warn("Failed to add user to database");
          }
        } catch (dbErr) {
          console.warn("Database creation error:", dbErr);
        }

        await setActive({ session: completeSignUp.createdSessionId });
        router.replace("/(tabs)");
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      alert(err.errors[0].message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={[Palette.black, Palette.darkGray]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {!pendingVerification ? (
            <>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Sign up to get started</Text>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <TextInput
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="Email..."
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                    onChangeText={setEmailAddress}
                    style={styles.input}
                  />
                </View>

                <View style={[styles.inputContainer, styles.passwordContainer]}>
                  <TextInput
                    value={password}
                    placeholder="Password..."
                    placeholderTextColor="#666"
                    secureTextEntry={!isPasswordVisible}
                    onChangeText={setPassword}
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TouchableOpacity
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                    style={styles.eyeIcon}
                  >
                    <IconSymbol
                      name={isPasswordVisible ? "eye.slash.fill" : "eye.fill"}
                      size={20}
                      color={Palette.lightGray}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={onSignUpPress}
                  style={styles.button}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[Palette.gold, "#FFC107"]}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color={Palette.black} />
                    ) : (
                      <Text style={styles.buttonText}>Sign Up</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Already have an account?
                  </Text>
                  <Link href="/sign-in" asChild>
                    <TouchableOpacity>
                      <Text style={styles.link}>Sign In</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Verify Email</Text>
              <Text style={styles.subtitle}>
                Enter the code sent to your email
              </Text>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <TextInput
                    value={code}
                    placeholder="Code..."
                    placeholderTextColor="#666"
                    onChangeText={setCode}
                    style={styles.input}
                  />
                </View>

                <TouchableOpacity
                  onPress={onPressVerify}
                  style={styles.button}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[Palette.gold, "#FFC107"]}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color={Palette.black} />
                    ) : (
                      <Text style={styles.buttonText}>Verify Email</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  content: {
    width: "100%",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: Palette.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Palette.lightGray,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  input: {
    padding: 16,
    color: Palette.white,
    fontSize: 16,
  },
  button: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    color: Palette.black,
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  footerText: {
    color: Palette.lightGray,
  },
  link: {
    color: Palette.gold,
    fontWeight: "bold",
  },
});
