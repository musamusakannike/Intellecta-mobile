import type React from "react"
import { View, Text, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface RatingStatsProps {
  stats: {
    averageRating: number
    totalRatings: number
    ratingDistribution: {
      1: number
      2: number
      3: number
      4: number
      5: number
    }
  }
}

const RatingStats: React.FC<RatingStatsProps> = ({ stats }) => {
  const { averageRating, totalRatings, ratingDistribution } = stats

  // Calculate percentage for each rating
  const getPercentage = (rating: keyof typeof ratingDistribution) => {
    if (totalRatings === 0) return 0
    return (ratingDistribution[rating] / totalRatings) * 100
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <View style={styles.averageContainer}>
          <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name="star"
                size={16}
                color={star <= Math.round(averageRating) ? "#FFD700" : "rgba(255, 255, 255, 0.2)"}
                style={styles.star}
              />
            ))}
          </View>
          <Text style={styles.totalRatings}>
            {totalRatings} {totalRatings === 1 ? "review" : "reviews"}
          </Text>
        </View>

        <View style={styles.distributionContainer}>
          {[5, 4, 3, 2, 1].map((rating) => (
            <View key={rating} style={styles.ratingRow}>
              <Text style={styles.ratingNumber}>{rating}</Text>
              <Ionicons name="star" size={12} color="#FFD700" style={styles.ratingIcon} />
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${getPercentage(rating as keyof typeof ratingDistribution)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.ratingCount}>{ratingDistribution[rating as keyof typeof ratingDistribution]}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  summaryContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
  },
  averageContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.1)",
    width: 100,
  },
  averageRating: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 4,
  },
  star: {
    marginHorizontal: 1,
  },
  totalRatings: {
    fontSize: 12,
    color: "#B4C6EF",
  },
  distributionContainer: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: "center",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
  },
  ratingNumber: {
    fontSize: 12,
    color: "#B4C6EF",
    width: 10,
    textAlign: "center",
  },
  ratingIcon: {
    marginHorizontal: 4,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4F78FF",
    borderRadius: 3,
  },
  ratingCount: {
    fontSize: 12,
    color: "#B4C6EF",
    width: 20,
    textAlign: "right",
  },
})

export default RatingStats
