import CachedImage from '@/components/CachedImage';
import CodeBlockViewer from '@/components/CodeBlockViewer';
import LatexRenderer from '@/components/LatexRenderer';
import { Skeleton } from "@/components/Skeleton";
import { ToastContext } from "@/components/Toast/ToastContext";
import { API_ROUTES } from '@/constants';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Progress from 'react-native-progress';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';

const { width, height } = Dimensions.get('window');

interface LessonContent {
  type: 'text' | 'image' | 'code' | 'latex' | 'link' | 'youtubeUrl';
  content: string;
  order: number;
  _id: string;
  language?: string; // For code blocks
  title?: string; // For links
}

interface ContentGroup {
  _id: string;
  title: string;
  description?: string;
  contents: LessonContent[];
  order: number;
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
  contentGroups: ContentGroup[];
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
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<{
    score: number;
    passed: boolean;
    userProgress: any;
  } | null>(null);
  const [showExplanation, setShowExplanation] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState<{ [key: string]: boolean }>({});
  const [videoPlaying, setVideoPlaying] = useState<{ [key: string]: boolean }>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [savedNotes, setSavedNotes] = useState<{ [key: string]: string }>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedContentForNote, setSelectedContentForNote] = useState<string | null>(null);

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
  const fetchLessonData = React.useCallback(async () => {
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
        setCurrentGroupIndex(progressIndex);
        progressValue.value = progressIndex / (lessonData.contentGroups.length - 1);
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
  }, [lessonId, router, toast, progressValue]);

  useEffect(() => {
    fetchLessonData();

    // Cleanup speech on unmount
    return () => {
      if (isSpeaking) {
        Speech.stop();
      }
    };
  }, [lessonId, isSpeaking, fetchLessonData]);

  // Save progress when group index changes
  useEffect(() => {
    if (lesson && lesson.contentGroups.length > 0) {
      const saveProgress = async () => {
        await AsyncStorage.setItem(`lesson_progress_${lessonId}`, currentGroupIndex.toString());

        // Update progress bar
        const newProgress = currentGroupIndex / (lesson.contentGroups.length - 1);
        progressValue.value = withTiming(newProgress, { duration: 300 });
      };

      saveProgress();
    }
  }, [currentGroupIndex, lesson, lessonId, progressValue]);

  useEffect(() => {
    // Prevent screen capture on android
    ScreenCapture.preventScreenCaptureAsync();
    // Listen for screenshots on iOS
    const subscribe = ScreenCapture.addScreenshotListener(async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        if (!token) { router.replace('/auth/login'); return; }
        // Report screenshot to server;
        await fetch('https://intellecta-server-h5ug.onrender.com/api/v1/users/screenshot', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        toast?.showToast({
          type: 'warning',
          message: 'Screenshot detected and reported for security.'
        });
      } catch (err) {
        console.error('Error reporting screenshot:', err);
      }
    });
    return () => subscribe.remove();
  }, [toast, router]);

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Stop speech if active
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }

    router.back();
  };

  const navigateToGroup = (index: number) => {
    if (!lesson) return;

    // Stop speech if active
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }

    if (index < 0) {
      index = 0;
    } else if (index >= lesson.contentGroups.length) {
      // If we've reached the end of the content groups, show the quiz
      if (lesson.quiz && lesson.quiz.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        openQuiz();
        return;
      } else {
        // If there's no quiz, go back to the last group
        index = lesson.contentGroups.length - 1;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentGroupIndex(index);
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

  const toggleNotes = (contentId?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (showNotes) {
      notesSheetPosition.value = withSpring(height, { damping: 20, stiffness: 90 });
      setTimeout(() => setShowNotes(false), 300);
    } else {
      if (contentId) {
        setSelectedContentForNote(contentId);
        const existingNote = savedNotes[contentId] || '';
        setNoteText(existingNote);
      }

      setShowNotes(true);
      notesSheetPosition.value = withSpring(0, { damping: 20, stiffness: 90 });
    }
  };

  const saveNote = async () => {
    if (!lesson || !selectedContentForNote) return;

    if (!noteText.trim()) {
      // If note is empty, show delete confirmation
      showDeleteNoteConfirmation();
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const updatedNotes = {
      ...savedNotes,
      [selectedContentForNote]: noteText
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
    if (!selectedContentForNote) return;

    // Only show delete confirmation if there's an existing note
    if (savedNotes[selectedContentForNote]) {
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
    if (!selectedContentForNote) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const updatedNotes = { ...savedNotes };
    delete updatedNotes[selectedContentForNote];

    setSavedNotes(updatedNotes);
    await AsyncStorage.setItem(`lesson_notes_${lessonId}`, JSON.stringify(updatedNotes));

    toast?.showToast({
      type: 'success',
      message: 'Note deleted successfully',
    });

    closeDeleteConfirmation();
    toggleNotes();
  };

  const toggleSpeech = (content: LessonContent) => {
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

  // Render individual content item
  const renderContentItem = (content: LessonContent, groupId: string) => {
    const contentId = content._id;
    const hasNote = savedNotes[contentId] !== undefined;

    switch (content.type) {
      case 'text':
        return (
          <View key={contentId} style={styles.contentItem}>
            <Text style={styles.contentText}>{content.content}</Text>

            <View style={styles.contentActions}>
              <TouchableOpacity
                style={[
                  styles.textToSpeechButton,
                  isSpeaking && styles.textToSpeechButtonActive
                ]}
                onPress={() => toggleSpeech(content)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSpeaking ? "volume-high" : "volume-medium"}
                  size={16}
                  color={isSpeaking ? "#FFFFFF" : "#4F78FF"}
                />
                <Text style={[
                  styles.textToSpeechText,
                  isSpeaking && styles.textToSpeechTextActive
                ]}>
                  {isSpeaking ? "Stop" : "Read"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.noteButton, hasNote && styles.noteButtonActive]}
                onPress={() => toggleNotes(contentId)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={hasNote ? "document-text" : "create-outline"}
                  size={16}
                  color={hasNote ? "#4F78FF" : "#B4C6EF"}
                />
                <Text style={[styles.noteButtonText, hasNote && styles.noteButtonTextActive]}>
                  {hasNote ? "Note" : "Add Note"}
                </Text>
              </TouchableOpacity>
            </View>

            {hasNote && (
              <TouchableOpacity
                style={styles.savedNoteContainer}
                onPress={() => toggleNotes(contentId)}
                activeOpacity={0.8}
              >
                <View style={styles.savedNoteHeader}>
                  <Ionicons name="document-text" size={16} color="#4F78FF" />
                  <Text style={styles.savedNoteTitle}>Your Note</Text>
                </View>
                <Text style={styles.savedNoteText} numberOfLines={2}>
                  {savedNotes[contentId]}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'image':
        return (
          <View key={contentId} style={styles.contentItem}>
            <View style={styles.imageContainer}>
              <CachedImage
                source={content.content}
                style={styles.contentImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.contentActions}>
              <TouchableOpacity
                style={[styles.noteButton, hasNote && styles.noteButtonActive]}
                onPress={() => toggleNotes(contentId)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={hasNote ? "document-text" : "create-outline"}
                  size={16}
                  color={hasNote ? "#4F78FF" : "#B4C6EF"}
                />
                <Text style={[styles.noteButtonText, hasNote && styles.noteButtonTextActive]}>
                  {hasNote ? "Note" : "Add Note"}
                </Text>
              </TouchableOpacity>
            </View>

            {hasNote && (
              <TouchableOpacity
                style={styles.savedNoteContainer}
                onPress={() => toggleNotes(contentId)}
                activeOpacity={0.8}
              >
                <View style={styles.savedNoteHeader}>
                  <Ionicons name="document-text" size={16} color="#4F78FF" />
                  <Text style={styles.savedNoteTitle}>Your Note</Text>
                </View>
                <Text style={styles.savedNoteText} numberOfLines={2}>
                  {savedNotes[contentId]}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'code':
        return (
          <View key={contentId} style={styles.contentItem}>
            <View style={styles.codeContainer}>
              <CodeBlockViewer
                code={content.content}
                language={content.language || 'javascript'}
                theme="dark"
                fontSize={32}
              />
            </View>

            <View style={styles.contentActions}>
              <TouchableOpacity
                style={[styles.noteButton, hasNote && styles.noteButtonActive]}
                onPress={() => toggleNotes(contentId)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={hasNote ? "document-text" : "create-outline"}
                  size={16}
                  color={hasNote ? "#4F78FF" : "#B4C6EF"}
                />
                <Text style={[styles.noteButtonText, hasNote && styles.noteButtonTextActive]}>
                  {hasNote ? "Note" : "Add Note"}
                </Text>
              </TouchableOpacity>
            </View>

            {hasNote && (
              <TouchableOpacity
                style={styles.savedNoteContainer}
                onPress={() => toggleNotes(contentId)}
                activeOpacity={0.8}
              >
                <View style={styles.savedNoteHeader}>
                  <Ionicons name="document-text" size={16} color="#4F78FF" />
                  <Text style={styles.savedNoteTitle}>Your Note</Text>
                </View>
                <Text style={styles.savedNoteText} numberOfLines={2}>
                  {savedNotes[contentId]}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'latex':
        return (
          <View key={contentId} style={styles.contentItem}>
            <View style={styles.latexContainer}>
              <LatexRenderer latex={content.content} />
            </View>

            <View style={styles.contentActions}>
              <TouchableOpacity
                style={[styles.noteButton, hasNote && styles.noteButtonActive]}
                onPress={() => toggleNotes(contentId)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={hasNote ? "document-text" : "create-outline"}
                  size={16}
                  color={hasNote ? "#4F78FF" : "#B4C6EF"}
                />
                <Text style={[styles.noteButtonText, hasNote && styles.noteButtonTextActive]}>
                  {hasNote ? "Note" : "Add Note"}
                </Text>
              </TouchableOpacity>
            </View>

            {hasNote && (
              <TouchableOpacity
                style={styles.savedNoteContainer}
                onPress={() => toggleNotes(contentId)}
                activeOpacity={0.8}
              >
                <View style={styles.savedNoteHeader}>
                  <Ionicons name="document-text" size={16} color="#4F78FF" />
                  <Text style={styles.savedNoteTitle}>Your Note</Text>
                </View>
                <Text style={styles.savedNoteText} numberOfLines={2}>
                  {savedNotes[contentId]}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'link':
        return (
          <View key={contentId} style={styles.contentItem}>
            <TouchableOpacity
              style={styles.linkContainer}
              onPress={() => openLink(content.content)}
              activeOpacity={0.7}
            >
              <View style={styles.linkContent}>
                <Ionicons name="link" size={20} color="#4F78FF" style={styles.linkIcon} />
                <View style={styles.linkTextContainer}>
                  <Text style={styles.linkTitle}>{content.title || 'External Resource'}</Text>
                  <Text style={styles.linkUrl} numberOfLines={1}>{content.content}</Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={18} color="#B4C6EF" />
            </TouchableOpacity>

            <View style={styles.contentActions}>
              <TouchableOpacity
                style={[styles.noteButton, hasNote && styles.noteButtonActive]}
                onPress={() => toggleNotes(contentId)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={hasNote ? "document-text" : "create-outline"}
                  size={16}
                  color={hasNote ? "#4F78FF" : "#B4C6EF"}
                />
                <Text style={[styles.noteButtonText, hasNote && styles.noteButtonTextActive]}>
                  {hasNote ? "Note" : "Add Note"}
                </Text>
              </TouchableOpacity>
            </View>

            {hasNote && (
              <TouchableOpacity
                style={styles.savedNoteContainer}
                onPress={() => toggleNotes(contentId)}
                activeOpacity={0.8}
              >
                <View style={styles.savedNoteHeader}>
                  <Ionicons name="document-text" size={16} color="#4F78FF" />
                  <Text style={styles.savedNoteTitle}>Your Note</Text>
                </View>
                <Text style={styles.savedNoteText} numberOfLines={2}>
                  {savedNotes[contentId]}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'youtubeUrl':
        const videoId = extractYoutubeId(content.content);
        const videoKey = `${groupId}_${contentId}`;

        return (
          <View key={contentId} style={styles.contentItem}>
            <View style={styles.videoContainer}>
              {!videoReady[videoKey] && (
                <View style={styles.videoLoading}>
                  <ActivityIndicator size="large" color="#4F78FF" />
                  <Text style={styles.videoLoadingText}>Loading video...</Text>
                </View>
              )}

              {videoId && (
                <YoutubePlayer
                  height={200}
                  play={videoPlaying[videoKey] || false}
                  videoId={videoId}
                  onReady={() => setVideoReady(prev => ({ ...prev, [videoKey]: true }))}
                  onChangeState={(state: any) => {
                    if (state === 'playing') {
                      setVideoPlaying(prev => ({ ...prev, [videoKey]: true }));
                    } else if (state === 'paused' || state === 'ended') {
                      setVideoPlaying(prev => ({ ...prev, [videoKey]: false }));
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.contentActions}>
              <TouchableOpacity
                style={[styles.noteButton, hasNote && styles.noteButtonActive]}
                onPress={() => toggleNotes(contentId)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={hasNote ? "document-text" : "create-outline"}
                  size={16}
                  color={hasNote ? "#4F78FF" : "#B4C6EF"}
                />
                <Text style={[styles.noteButtonText, hasNote && styles.noteButtonTextActive]}>
                  {hasNote ? "Note" : "Add Note"}
                </Text>
              </TouchableOpacity>
            </View>

            {hasNote && (
              <TouchableOpacity
                style={styles.savedNoteContainer}
                onPress={() => toggleNotes(contentId)}
                activeOpacity={0.8}
              >
                <View style={styles.savedNoteHeader}>
                  <Ionicons name="document-text" size={16} color="#4F78FF" />
                  <Text style={styles.savedNoteTitle}>Your Note</Text>
                </View>
                <Text style={styles.savedNoteText} numberOfLines={2}>
                  {savedNotes[contentId]}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return (
          <View key={contentId} style={styles.contentItem}>
            <Text style={styles.contentText}>Unsupported content type: {content.type}</Text>
          </View>
        );
    }
  };

  // Render content group
  const renderContentGroup = () => {
    if (!lesson || !lesson.contentGroups[currentGroupIndex]) return null;

    const currentGroup = lesson.contentGroups[currentGroupIndex];
    const sortedContents = [...currentGroup.contents].sort((a, b) => a.order - b.order);

    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        style={styles.contentGroupContainer}
      >
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>{currentGroup.title}</Text>
          {currentGroup.description && (
            <Text style={styles.groupDescription}>{currentGroup.description}</Text>
          )}
        </View>

        <View style={styles.groupContents}>
          {sortedContents.map((content) => renderContentItem(content, currentGroup._id))}
        </View>
      </Animated.View>
    );
  };

  // Render quiz (same as before)
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
    if (!selectedContentForNote) return null;

    const existingNote = savedNotes[selectedContentForNote] || '';
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
              onPress={() => toggleNotes()}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.notesTitle}>Your Notes</Text>
            <Text style={styles.notesSubtitle}>
              Take notes for this content
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
                  {currentGroupIndex + 1}/{lesson.contentGroups.length}
                </Text>

                <View style={styles.headerActions}>
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
              {renderContentGroup()}

              <View style={styles.navigationButtons}>
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    currentGroupIndex === 0 && styles.navButtonDisabled
                  ]}
                  onPress={() => navigateToGroup(currentGroupIndex - 1)}
                  activeOpacity={currentGroupIndex === 0 ? 0.5 : 0.7}
                  disabled={currentGroupIndex === 0}
                >
                  <Ionicons
                    name="arrow-back"
                    size={20}
                    color={currentGroupIndex === 0 ? "#8A8FA3" : "#FFFFFF"}
                  />
                  <Text style={[
                    styles.navButtonText,
                    currentGroupIndex === 0 && styles.navButtonTextDisabled
                  ]}>
                    Previous
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.navButton,
                    styles.navButtonNext
                  ]}
                  onPress={() => navigateToGroup(currentGroupIndex + 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navButtonText}>
                    {currentGroupIndex === (lesson?.contentGroups.length || 0) - 1 && lesson?.quiz && lesson?.quiz.length > 0
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  contentGroupContainer: {
    marginBottom: 24,
  },
  groupHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 14,
    color: '#B4C6EF',
    lineHeight: 20,
  },
  groupContents: {
    gap: 20,
  },
  contentItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  contentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  textToSpeechButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 120, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  textToSpeechButtonActive: {
    backgroundColor: '#4F78FF',
  },
  textToSpeechText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4F78FF',
    marginLeft: 6,
  },
  textToSpeechTextActive: {
    color: '#FFFFFF',
  },
  noteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  noteButtonActive: {
    backgroundColor: 'rgba(79, 120, 255, 0.1)',
  },
  noteButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B4C6EF',
    marginLeft: 6,
  },
  noteButtonTextActive: {
    color: '#4F78FF',
  },
  savedNoteContainer: {
    backgroundColor: 'rgba(79, 120, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4F78FF',
    marginTop: 12,
  },
  savedNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  savedNoteTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F78FF',
    marginLeft: 6,
  },
  savedNoteText: {
    fontSize: 12,
    color: '#B4C6EF',
    lineHeight: 16,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentImage: {
    width: '100%',
    height: '100%',
  },
  latexContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  codeContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  linkIcon: {
    marginRight: 10,
  },
  linkTextContainer: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  linkUrl: {
    fontSize: 12,
    color: '#B4C6EF',
  },
  videoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
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
    fontSize: 12,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
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
  // Quiz styles (same as before)
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
    paddingVertical: 14,
    borderRadius: 12,
  },
  quizSubmitButtonActive: {
    backgroundColor: '#4F78FF',
  },
  quizSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  quizResultsContainer: {
    width: '100%',
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
    marginTop: 8,
  },
  quizActionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  quizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 140,
  },
  quizRetryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  quizRetryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F78FF',
    marginRight: 8,
  },
  quizFinishButton: {
    backgroundColor: '#4F78FF',
  },
  quizFinishButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  // Notes styles
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
  notesDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 94, 94, 0.1)',
  },
  notesDeleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF5E5E',
    marginLeft: 8,
  },
  notesSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F78FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 140,
  },
  notesSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  // Delete confirmation styles
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
    width: '80%',
    maxWidth: 320,
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
    fontSize: 14,
    color: '#B4C6EF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 16,
  },
  deleteConfirmCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteConfirmCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteConfirmDeleteButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF5E5E',
  },
  deleteConfirmDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Skeleton styles
  skeletonContainer: {
    marginBottom: 24,
  },
  skeletonHeader: {
    height: 28,
    width: '70%',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonSubtitle: {
    height: 16,
    width: '50%',
    borderRadius: 4,
    marginBottom: 24,
  },
  skeletonContentContainer: {
    gap: 16,
  },
  skeletonParagraph: {
    height: 100,
    width: '100%',
    borderRadius: 8,
  },
  skeletonImage: {
    height: 180,
    width: '100%',
    borderRadius: 8,
  },
});