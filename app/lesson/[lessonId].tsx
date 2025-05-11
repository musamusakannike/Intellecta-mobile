import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
  SafeAreaView,
  Alert,
  FlatList,
  TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, MaterialIcons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { ToastContext } from "@/components/Toast/ToastContext";
import * as Haptics from 'expo-haptics';
import { Skeleton } from "@/components/Skeleton";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideInUp
} from 'react-native-reanimated';
import { API_ROUTES } from '@/constants';
import { WebView } from 'react-native-webview';
import MathJax from 'react-native-mathjax';
import YoutubePlayer from 'react-native-youtube-iframe';
import { BlurView } from 'expo-blur';
import * as Progress from 'react-native-progress';
import { PanGestureHandler } from 'react-native-gesture-handler';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width, height } = Dimensions.get('window');

interface LessonContent {
  type: 'text' | 'image' | 'latex' | 'youtubeUrl';
  content: string;
  order: number;
  _id: string;
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
  const [savedNotes, setSavedNotes] = useState<{[key: string]: string}>({});
  const [contentProgress, setContentProgress] = useState(0);

  const toast = useContext(ToastContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lessonId } = useLocalSearchParams();
  const scrollRef = useRef<ScrollView>(null);
  const confettiRef = useRef<any>(null);
  
  const progressValue = useSharedValue(0);
  const quizSheetPosition = useSharedValue(height);
  const notesSheetPosition = useSharedValue(height);

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
    router.back();
  };

  const navigateToContent = (index: number) => {
    if (!lesson) return;
    
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
      setShowNotes(true);
      notesSheetPosition.value = withSpring(0, { damping: 20, stiffness: 90 });
    }
  };

  const saveNote = async () => {
    if (!lesson || !noteText.trim()) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const contentId = lesson.contents[currentContentIndex]._id;
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
          </Animated.View>
        );
        
      case 'image':
        return (
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={styles.contentContainer}
          >
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: content.content }}
                style={styles.contentImage}
                resizeMode="contain"
                defaultSource={require('@/assets/images/icon.png')}
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
              <MathJax
                html={`$$${content.content}$$`}
                mathJaxOptions={{
                  messageStyle: 'none',
                  extensions: ['tex2jax.js'],
                  jax: ['input/TeX', 'output/HTML-CSS'],
                  tex2jax: {
                    inlineMath: [['$', '$'], ['\$$', '\$$']],
                    displayMath: [['$$', '$$'], ['\\[', '\\]']],
                    processEscapes: true,
                  },
                  TeX: {
                    extensions: ['AMSmath.js', 'AMSsymbols.js', 'noErrors.js', 'noUndefined.js']
                  }
                }}
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
        return null;
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
            <TouchableOpacity
              style={styles.notesSaveButton}
              onPress={saveNote}
              activeOpacity={0.8}
            >
              <Text style={styles.notesSaveButtonText}>Save Note</Text>
              <Ionicons name="save" size={18} color="#FFFFFF" style={styles.buttonIcon} />
            </TouchableOpacity>
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
  videoContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
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
  notesSaveButton: {
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