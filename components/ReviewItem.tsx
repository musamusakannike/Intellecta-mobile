"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"

interface ReviewItemProps {
  review: {
    _id: string
    user: {
      username: string
      email: string
    }
    rating: number
    title: string
    content: string
    createdAt: string
  }
  isUserReview: boolean
  onEdit?: () => void
  onDelete?: () => void
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review, isUserReview, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false)
  const [actionOpacity] = useState(new Animated.Value(0))

  const toggleActions = () => {
    if (isUserReview) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setShowActions(!showActions)
      Animated.timing(actionOpacity, {
        toValue: showActions ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <TouchableOpacity style={styles.container} onPress={toggleActions} activeOpacity={isUserReview ? 0.8 : 1}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(review.user.username)}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{review.user.username}</Text>
            <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name="star"
              size={14}
              color={star <= review.rating ? "#FFD700" : "rgba(255, 255, 255, 0.2)"}
              style={styles.star}
            />
          ))}
        </View>
      </View>

      <Text style={styles.reviewTitle}>{review.title}</Text>
      <Text style={styles.reviewContent}>{review.content}</Text>

      {isUserReview && (
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: actionOpacity,
              height: actionOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 40],
              }),
            },
          ]}
        >
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Ionicons name="pencil" size={16} color="#4F78FF" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={16} color="#FF5E5E" />
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(79, 120, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4F78FF",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: "#8A8FA3",
  },
  ratingContainer: {
    flexDirection: "row",
  },
  star: {
    marginLeft: 2,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  reviewContent: {
    fontSize: 14,
    lineHeight: 22,
    color: "#B4C6EF",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    overflow: "hidden",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F78FF",
    marginLeft: 4,
  },
  deleteText: {
    color: "#FF5E5E",
  },
})

export default ReviewItem
