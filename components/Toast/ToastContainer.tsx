import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, { SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { ToastOptions } from './ToastContext';
import Toast from './Toast';

interface Props {
  toast: ToastOptions | null;
  onHide: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

const ToastContainer: React.FC<Props> = ({ toast, onHide }) => {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(onHide, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(400)}
      exiting={SlideOutUp.duration(400)}
      style={styles.container}
    >
      <Toast type={toast.type} message={toast.message} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.9,
    zIndex: 999,
  },
});

export default ToastContainer;
