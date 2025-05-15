import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"

export default function TermsPrivacyPage() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms")
  const [expandedSection, setExpandedSection] = useState<string | null>("usage")

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  const toggleSection = (section: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setExpandedSection(expandedSection === section ? null : section)
  }

  const switchTab = (tab: "terms" | "privacy") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setActiveTab(tab)
    setExpandedSection(tab === "terms" ? "usage" : "collection")
  }

  const termsOfServiceSections = [
    {
      id: "usage",
      title: "Terms of Use",
      content: "By accessing and using this application, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by the above, please do not use this application. The Service is intended for users who are at least 13 years of age. All users who are minors in the jurisdiction in which they reside must have the permission of their parent or guardian to use the Service."
    },
    {
      id: "accounts",
      title: "User Accounts",
      content: "When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party."
    },
    {
      id: "content",
      title: "User Content",
      content: "Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the content that you post to the Service, including its legality, reliability, and appropriateness. By posting content to the Service, you grant us the right to use, modify, publicly perform, publicly display, reproduce, and distribute such content on and through the Service."
    },
    {
      id: "intellectual",
      title: "Intellectual Property",
      content: "The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of our company and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of our company."
    },
    {
      id: "termination",
      title: "Termination",
      content: "We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service, or notify us that you wish to delete your account."
    },
    {
      id: "changes",
      title: "Changes to Terms",
      content: "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms."
    }
  ]

  const privacyPolicySections = [
    {
      id: "collection",
      title: "Information Collection",
      content: "We collect several different types of information for various purposes to provide and improve our Service to you. Types of Data Collected include: Personal Data (email address, first name and last name, phone number, address), Usage Data (information on how the Service is accessed and used), Tracking & Cookies Data (cookies and similar tracking technologies to track activity on our Service)."
    },
    {
      id: "usage_data",
      title: "Use of Data",
      content: "We use the collected data for various purposes: To provide and maintain the Service, to notify you about changes to our Service, to allow you to participate in interactive features of our Service when you choose to do so, to provide customer care and support, to provide analysis or valuable information so that we can improve the Service, to monitor the usage of the Service, and to detect, prevent and address technical issues."
    },
    {
      id: "transfer",
      title: "Transfer of Data",
      content: "Your information, including Personal Data, may be transferred to — and maintained on — computers located outside of your state, province, country or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction. If you are located outside the United States and choose to provide information to us, please note that we transfer the data to the United States and process it there."
    },
    {
      id: "disclosure",
      title: "Disclosure of Data",
      content: "We may disclose your Personal Data in the good faith belief that such action is necessary to: comply with a legal obligation, protect and defend the rights or property of our company, prevent or investigate possible wrongdoing in connection with the Service, protect the personal safety of users of the Service or the public, and protect against legal liability."
    },
    {
      id: "security",
      title: "Security of Data",
      content: "The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security."
    },
    {
      id: "children",
      title: "Children's Privacy",
      content: "Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13. If you are a parent or guardian and you are aware that your child has provided us with Personal Data, please contact us. If we become aware that we have collected Personal Data from children without verification of parental consent, we take steps to remove that information from our servers."
    }
  ]

  const activeSections = activeTab === "terms" ? termsOfServiceSections : privacyPolicySections

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
          <Text style={styles.headerTitle}>Legal Information</Text>
          <View style={styles.placeholderRight} />
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "terms" && styles.activeTabButton]}
            onPress={() => switchTab("terms")}
          >
            <Text style={[styles.tabText, activeTab === "terms" && styles.activeTabText]}>
              Terms of Service
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "privacy" && styles.activeTabButton]}
            onPress={() => switchTab("privacy")}
          >
            <Text style={[styles.tabText, activeTab === "privacy" && styles.activeTabText]}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Last Updated */}
          <View style={styles.lastUpdatedContainer}>
            <Ionicons name="time-outline" size={16} color="#B4C6EF" />
            <Text style={styles.lastUpdatedText}>Last updated: May 1, 2025</Text>
          </View>

          {/* Introduction */}
          <View style={styles.introContainer}>
            <Text style={styles.introTitle}>
              {activeTab === "terms" ? "Terms of Service" : "Privacy Policy"}
            </Text>
            <Text style={styles.introText}>
              {activeTab === "terms"
                ? "Please read these Terms of Service carefully before using our application. Your access to and use of the service is conditioned on your acceptance of and compliance with these terms."
                : "This Privacy Policy describes how we collect, use, and disclose your personal information when you use our application. We are committed to protecting your privacy and ensuring the security of your personal information."}
            </Text>
          </View>

          {/* Sections */}
          <View style={styles.sectionsContainer}>
            {activeSections.map((section) => (
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

          {/* Contact Information */}
          <View style={styles.contactInfoContainer}>
            <Text style={styles.contactInfoTitle}>Contact Us</Text>
            <Text style={styles.contactInfoText}>
              If you have any questions about these {activeTab === "terms" ? "Terms" : "Privacy Policies"}, please contact us:
            </Text>
            <View style={styles.contactMethod}>
              <Ionicons name="mail-outline" size={18} color="#4F78FF" style={styles.contactIcon} />
              <Text style={styles.contactText}>legal@example.com</Text>
            </View>
            <View style={styles.contactMethod}>
              <Ionicons name="call-outline" size={18} color="#4F78FF" style={styles.contactIcon} />
              <Text style={styles.contactText}>+1 (555) 123-4567</Text>
            </View>
            <View style={styles.contactMethod}>
              <Ionicons name="location-outline" size={18} color="#4F78FF" style={styles.contactIcon} />
              <Text style={styles.contactText}>123 Legal Street, San Francisco, CA 94103</Text>
            </View>
          </View>

          {/* Accept Button */}
          <TouchableOpacity style={styles.acceptButton} activeOpacity={0.9}>
            <LinearGradient
              colors={["#4F78FF", "#8A53FF"]}
              style={styles.acceptGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.acceptText}>I Accept</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2025 Your Company. All rights reserved.</Text>
          </View>
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
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomColor: "#4F78FF",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#B4C6EF",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  lastUpdatedContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  lastUpdatedText: {
    fontSize: 14,
    color: "#B4C6EF",
    marginLeft: 8,
  },
  introContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  introText: {
    fontSize: 16,
    color: "#B4C6EF",
    lineHeight: 24,
  },
  sectionsContainer: {
    paddingHorizontal: 20,
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
    justifyContent: "space-between",
    padding: 16,
  },
  sectionTitle: {
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
  contactInfoContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  contactInfoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  contactInfoText: {
    fontSize: 14,
    color: "#B4C6EF",
    marginBottom: 16,
    lineHeight: 22,
  },
  contactMethod: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  contactIcon: {
    marginRight: 12,
  },
  contactText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  acceptButton: {
    marginTop: 30,
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  acceptGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  acceptText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  footer: {
    marginTop: 30,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#8A8FA3",
  },
})