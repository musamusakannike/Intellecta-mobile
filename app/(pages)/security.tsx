import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Platform,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { Ionicons, MaterialIcons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"

export default function SecurityPage() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [expandedSection, setExpandedSection] = useState<string | null>("passwords")

  const toggleSection = (section: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setExpandedSection(expandedSection === section ? null : section)
  }

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  const securitySections = [
    {
      id: "passwords",
      title: "Password Security",
      icon: "lock-closed",
      content: "We recommend using a strong, unique password for your account. A strong password should be at least 12 characters long and include a mix of uppercase letters, lowercase letters, numbers, and special characters. Never reuse passwords across different services.",
    },
    {
      id: "2fa",
      title: "Two-Factor Authentication",
      icon: "shield-checkmark",
      content: "Enable two-factor authentication for an additional layer of security. When enabled, you'll need both your password and a verification code sent to your mobile device to access your account. This prevents unauthorized access even if your password is compromised.",
    },
    {
      id: "data",
      title: "Data Protection",
      icon: "server",
      content: "All your data is encrypted both in transit and at rest using industry-standard encryption protocols. We regularly update our security measures to protect against new threats and vulnerabilities. Your personal information is never shared with third parties without your explicit consent.",
    },
    {
      id: "devices",
      title: "Device Management",
      icon: "phone-portrait",
      content: "You can view and manage all devices that are currently logged into your account. If you notice any suspicious activity, you can remotely log out from all devices with a single click. We recommend reviewing your active sessions regularly.",
    },
    {
      id: "reporting",
      title: "Security Reporting",
      icon: "alert-circle",
      content: "If you notice any suspicious activity on your account or have security concerns, please contact our security team immediately. We have a dedicated team that investigates all reported security issues and takes appropriate action to protect your account.",
    },
  ]

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient
        colors={["#090E23", "#1F2B5E", "#0C1339"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Security</Text>
          <View style={styles.placeholderRight} />
        </View>

        {/* Main Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="shield" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Your Security Matters</Text>
            <Text style={styles.heroSubtitle}>
              We take your privacy and security seriously. Learn about the measures we've implemented to keep your account safe.
            </Text>
          </View>

          {/* Security Sections */}
          <View style={styles.sectionsContainer}>
            {securitySections.map((section) => (
              <TouchableOpacity
                key={section.id}
                style={[
                  styles.sectionItem,
                  expandedSection === section.id && styles.sectionItemExpanded,
                ]}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.9}
              >
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <Ionicons name={section.icon as any} size={22} color="#FFFFFF" />
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Ionicons
                    name={expandedSection === section.id ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#B4C6EF"
                  />
                </View>
                {expandedSection === section.id && (
                  <View style={styles.sectionContent}>
                    <Text style={styles.sectionText}>{section.content}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Security Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Security Tips</Text>
            <View style={styles.tipItem}>
              <View style={styles.tipIconContainer}>
                <MaterialIcons name="security" size={20} color="#4F78FF" />
              </View>
              <Text style={styles.tipText}>Regularly update your password</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipIconContainer}>
                <MaterialIcons name="verified-user" size={20} color="#4F78FF" />
              </View>
              <Text style={styles.tipText}>Enable biometric authentication if available</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipIconContainer}>
                <MaterialIcons name="phonelink-lock" size={20} color="#4F78FF" />
              </View>
              <Text style={styles.tipText}>Never share your account credentials</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipIconContainer}>
                <MaterialIcons name="wifi-tethering" size={20} color="#4F78FF" />
              </View>
              <Text style={styles.tipText}>Be cautious when using public Wi-Fi networks</Text>
            </View>
          </View>

          {/* Contact Security Team */}
          <TouchableOpacity style={styles.contactButton} activeOpacity={0.9}>
            <LinearGradient
              colors={["#4F78FF", "#8A53FF"]}
              style={styles.contactGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="mail" size={20} color="#FFFFFF" style={styles.contactIcon} />
              <Text style={styles.contactText}>Contact Security Team</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090E23",
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  placeholderRight: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(79, 120, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#B4C6EF",
    textAlign: "center",
    lineHeight: 24,
  },
  sectionsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionItem: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  sectionItemExpanded: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(79, 120, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  sectionText: {
    fontSize: 14,
    color: "#B4C6EF",
    lineHeight: 22,
  },
  tipsContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tipIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(79, 120, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: "#FFFFFF",
    flex: 1,
  },
  contactButton: {
    marginTop: 30,
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  contactGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  contactIcon: {
    marginRight: 8,
  },
  contactText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})