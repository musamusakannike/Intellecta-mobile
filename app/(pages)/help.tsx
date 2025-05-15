import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  FlatList,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"

interface HelpCategory {
  id: string
  title: string
  icon: string
  questions: HelpQuestion[]
}

interface HelpQuestion {
  id: string
  question: string
  answer: string
}

export default function HelpPage() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("account")

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  const toggleQuestion = (questionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setExpandedQuestion(expandedQuestion === questionId ? null : questionId)
  }

  const selectCategory = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedCategory(categoryId)
    setExpandedQuestion(null)
  }

  const helpCategories: HelpCategory[] = [
    {
      id: "account",
      title: "Account",
      icon: "person",
      questions: [
        {
          id: "account-1",
          question: "How do I change my password?",
          answer: "To change your password, go to your Profile page and select 'Security Settings'. From there, you can choose 'Change Password' and follow the prompts to update your password. Make sure to choose a strong, unique password for better security."
        },
        {
          id: "account-2",
          question: "How do I update my profile information?",
          answer: "You can update your profile information by navigating to the Profile page. Tap on the 'Edit Profile' button to modify your name, email, profile picture, and other personal details. Remember to save your changes when you're done."
        },
        {
          id: "account-3",
          question: "Can I delete my account?",
          answer: "Yes, you can delete your account by going to Profile > Settings > Account Management > Delete Account. Please note that this action is permanent and will remove all your data from our platform. We recommend downloading any important information before proceeding."
        }
      ]
    },
    {
      id: "courses",
      title: "Courses",
      icon: "book",
      questions: [
        {
          id: "courses-1",
          question: "How do I enroll in a course?",
          answer: "To enroll in a course, browse the course catalog and select the course you're interested in. On the course details page, click the 'Enroll' or 'Purchase' button. Follow the prompts to complete your enrollment, which may include payment if it's a premium course."
        },
        {
          id: "courses-2",
          question: "Can I get a refund for a course?",
          answer: "Yes, we offer refunds within 14 days of purchase if you're not satisfied with the course. To request a refund, go to My Courses > Course Options > Request Refund. Please note that some promotional or heavily discounted courses may have different refund policies."
        },
        {
          id: "courses-3",
          question: "How do I track my progress?",
          answer: "Your course progress is automatically tracked as you complete lessons and quizzes. You can view your overall progress on the course dashboard or in the 'My Courses' section. Each course also has a progress bar showing how much of the content you've completed."
        }
      ]
    },
    {
      id: "payment",
      title: "Payment",
      icon: "card",
      questions: [
        {
          id: "payment-1",
          question: "What payment methods do you accept?",
          answer: "We accept major credit and debit cards (Visa, Mastercard, American Express), PayPal, and Apple Pay. In some regions, we also support local payment methods. All payments are processed securely through our payment providers."
        },
        {
          id: "payment-2",
          question: "Is my payment information secure?",
          answer: "Yes, we take payment security very seriously. We don't store your full credit card details on our servers. All payment processing is handled by trusted third-party payment processors that comply with PCI DSS standards for secure handling of payment information."
        },
        {
          id: "payment-3",
          question: "How do I update my billing information?",
          answer: "You can update your billing information by going to Profile > Payment Methods. From there, you can add new payment methods, remove existing ones, or update the details of your current payment methods. Changes will apply to future purchases and subscriptions."
        }
      ]
    },
    {
      id: "technical",
      title: "Technical",
      icon: "construct",
      questions: [
        {
          id: "technical-1",
          question: "The app is crashing, what should I do?",
          answer: "If the app is crashing, try these steps: 1) Close and restart the app, 2) Check for app updates, 3) Restart your device, 4) Check your internet connection, 5) Clear the app cache in your device settings. If the problem persists, please contact our support team with details about your device and when the crashes occur."
        },
        {
          id: "technical-2",
          question: "How do I download content for offline viewing?",
          answer: "To download content for offline viewing, go to the course page and look for the download icon next to each lesson. Tap the icon to download the content. You can manage your downloaded content in the 'Downloads' section of the app. Note that not all content may be available for offline viewing."
        },
        {
          id: "technical-3",
          question: "How do I clear the app cache?",
          answer: "To clear the app cache, go to your device settings, find the app in the list of installed applications, and select 'Storage' or 'Storage & cache'. From there, you can tap 'Clear cache'. This won't delete your account or course progress, but it may help resolve technical issues."
        }
      ]
    }
  ]

  // Filter questions based on search query
  const filteredQuestions = searchQuery.trim() !== "" 
    ? helpCategories.flatMap(category => 
        category.questions.filter(q => 
          q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(q => ({ ...q, categoryId: category.id }))
      )
    : []

  const currentCategory = helpCategories.find(cat => cat.id === selectedCategory)

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
          <Text style={styles.headerTitle}>Help Center</Text>
          <View style={styles.placeholderRight} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color="#8A8FA3" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help..."
              placeholderTextColor="#8A8FA3"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery("")}
              >
                <Ionicons name="close-circle" size={18} color="#8A8FA3" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <FlatList
            data={helpCategories}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryItem,
                  selectedCategory === item.id && styles.categoryItemActive
                ]}
                onPress={() => selectCategory(item.id)}
              >
                <View style={[
                  styles.categoryIcon,
                  selectedCategory === item.id && styles.categoryIconActive
                ]}>
                  <Ionicons 
                    name={item.icon as any} 
                    size={20} 
                    color={selectedCategory === item.id ? "#FFFFFF" : "#8A8FA3"} 
                  />
                </View>
                <Text style={[
                  styles.categoryText,
                  selectedCategory === item.id && styles.categoryTextActive
                ]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Main Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Results */}
          {searchQuery.trim() !== "" ? (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultsTitle}>
                Search Results ({filteredQuestions.length})
              </Text>
              
              {filteredQuestions.length > 0 ? (
                filteredQuestions.map((question) => (
                  <TouchableOpacity
                    key={question.id}
                    style={[
                      styles.questionItem,
                      expandedQuestion === question.id && styles.questionItemExpanded
                    ]}
                    onPress={() => toggleQuestion(question.id)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.questionHeader}>
                      <Text style={styles.questionText}>{question.question}</Text>
                      <Ionicons
                        name={expandedQuestion === question.id ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#B4C6EF"
                      />
                    </View>
                    {expandedQuestion === question.id && (
                      <View style={styles.answerContainer}>
                        <Text style={styles.answerText}>{question.answer}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={50} color="#4F78FF" style={styles.noResultsIcon} />
                  <Text style={styles.noResultsText}>No results found</Text>
                  <Text style={styles.noResultsSubtext}>Try different keywords or browse categories</Text>
                </View>
              )}
            </View>
          ) : (
            // Category Questions
            <View style={styles.questionsContainer}>
              <Text style={styles.categoryTitle}>{currentCategory?.title} Help</Text>
              
              {currentCategory?.questions.map((question) => (
                <TouchableOpacity
                  key={question.id}
                  style={[
                    styles.questionItem,
                    expandedQuestion === question.id && styles.questionItemExpanded
                  ]}
                  onPress={() => toggleQuestion(question.id)}
                  activeOpacity={0.9}
                >
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionText}>{question.question}</Text>
                    <Ionicons
                      name={expandedQuestion === question.id ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#B4C6EF"
                    />
                  </View>
                  {expandedQuestion === question.id && (
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerText}>{question.answer}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Contact Support */}
          <View style={styles.contactContainer}>
            <Text style={styles.contactTitle}>Still need help?</Text>
            <Text style={styles.contactSubtitle}>Our support team is here to assist you</Text>
            
            <TouchableOpacity style={styles.contactButton} activeOpacity={0.9}>
              <LinearGradient
                colors={["#4F78FF", "#8A53FF"]}
                style={styles.contactGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" style={styles.contactIcon} />
                <Text style={styles.contactText}>Contact Support</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    height: "100%",
  },
  clearButton: {
    padding: 6,
  },
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  categoriesList: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 24,
  },
  categoryItemActive: {
    opacity: 1,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryIconActive: {
    backgroundColor: "#4F78FF",
  },
  categoryText: {
    fontSize: 12,
    color: "#8A8FA3",
  },
  categoryTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  searchResultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  questionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  questionItem: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  questionItemExpanded: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    paddingRight: 12,
  },
  answerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  answerText: {
    fontSize: 14,
    color: "#B4C6EF",
    lineHeight: 22,
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noResultsIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: "#B4C6EF",
    textAlign: "center",
  },
  contactContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 14,
    color: "#B4C6EF",
    marginBottom: 20,
    textAlign: "center",
  },
  contactButton: {
    width: "100%",
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