import { Palette } from "@/constants/theme";
import { useSignIn } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const onSignInPress = React.useCallback(async () => {
    if (!isLoaded) {
      return;
    }
    setLoading(true);

    try {
      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });

      // This is an important step that navigates to the app
      await setActive({ session: completeSignIn.createdSessionId });
      // Router replacement will be handled by the root layout listener
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      alert(err.errors[0].message);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, emailAddress, password]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Palette.black, Palette.darkGray]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              autoCapitalize="none"
              value={emailAddress}
              placeholder="Email..."
              placeholderTextColor="#666"
              onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              value={password}
              placeholder="Password..."
              placeholderTextColor="#666"
              secureTextEntry={true}
              onChangeText={(password) => setPassword(password)}
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            onPress={onSignInPress}
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
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Link href="/sign-up" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
