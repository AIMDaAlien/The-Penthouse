import { View, Text, Pressable, Alert } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated';

interface VoiceRecorderProps {
    onSend: (uri: string, duration: number, mimeType: string) => void;
    onCancel: () => void;
}

export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [recordingUri, setRecordingUri] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSound, setPlaybackSound] = useState<Audio.Sound | null>(null);

    const durationInterval = useRef<NodeJS.Timeout | null>(null);
    const pulseAnim = useSharedValue(1);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (durationInterval.current) clearInterval(durationInterval.current);
            if (playbackSound) playbackSound.unloadAsync();
            if (recording) recording.stopAndUnloadAsync();
        };
    }, []);

    // Pulse animation when recording
    useEffect(() => {
        if (recording) {
            pulseAnim.value = withRepeat(
                withTiming(1.2, { duration: 500 }),
                -1,
                true
            );
        } else {
            cancelAnimation(pulseAnim);
            pulseAnim.value = 1;
        }
    }, [recording]);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseAnim.value }],
    }));

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            // Request permissions
            const { granted } = await Audio.requestPermissionsAsync();
            if (!granted) {
                Alert.alert('Permission Required', 'Please grant microphone access to record voice messages.');
                return;
            }

            // Configure audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Create and start recording
            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(newRecording);
            setDuration(0);

            // Start duration timer
            durationInterval.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Failed to start recording:', err);
            Alert.alert('Error', 'Failed to start recording');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
                durationInterval.current = null;
            }

            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();

            // Reset audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            setRecording(null);
            if (uri) {
                setRecordingUri(uri);
            }
        } catch (err) {
            console.error('Failed to stop recording:', err);
        }
    };

    const playPreview = async () => {
        if (!recordingUri) return;

        try {
            if (playbackSound) {
                await playbackSound.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: recordingUri },
                { shouldPlay: true }
            );

            setPlaybackSound(sound);
            setIsPlaying(true);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(false);
                }
            });
        } catch (err) {
            console.error('Failed to play preview:', err);
        }
    };

    const stopPreview = async () => {
        if (playbackSound) {
            await playbackSound.stopAsync();
            setIsPlaying(false);
        }
    };

    const handleSend = () => {
        if (recordingUri && duration > 0) {
            onSend(recordingUri, duration, 'audio/m4a');
        }
    };

    const handleCancel = async () => {
        if (recording) {
            await recording.stopAndUnloadAsync();
            setRecording(null);
        }
        if (durationInterval.current) {
            clearInterval(durationInterval.current);
        }
        if (playbackSound) {
            await playbackSound.unloadAsync();
        }
        setRecordingUri(null);
        setDuration(0);
        onCancel();
    };

    // Recording mode
    if (recording) {
        return (
            <View className="flex-row items-center bg-zinc-800 rounded-2xl px-4 py-3 mx-4 mb-4">
                <Animated.View style={pulseStyle}>
                    <View className="w-4 h-4 rounded-full bg-red-500" />
                </Animated.View>
                <Text className="text-white font-semibold ml-3 flex-1">
                    Recording... {formatDuration(duration)}
                </Text>
                <Pressable onPress={handleCancel} className="p-2 mr-2">
                    <Ionicons name="trash" size={24} color="#ef4444" />
                </Pressable>
                <Pressable
                    onPress={stopRecording}
                    className="w-12 h-12 rounded-full bg-indigo-600 items-center justify-center"
                >
                    <Ionicons name="stop" size={24} color="#fff" />
                </Pressable>
            </View>
        );
    }

    // Preview mode (after recording)
    if (recordingUri) {
        return (
            <View className="flex-row items-center bg-zinc-800 rounded-2xl px-4 py-3 mx-4 mb-4">
                <Pressable
                    onPress={isPlaying ? stopPreview : playPreview}
                    className="w-10 h-10 rounded-full bg-zinc-700 items-center justify-center"
                >
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#fff" />
                </Pressable>
                <View className="flex-1 mx-3">
                    <View className="h-1 bg-zinc-600 rounded-full">
                        <View className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }} />
                    </View>
                    <Text className="text-zinc-400 text-xs mt-1">{formatDuration(duration)}</Text>
                </View>
                <Pressable onPress={handleCancel} className="p-2 mr-2">
                    <Ionicons name="trash" size={22} color="#ef4444" />
                </Pressable>
                <Pressable
                    onPress={handleSend}
                    className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center"
                >
                    <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
            </View>
        );
    }

    // Initial state - start recording button
    return (
        <View className="flex-row items-center bg-zinc-800 rounded-2xl px-4 py-3 mx-4 mb-4">
            <Pressable onPress={handleCancel} className="p-2">
                <Ionicons name="close" size={24} color="#71717a" />
            </Pressable>
            <Text className="text-zinc-400 flex-1 text-center">Tap to start recording</Text>
            <Pressable
                onPress={startRecording}
                className="w-12 h-12 rounded-full bg-red-500 items-center justify-center"
            >
                <Ionicons name="mic" size={24} color="#fff" />
            </Pressable>
        </View>
    );
}
