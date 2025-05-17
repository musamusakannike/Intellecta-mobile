import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  SafeAreaView,
  TextInput,
  Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { ToastContext } from "@/components/Toast/ToastContext";
import * as Haptics from 'expo-haptics';
import { Skeleton } from "@/components/Skeleton";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { API_ROUTES } from '@/constants';
import YoutubePlayer from 'react-native-youtube-iframe';
import * as Progress from 'react-native-progress';
import ConfettiCannon from 'react-native-confetti-cannon';
import LatexRenderer from '@/components/LatexRenderer';
import * as Speech from 'expo-speech';
import CodeBlockViewer from '@/components/CodeBlockViewer';
import CachedImage from '@/components/CachedImage';

const { width, height } = Dimensions.get('window');

interface LessonContent {
  type: 'text' | 'image' | 'code' | 'latex' | 'link' | 'youtubeUrl';
  content: string;
  order: number;
  _id: string;
  language?: string; // For code blocks
  title?: string; // For links
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  _id: string;
}

interface Lesson {
  _id: string;
  title: string;
  description: string;
  topic: string;
  contents: LessonContent[];
  quiz: QuizQuestion[];
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export default function LessonExperience() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<{
    score: number;
    passed: boolean;
    userProgress: any;
  } | null>(null);
  const [showExplanation, setShowExplanation] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [savedNotes, setSavedNotes] = useState<{ [key: string]: string }>({});
  const [contentProgress, setContentProgress] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toast = useContext(ToastContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lessonId } = useLocalSearchParams();
  const scrollRef = useRef<ScrollView>(null);
  const confettiRef = useRef<any>(null);

  const progressValue = useSharedValue(0);
  const quizSheetPosition = useSharedValue(height);
  const notesSheetPosition = useSharedValue(height);
  const deleteConfirmPosition = useSharedValue(height);

  // Fetch lesson data
  const fetchLessonData = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        router.replace('/auth/login');
        return;
      }

      // Fetch lesson details
      const lessonResponse = await fetch(`${API_ROUTES.LESSONS.GET_LESSON_BY_ID}/${lessonId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!lessonResponse.ok) {
        const errorData = await lessonResponse.json();
        throw new Error(errorData.message || 'Failed to fetch lesson details');
      }

      const lessonData = await lessonResponse.json();
      setLesson(lessonData);

      // Initialize quiz answers array
      if (lessonData.quiz && lessonData.quiz.length > 0) {
        setQuizAnswers(new Array(lessonData.quiz.length).fill(-1));
      }

      // Load saved notes
      const notes = await AsyncStorage.getItem(`lesson_notes_${lessonId}`);
      if (notes) {
        setSavedNotes(JSON.parse(notes));
      }

      // Load progress
      const progress = await AsyncStorage.getItem(`lesson_progress_${lessonId}`);
      if (progress) {
        const progressIndex = parseInt(progress, 10);
        setCurrentContentIndex(progressIndex);
        setContentProgress(progressIndex / (lessonData.contents.length - 1));
        progressValue.value = progressIndex / (lessonData.contents.length - 1);
      }

    } catch (error) {
      console.error('Error fetching lesson data:', error);
      toast?.showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load lesson data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLessonData();

    // Cleanup speech on unmount
    return () => {
      if (isSpeaking) {
        Speech.stop();
      }
    };
  }, [lessonId]);

  // Save progress when content index changes
  useEffect(() => {
    if (lesson && lesson.contents.length > 0) {
      const saveProgress = async () => {
        await AsyncStorage.setItem(`lesson_progress_${lessonId}`, currentContentIndex.toString());

        // Update progress bar
        const newProgress = currentContentIndex / (lesson.contents.length - 1);
        setContentProgress(newProgress);
        progressValue.value = withTiming(newProgress, { duration: 300 });
      };

      saveProgress();
    }
  }, [currentContentIndex, lesson]);

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Stop speech if active
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }

    router.back();
  };

  const navigateToContent = (index: number) => {
    if (!lesson) return;

    // Stop speech if active
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }

    if (index < 0) {
      index = 0;
    } else if (index >= lesson.contents.length) {
      // If we've reached the end of the content, show the quiz
      if (lesson.quiz && lesson.quiz.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        openQuiz();
        return;
      } else {
        // If there's no quiz, go back to the last content
        index = lesson.contents.length - 1;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentContentIndex(index);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const openQuiz = () => {
    // Stop speech if active
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }

    setShowQuiz(true);
    quizSheetPosition.value = withSpring(0, { damping: 20, stiffness: 90 });
  };

  const closeQuiz = () => {
    quizSheetPosition.value = withSpring(height, { damping: 20, stiffness: 90 });
    setTimeout(() => setShowQuiz(false), 300);
  };

  const toggleNotes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (showNotes) {
      notesSheetPosition.value = withSpring(height, { damping: 20, stiffness: 90 });
      setTimeout(() => setShowNotes(false), 300);
    } else {
      if (lesson) {
        const contentId = lesson.contents[currentContentIndex]._id;
        const existingNote = savedNotes[contentId] || '';
        setNoteText(existingNote);
      }

      setShowNotes(true);
      notesSheetPosition.value = withSpring(0, { damping: 20, stiffness: 90 });
    }
  };

  const saveNote = async () => {
    if (!lesson) return;

    const contentId = lesson.contents[currentContentIndex]._id;

    if (!noteText.trim()) {
      // If note is empty, show delete confirmation
      showDeleteNoteConfirmation();
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const updatedNotes = {
      ...savedNotes,
      [contentId]: noteText
    };

    setSavedNotes(updatedNotes);
    await AsyncStorage.setItem(`lesson_notes_${lessonId}`, JSON.stringify(updatedNotes));

    toast?.showToast({
      type: 'success',
      message: 'Note saved successfully',
    });

    toggleNotes();
  };

  const showDeleteNoteConfirmation = () => {
    if (!lesson) return;

    const contentId = lesson.contents[currentContentIndex]._id;

    // Only show delete confirmation if there's an existing note
    if (savedNotes[contentId]) {
      setShowDeleteConfirm(true);
      deleteConfirmPosition.value = withSpring(0, { damping: 20, stiffness: 90 });
    } else {
      // If there's no existing note and the input is empty, just close
      toggleNotes();
    }
  };

  const closeDeleteConfirmation = () => {
    deleteConfirmPosition.value = withSpring(height, { damping: 20, stiffness: 90 });
    setTimeout(() => setShowDeleteConfirm(false), 300);
  };

  const deleteNote = async () => {
    if (!lesson) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const contentId = lesson.contents[currentContentIndex]._id;
    const updatedNotes = { ...savedNotes };
    delete updatedNotes[contentId];

    setSavedNotes(updatedNotes);
    await AsyncStorage.setItem(`lesson_notes_${lessonId}`, JSON.stringify(updatedNotes));

    toast?.showToast({
      type: 'success',
      message: 'Note deleted successfully',
    });

    closeDeleteConfirmation();
    toggleNotes();
  };

  const toggleSpeech = () => {
    if (!lesson) return;

    const content = lesson.contents[currentContentIndex];

    if (content.type !== 'text') {
      toast?.showToast({
        type: 'info',
        message: 'Text-to-speech is only available for text content',
      });
      return;
    }

    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);

      toast?.showToast({
        type: 'info',
        message: 'Speech stopped',
      });
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Speech.speak(content.content, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => {
          setIsSpeaking(false);
          toast?.showToast({
            type: 'error',
            message: 'Failed to start speech',
          });
        }
      });


      toast?.showToast({
        type: 'info',
        message: 'Playing text content',
      });
    }
  };

  const handleSelectAnswer = (questionIndex: number, answerIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = answerIndex;
    setQuizAnswers(newAnswers);
  };

  const toggleExplanation = (questionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowExplanation(prev => prev === questionId ? null : questionId);
  };

  const submitQuiz = async () => {
    if (!lesson) return;

    // Check if all questions are answered
    if (quizAnswers.includes(-1)) {
      toast?.showToast({
        type: 'error',
        message: 'Please answer all questions',
      });
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const token = await SecureStore.getItemAsync('token');

      const response = await fetch(`${API_ROUTES.LESSONS.SUBMIT_QUIZ}/${lessonId}/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: quizAnswers })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit quiz');
      }

      const results = await response.json();
      setQuizResults(results);
      setQuizSubmitted(true);

      if (results.passed) {
        setTimeout(() => {
          setShowConfetti(true);
          confettiRef.current?.start();
        }, 500);
      }

    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast?.showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit quiz',
      });
    }
  };

  const resetQuiz = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuizAnswers(new Array(lesson?.quiz.length || 0).fill(-1));
    setQuizSubmitted(false);
    setQuizResults(null);
    setShowExplanation(null);
  };

  const finishLesson = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeQuiz();
    router.back();
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => {
      toast?.showToast({
        type: 'error',
        message: 'Could not open the link',
      });
    });
  };

  // Animated styles
  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value * 100}%`,
    };
  });

  const quizSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: quizSheetPosition.value }],
    };
  });

  const notesSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: notesSheetPosition.value }],
    };
  });

  const deleteConfirmStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: deleteConfirmPosition.value }],
    };
  });

  // Render loading skeleton
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <Skeleton style={styles.skeletonHeader} />
      <Skeleton style={styles.skeletonSubtitle} />

      <View style={styles.skeletonContentContainer}>
        <Skeleton style={styles.skeletonParagraph} />
        <Skeleton style={styles.skeletonImage} />
        <Skeleton style={styles.skeletonParagraph} />
      </View>
    </View>
  );

  // Render content based on type
  const renderContent = () => {
    if (!lesson || !lesson.contents[currentContentIndex]) return null;

    const content = lesson.contents[currentContentIndex];
    const contentId = content._id;
    const hasNote = savedNotes[contentId] !== undefined;

    switch (content.type) {
      case 'text':
        return (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.contentContainer}
          >
            <Text style={styles.contentText}>{content.content}</Text>

            {hasNote && (
              <TouchableOpacity
                style={styles.savedNoteContainer}
                onPress={toggleNotes}
                activeOpacity={0.8}
              >
                <View style={styles.savedNoteHeader}>
                  <Ionicons name="document-text" size={18} color="#4F78FF" />
                  <Text style={styles.savedNoteTitle}>Your Note</Text>
                </View>
                <Text style={styles.savedNoteText} numberOfLines={3}>
                  {savedNotes[contentId]}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.textToSpeechButton,
                isSpeaking && styles.textToSpeechButtonActive
              ]}
              onPress={toggleSpeech}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSpeaking ? "volume-high" : "volume-medium"}
                size={18}
                color={isSpeaking ? "#FFFFFF" : "#4F78FF"}
              />
              <Text style={[
                styles.textToSpeechText,
                isSpeaking && styles.textToSpeechTextActive
              ]}>
                {isSpeaking ? "Stop Reading" : "Read Aloud"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );

      case 'image':
        return (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.contentContainer}
          >
            <View style={styles.imageContainer}>
              <CachedImage
                source={content.content}
                style={styles.contentImage}
                resizeMode="contain"
              />
            </View>

            {hasNote && (
              <TouchableOpacity
                style={styles.savedNoteContainer}
                onPress={toggleNotes}
                activeOpacity={0.8}
              >
                <View style={styles.savedNoteHeader}>
                  <Ionicons name="document-text" size={18} color="#4F78FF" />
                  <Text style={styles.savedNoteTitle}>Your Note</Text>
                </View>
                <Text style={styles.savedNoteText} numberOfLines={3}>
                  {savedNotes[contentId]}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        );

      case 'code':
        return (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.contentContainer}
          >
            <View style={styles.codeContainer}>
              <CodeBlockViewer
                code={content.content}
                language={content.language || 'javascript'}
                theme="dark"
                fontSize={34}
              />
            </View>

            {hasNote && (
              <TouchableOpacity
                style={styles.savedNoteContainer}
                onPress={toggleNotes}
                activeOpacity={0.8}
              >
                <View style={styles.savedNoteHeader}>
                  <Ionicons name="document-text" size={18} color="#4F78FF" />
                  <Text style={styles.savedNoteTitle}>Your Note</Text>
                </View>
                <Text style={styles.savedNoteText} numberOfLines={3}>
                  {savedNotes[contentId]}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        );

      case 'latex':
        return (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.contentContainer}
          >
            <View style={styles.latexContainer}>
              <LatexRenderer latex={content.content} />
            </View>

            {hasNote && (
              <TouchableOpacity
                style={styles.savedNoteContainer}
                onPress={toggleNotes}
                activeOpacity={0.8}
              >
                <View style={styles.savedNoteHeader}>
                  <Ionicons name="document-text" size={18} color="#4F78FF" />
                  <Text style={styles.savedNoteTitle}>Your Note</Text>
                </View>
                <Text style={styles.savedNoteText} numberOfLines={3}>
                  {savedNotes[contentId]}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        );

      case 'link':
        return (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.contentContainer}
          >
            <TouchableOpacity
              style={styles.linkContainer}
              onPress={() => openLink(content.content)}
              activeOpacity={0.7}
            >
              <View style={styles.linkContent}>
                <Ionicons name="link" size={24} color="#4F78FF" style={styles.linkIcon} />
                <View style={styles.linkTextContainer}>
                  <Text style={styles.linkTitle}>{content.title || 'External Resource'}</Text>
                  <Text style={styles.linkUrl} numberOfLines={1}>{content.content}</Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={20} color="#B4C6EF" />
            </TouchableOpacity>

            {hasNote && (
              <TouchableOpacity
                style={styles.savedNoteContainer}
                onPress={toggleNotes}
                activeOpacity={0.8}
              >
                <View style={styles.savedNoteHeader}>
                  <Ionicons name="document-text" size={18} color="#4F78FF" />
                  <Text style={styles.savedNoteTitle}>Your Note</Text>
                </View>
                <Text style={styles.savedNoteText} numberOfLines={3}>
                  {savedNotes[contentId]}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        );

      case 'youtubeUrl':
        const videoId = extractYoutubeId(content.content);

        return (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.contentContainer}
          >
            <View style={styles.videoContainer}>
              {!videoReady && (
                <View style={styles.videoLoading}>
                  <ActivityIndicator size="large" color="#4F78FF" />
                  <Text style={styles.videoLoadingText}>Loading video...</Text>
                </View>
              )}

              {videoId && (
                <YoutubePlayer
                  height={220}
                  play={videoPlaying}
                  videoId={videoId}
                  onReady={() => setVideoReady(true)}
                  onChangeState={(state: any) => {
                    if (state === 'playing') {
                      setVideoPlaying(true);
                    } else if (state === 'paused' || state === 'ended') {
                      setVideoPlaying(false);
                    }
                  }}
                />
              )}
            </View>

            {hasNote && (
              <TouchableOpacity
                style={styles.savedNoteContainer}
                onPress={toggleNotes}
                activeOpacity={0.8}
              >
                <View style={styles.savedNoteHeader}>
                  <Ionicons name="document-text" size={18} color="#4F78FF" />
                  <Text style={styles.savedNoteTitle}>Your Note</Text>
                </View>
                <Text style={styles.savedNoteText} numberOfLines={3}>
                  {savedNotes[contentId]}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        );

      default:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentText}>Unsupported content type: {content.type}</Text>
          </View>
        );
    }
  };

  // Render quiz
  const renderQuiz = () => {
    if (!lesson || !lesson.quiz) return null;

    return (
      <Animated.View style={[styles.quizContainer, quizSheetStyle]}>
        <LinearGradient
          colors={['#090E23', '#1F2B5E', '#0C1339']}
          style={styles.quizGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.quizHeader}>
            <TouchableOpacity
              style={styles.quizCloseButton}
              onPress={closeQuiz}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.quizTitle}>Knowledge Check</Text>
            <Text style={styles.quizSubtitle}>
              {quizSubmitted
                ? quizResults?.passed
                  ? 'Congratulations! You passed the quiz.'
                  : 'You didn\'t pass. Review and try again.'
                : 'Test your understanding of the lesson'
              }
            </Text>
          </View>

          <ScrollView
            style={styles.quizContent}
            contentContainerStyle={styles.quizContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {showConfetti && (
              <ConfettiCannon
                count={200}
                origin={{ x: width / 2, y: 0 }}
                autoStart={false}
                ref={confettiRef}
                fadeOut
                explosionSpeed={350}
                fallSpeed={3000}
              />
            )}

            {lesson.quiz.map((question, qIndex) => (
              <View key={question._id} style={styles.questionContainer}>
                <Text style={styles.questionText}>
                  {qIndex + 1}. {question.question}
                </Text>

                {question.options.map((option, oIndex) => (
                  <TouchableOpacity
                    key={oIndex}
                    style={[
                      styles.optionContainer,
                      quizAnswers[qIndex] === oIndex && styles.optionSelected,
                      quizSubmitted && oIndex === question.correctAnswer && styles.optionCorrect,
                      quizSubmitted && quizAnswers[qIndex] === oIndex &&
                      oIndex !== question.correctAnswer && styles.optionWrong
                    ]}
                    onPress={() => !quizSubmitted && handleSelectAnswer(qIndex, oIndex)}
                    activeOpacity={quizSubmitted ? 1 : 0.7}
                    disabled={quizSubmitted}
                  >
                    <View style={[
                      styles.optionIndicator,
                      quizAnswers[qIndex] === oIndex && styles.optionIndicatorSelected,
                      quizSubmitted && oIndex === question.correctAnswer && styles.optionIndicatorCorrect,
                      quizSubmitted && quizAnswers[qIndex] === oIndex &&
                      oIndex !== question.correctAnswer && styles.optionIndicatorWrong
                    ]}>
                      <Text style={[
                        styles.optionIndicatorText,
                        quizAnswers[qIndex] === oIndex && styles.optionIndicatorTextSelected,
                        quizSubmitted && (oIndex === question.correctAnswer ||
                          (quizAnswers[qIndex] === oIndex && oIndex !== question.correctAnswer)) &&
                        styles.optionIndicatorTextResult
                      ]}>
                        {String.fromCharCode(65 + oIndex)}
                      </Text>
                    </View>

                    <Text style={[
                      styles.optionText,
                      quizAnswers[qIndex] === oIndex && styles.optionTextSelected,
                      quizSubmitted && oIndex === question.correctAnswer && styles.optionTextCorrect,
                      quizSubmitted && quizAnswers[qIndex] === oIndex &&
                      oIndex !== question.correctAnswer && styles.optionTextWrong
                    ]}>
                      {option}
                    </Text>

                    {quizSubmitted && oIndex === question.correctAnswer && (
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.resultIcon} />
                    )}

                    {quizSubmitted && quizAnswers[qIndex] === oIndex &&
                      oIndex !== question.correctAnswer && (
                        <Ionicons name="close-circle" size={20} color="#FF5E5E" style={styles.resultIcon} />
                      )}
                  </TouchableOpacity>
                ))}

                {quizSubmitted && (
                  <TouchableOpacity
                    style={styles.explanationButton}
                    onPress={() => toggleExplanation(question._id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.explanationButtonText}>
                      {showExplanation === question._id ? 'Hide Explanation' : 'Show Explanation'}
                    </Text>
                    <Ionicons
                      name={showExplanation === question._id ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#4F78FF"
                    />
                  </TouchableOpacity>
                )}

                {quizSubmitted && showExplanation === question._id && (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    style={styles.explanationContainer}
                  >
                    <Text style={styles.explanationText}>{question.explanation}</Text>
                  </Animated.View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.quizFooter}>
            {quizSubmitted ? (
              <View style={styles.quizResultsContainer}>
                {quizResults && (
                  <>
                    <View style={styles.quizScoreContainer}>
                      <Progress.Circle
                        size={80}
                        progress={quizResults.score / 100}
                        thickness={8}
                        color={quizResults.passed ? "#4CAF50" : "#FF5E5E"}
                        unfilledColor="rgba(255, 255, 255, 0.1)"
                        borderWidth={0}
                        showsText
                        formatText={() => `${Math.round(quizResults.score)}%`}
                        textStyle={styles.quizScoreText}
                      />
                      <Text style={styles.quizScoreLabel}>
                        {quizResults.passed ? "Passed!" : "Try Again"}
                      </Text>
                    </View>

                    <View style={styles.quizActionButtons}>
                      {!quizResults.passed && (
                        <TouchableOpacity
                          style={[styles.quizButton, styles.quizRetryButton]}
                          onPress={resetQuiz}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.quizRetryButtonText}>Retry Quiz</Text>
                          <Ionicons name="refresh" size={18} color="#4F78FF" style={styles.buttonIcon} />
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.quizButton, styles.quizFinishButton]}
                        onPress={finishLesson}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quizFinishButtonText}>
                          {quizResults.passed ? "Complete Lesson" : "Back to Lesson"}
                        </Text>
                        <Ionicons
                          name={quizResults.passed ? "checkmark-circle" : "arrow-back"}
                          size={18}
                          color="#FFFFFF"
                          style={styles.buttonIcon}
                        />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.quizSubmitButton,
                  !quizAnswers.includes(-1) && styles.quizSubmitButtonActive
                ]}
                onPress={submitQuiz}
                activeOpacity={quizAnswers.includes(-1) ? 0.5 : 0.8}
                disabled={quizAnswers.includes(-1)}
              >
                <Text style={styles.quizSubmitButtonText}>Submit Answers</Text>
                <Ionicons name="send" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Render notes sheet
  const renderNotesSheet = () => {
    if (!lesson) return null;

    const contentId = lesson.contents[currentContentIndex]._id;
    const existingNote = savedNotes[contentId] || '';
    const hasExistingNote = existingNote.length > 0;

    return (
      <Animated.View style={[styles.notesContainer, notesSheetStyle]}>
        <LinearGradient
          colors={['#090E23', '#1F2B5E', '#0C1339']}
          style={styles.notesGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.notesHeader}>
            <TouchableOpacity
              style={styles.notesCloseButton}
              onPress={toggleNotes}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.notesTitle}>Your Notes</Text>
            <Text style={styles.notesSubtitle}>
              Take notes for this section
            </Text>
          </View>

          <View style={styles.notesContent}>
            <TextInput
              style={styles.notesInput}
              placeholder="Write your notes here..."
              placeholderTextColor="#8A8FA3"
              multiline
              textAlignVertical="top"
              value={noteText}
              onChangeText={setNoteText}
              defaultValue={existingNote}
            />
          </View>

          <View style={styles.notesFooter}>
            <View style={styles.notesActionButtons}>
              {hasExistingNote && (
                <TouchableOpacity
                  style={styles.notesDeleteButton}
                  onPress={showDeleteNoteConfirmation}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF5E5E" style={styles.buttonIcon} />
                  <Text style={styles.notesDeleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.notesSaveButton}
                onPress={saveNote}
                activeOpacity={0.8}
              >
                <Text style={styles.notesSaveButtonText}>
                  {noteText.trim() ? 'Save Note' : hasExistingNote ? 'Delete Note' : 'Cancel'}
                </Text>
                <Ionicons
                  name={noteText.trim() ? "save" : hasExistingNote ? "trash" : "close"}
                  size={18}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Render delete confirmation
  const renderDeleteConfirmation = () => {
    return (
      <Animated.View style={[styles.deleteConfirmContainer, deleteConfirmStyle]}>
        <LinearGradient
          colors={['#090E23', '#1F2B5E', '#0C1339']}
          style={styles.deleteConfirmGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.deleteConfirmContent}>
            <Ionicons name="alert-circle" size={48} color="#FF5E5E" style={styles.deleteConfirmIcon} />
            <Text style={styles.deleteConfirmTitle}>Delete Note?</Text>
            <Text style={styles.deleteConfirmText}>
              Are you sure you want to delete this note? This action cannot be undone.
            </Text>

            <View style={styles.deleteConfirmButtons}>
              <TouchableOpacity
                style={styles.deleteConfirmCancelButton}
                onPress={closeDeleteConfirmation}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteConfirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteConfirmDeleteButton}
                onPress={deleteNote}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteConfirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient
        colors={['#090E23', '#1F2B5E', '#0C1339']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {lesson && (
            <View style={styles.lessonHeaderInfo}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>

              <View style={styles.progressBarContainer}>
                <Animated.View
                  style={[styles.progressBar, progressBarStyle]}
                />
              </View>

              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {currentContentIndex + 1}/{lesson.contents.length}
                </Text>

                <View style={styles.headerActions}>
                  {lesson.contents[currentContentIndex]?.type === 'text' && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        isSpeaking && styles.actionButtonActive
                      ]}
                      onPress={toggleSpeech}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isSpeaking ? "volume-high" : "volume-medium"}
                        size={22}
                        color={isSpeaking ? "#4F78FF" : "#FFFFFF"}
                      />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={toggleNotes}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={22} color="#FFFFFF" />
                  </TouchableOpacity>

                  {lesson.quiz && lesson.quiz.length > 0 && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={openQuiz}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="help-circle-outline" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Main Content */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            renderSkeleton()
          ) : (
            <>
              {renderContent()}

              <View style={styles.navigationButtons}>
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    currentContentIndex === 0 && styles.navButtonDisabled
                  ]}
                  onPress={() => navigateToContent(currentContentIndex - 1)}
                  activeOpacity={currentContentIndex === 0 ? 0.5 : 0.7}
                  disabled={currentContentIndex === 0}
                >
                  <Ionicons
                    name="arrow-back"
                    size={20}
                    color={currentContentIndex === 0 ? "#8A8FA3" : "#FFFFFF"}
                  />
                  <Text style={[
                    styles.navButtonText,
                    currentContentIndex === 0 && styles.navButtonTextDisabled
                  ]}>
                    Previous
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.navButton,
                    styles.navButtonNext
                  ]}
                  onPress={() => navigateToContent(currentContentIndex + 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navButtonText}>
                    {currentContentIndex === (lesson?.contents.length || 0) - 1 && lesson?.quiz && lesson?.quiz.length > 0
                      ? 'Take Quiz'
                      : 'Next'
                    }
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {/* Quiz Sheet */}
        {showQuiz && renderQuiz()}

        {/* Notes Sheet */}
        {showNotes && renderNotesSheet()}

        {/* Delete Confirmation */}
        {showDeleteConfirm && renderDeleteConfirmation()}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090E23',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lessonHeaderInfo: {
    paddingBottom: 10,
  },
  lessonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4F78FF',
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#B4C6EF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(79, 120, 255, 0.5)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  contentContainer: {
    marginBottom: 24,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentImage: {
    width: '100%',
    height: '100%',
  },
  latexContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  codeContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  codeBlock: {
    padding: 16,
    borderRadius: 12,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  linkIcon: {
    marginRight: 12,
  },
  linkTextContainer: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 14,
    color: '#B4C6EF',
  },
  videoContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  videoLoadingText: {
    color: '#B4C6EF',
    marginTop: 12,
    fontSize: 14,
  },
  textToSpeechButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 120, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  textToSpeechButtonActive: {
    backgroundColor: '#4F78FF',
  },
  textToSpeechText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F78FF',
    marginLeft: 8,
  },
  textToSpeechTextActive: {
    color: '#FFFFFF',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 40,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 120,
  },
  navButtonNext: {
    backgroundColor: '#4F78FF',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginHorizontal: 8,
  },
  navButtonTextDisabled: {
    color: '#8A8FA3',
  },
  quizContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  quizGradient: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  quizHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  quizCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  quizSubtitle: {
    fontSize: 14,
    color: '#B4C6EF',
  },
  quizContent: {
    flex: 1,
  },
  quizContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  questionContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    lineHeight: 24,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  optionSelected: {
    backgroundColor: 'rgba(79, 120, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(79, 120, 255, 0.3)',
  },
  optionCorrect: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  optionWrong: {
    backgroundColor: 'rgba(255, 94, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 94, 0.3)',
  },
  optionIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIndicatorSelected: {
    backgroundColor: '#4F78FF',
  },
  optionIndicatorCorrect: {
    backgroundColor: '#4CAF50',
  },
  optionIndicatorWrong: {
    backgroundColor: '#FF5E5E',
  },
  optionIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B4C6EF',
  },
  optionIndicatorTextSelected: {
    color: '#FFFFFF',
  },
  optionIndicatorTextResult: {
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  optionTextCorrect: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  optionTextWrong: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  resultIcon: {
    marginLeft: 8,
  },
  explanationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  explanationButtonText: {
    fontSize: 14,
    color: '#4F78FF',
    marginRight: 8,
  },
  explanationContainer: {
    backgroundColor: 'rgba(79, 120, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#B4C6EF',
  },
  quizFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  quizSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 120, 255, 0.5)',
    paddingVertical: 16,
    borderRadius: 12,
  },
  quizSubmitButtonActive: {
    backgroundColor: '#4F78FF',
  },
  quizSubmitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  quizResultsContainer: {
    alignItems: 'center',
  },
  quizScoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  quizScoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  quizScoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  quizActionButtons: {
    flexDirection: 'column',
    width: '100%',
    gap: 12,
  },
  quizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  quizRetryButton: {
    backgroundColor: 'rgba(79, 120, 255, 0.1)',
  },
  quizRetryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F78FF',
    marginRight: 8,
  },
  quizFinishButton: {
    backgroundColor: '#4F78FF',
  },
  quizFinishButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  buttonIcon: {
    marginTop: 1,
  },
  notesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  notesGradient: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  notesHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  notesCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  notesSubtitle: {
    fontSize: 14,
    color: '#B4C6EF',
  },
  notesContent: {
    flex: 1,
    padding: 20,
  },
  notesInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
  },
  notesFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  notesActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notesSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F78FF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  notesSaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  notesDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 94, 94, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 12,
  },
  notesDeleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5E5E',
    marginLeft: 8,
  },
  savedNoteContainer: {
    backgroundColor: 'rgba(79, 120, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4F78FF',
    marginTop: 16,
  },
  savedNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  savedNoteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F78FF',
    marginLeft: 8,
  },
  savedNoteText: {
    fontSize: 14,
    color: '#B4C6EF',
    lineHeight: 20,
  },
  deleteConfirmContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 14, 35, 0.8)',
  },
  deleteConfirmGradient: {
    width: width * 0.85,
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteConfirmContent: {
    padding: 24,
    alignItems: 'center',
  },
  deleteConfirmIcon: {
    marginBottom: 16,
  },
  deleteConfirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  deleteConfirmText: {
    fontSize: 16,
    color: '#B4C6EF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  deleteConfirmCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    marginRight: 12,
  },
  deleteConfirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteConfirmDeleteButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FF5E5E',
    alignItems: 'center',
  },
  deleteConfirmDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skeletonContainer: {
    width: '100%',
  },
  skeletonHeader: {
    height: 28,
    width: '70%',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  skeletonSubtitle: {
    height: 16,
    width: '90%',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 30,
  },
  skeletonContentContainer: {
    marginTop: 20,
  },
  skeletonParagraph: {
    height: 100,
    width: '100%',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  skeletonImage: {
    height: 200,
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
});