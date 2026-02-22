import { Modal, View, Pressable, Dimensions, Share, Alert, StatusBar } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useState } from 'react';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerProps {
    visible: boolean;
    imageUri: string;
    onClose: () => void;
}

export default function ImageViewer({ visible, imageUri, onClose }: ImageViewerProps) {
    const [saving, setSaving] = useState(false);

    // Animation values
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const resetZoom = () => {
        'worklet';
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
    };

    // Pinch gesture for zoom
    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 5));
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                savedScale.value = scale.value;
            }
        });

    // Pan gesture for moving when zoomed
    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    // Double tap to zoom in/out
    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value > 1) {
                resetZoom();
            } else {
                scale.value = withSpring(2.5);
                savedScale.value = 2.5;
            }
        });

    // Single tap to close (only when not zoomed)
    const singleTapGesture = Gesture.Tap()
        .numberOfTaps(1)
        .onEnd(() => {
            if (scale.value <= 1.1) {
                runOnJS(onClose)();
            }
        });

    // Compose gestures - simultaneous pinch and pan, race between single and double tap
    const composedGestures = Gesture.Simultaneous(
        pinchGesture,
        panGesture,
        Gesture.Exclusive(doubleTapGesture, singleTapGesture)
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    const handleShare = async () => {
        try {
            await Share.share({
                url: imageUri,
                message: imageUri,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const handleDownload = async () => {
        try {
            setSaving(true);

            // Request permissions
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant media library access to save images.');
                return;
            }

            // Download the file using new expo-file-system API
            const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
            const destinationFile = new ExpoFile(Paths.cache, filename);

            await ExpoFile.downloadFileAsync(imageUri, destinationFile);

            // Save to media library
            await MediaLibrary.saveToLibraryAsync(destinationFile.uri);
            Alert.alert('Saved', 'Image saved to your photo library.');
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Failed to save image.');
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        resetZoom();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <StatusBar barStyle="light-content" backgroundColor="black" />
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View className="flex-1 bg-black">
                    {/* Close button */}
                    <Pressable
                        onPress={handleClose}
                        className="absolute top-14 left-4 z-20 w-10 h-10 rounded-full bg-black/60 items-center justify-center"
                    >
                        <Ionicons name="close" size={24} color="white" />
                    </Pressable>

                    {/* Image with gestures */}
                    <GestureDetector gesture={composedGestures}>
                        <Animated.Image
                            source={{ uri: imageUri }}
                            style={[
                                {
                                    width: SCREEN_WIDTH,
                                    height: SCREEN_HEIGHT,
                                },
                                animatedStyle,
                            ]}
                            resizeMode="contain"
                        />
                    </GestureDetector>

                    {/* Bottom action bar */}
                    <View className="absolute bottom-10 left-0 right-0 flex-row justify-center gap-12">
                        <Pressable
                            onPress={handleShare}
                            className="w-12 h-12 rounded-full bg-white/10 items-center justify-center"
                        >
                            <Ionicons name="share-outline" size={24} color="white" />
                        </Pressable>
                        <Pressable
                            onPress={handleDownload}
                            disabled={saving}
                            className="w-12 h-12 rounded-full bg-white/10 items-center justify-center"
                        >
                            <Ionicons
                                name={saving ? 'hourglass' : 'download-outline'}
                                size={24}
                                color="white"
                            />
                        </Pressable>
                    </View>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}
