import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Animated,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface ReviewModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (review: { rating: number; title: string; content: string }) => Promise<void>;
    existingReview?: {
        rating: number;
        title: string;
        content: string;
    };
    isEditing?: boolean;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
    visible,
    onClose,
    onSubmit,
    existingReview,
    isEditing = false,
}) => {
    const [rating, setRating] = useState(existingReview?.rating || 0);
    const [title, setTitle] = useState(existingReview?.title || "");
    const [content, setContent] = useState(existingReview?.content || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.timing(animatedValue, {
            toValue: visible ? 1 : 0,
            duration: visible ? 300 : 200,
            useNativeDriver: true,
        });

        if (visible) {
            setRating(existingReview?.rating || 0);
            setTitle(existingReview?.title || "");
            setContent(existingReview?.content || "");
            setError("");
        }

        animation.start();

        return () => {
            animation.stop();
        };
    }, [visible, existingReview, animatedValue]);

    const handleStarPress = (selectedRating: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRating(selectedRating);
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            setError("Please select a rating");
            return;
        }

        if (!title.trim()) {
            setError("Please enter a review title");
            return;
        }

        if (!content.trim()) {
            setError("Please enter review content");
            return;
        }

        try {
            setIsSubmitting(true);
            setError("");
            await onSubmit({ rating, title, content });
            setIsSubmitting(false);
            onClose();
        } catch (err) {
            setIsSubmitting(false);
            setError(err instanceof Error ? err.message : "Failed to submit review");
        }
    };

    const modalTranslateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
    });

    if (!visible) {
        return null;
    }

    return (
        <View style={styles.modalOverlay}>
            <Animated.View
                style={[
                    styles.modalContainer,
                    {
                        transform: [{ translateY: modalTranslateY }],
                        opacity: animatedValue,
                    },
                ]}
            >
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                        {isEditing ? "Edit Review" : "Write a Review"}
                    </Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.ratingContainer}>
                        <Text style={styles.ratingLabel}>Your Rating</Text>
                        <View style={styles.starsContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => handleStarPress(star)}
                                    style={styles.starButton}
                                >
                                    <Ionicons
                                        name={rating >= star ? "star" : "star-outline"}
                                        size={32}
                                        color={rating >= star ? "#FFD700" : "#8A8FA3"}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.ratingText}>
                            {rating > 0
                                ? rating === 5
                                    ? "Excellent!"
                                    : rating === 4
                                        ? "Very Good!"
                                        : rating === 3
                                            ? "Good"
                                            : rating === 2
                                                ? "Fair"
                                                : "Poor"
                                : "Tap to rate"}
                        </Text>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Title</Text>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="Summarize your experience"
                            placeholderTextColor="#8A8FA3"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={100}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Review</Text>
                        <TextInput
                            style={styles.contentInput}
                            placeholder="Share your experience with this course"
                            placeholderTextColor="#8A8FA3"
                            value={content}
                            onChangeText={setContent}
                            multiline
                            maxLength={1000}
                            textAlignVertical="top"
                        />
                        <Text style={styles.charCount}>{content.length}/1000</Text>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            isSubmitting && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {isEditing ? "Update Review" : "Submit Review"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(9, 14, 35, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    modalContainer: {
        width: "90%",
        maxHeight: "80%",
        backgroundColor: "#1F2B5E",
        borderRadius: 20,
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.1)",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#FFFFFF",
    },
    modalCloseButton: {
        padding: 4,
    },
    scrollContent: {
        padding: 20,
    },
    ratingContainer: {
        alignItems: "center",
        marginBottom: 24,
    },
    ratingLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
        marginBottom: 12,
    },
    starsContainer: {
        flexDirection: "row",
        marginBottom: 8,
    },
    starButton: {
        padding: 4,
        marginHorizontal: 4,
    },
    ratingText: {
        fontSize: 14,
        color: "#B4C6EF",
        marginTop: 4,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
        marginBottom: 8,
    },
    titleInput: {
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: "#FFFFFF",
        fontSize: 16,
    },
    contentInput: {
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: "#FFFFFF",
        fontSize: 16,
        minHeight: 120,
    },
    charCount: {
        fontSize: 12,
        color: "#8A8FA3",
        alignSelf: "flex-end",
        marginTop: 4,
    },
    errorText: {
        color: "#FF5E5E",
        fontSize: 14,
        marginBottom: 16,
        textAlign: "center",
    },
    submitButton: {
        backgroundColor: "#4F78FF",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
});

export default ReviewModal;