import { View, Text, Pressable } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface VoicePlayerProps {
    uri: string;
    duration?: number; // Duration in seconds
    isMe?: boolean;
}

export default function VoicePlayer({ uri, duration = 0, isMe = false }: VoicePlayerProps) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [totalDuration, setTotalDuration] = useState(duration);
    const [error, setError] = useState(false);
    const progressAnim = useSharedValue(0);

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    // Guard against empty URIs
    if (!uri || uri.trim() === '') {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 160 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#3f3f46', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="volume-mute" size={16} color="#71717a" />
                </View>
                <Text style={{ color: '#71717a', fontSize: 12 }}>Audio unavailable</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 160 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#3f3f46', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="alert-circle" size={16} color="#ef4444" />
                </View>
                <Text style={{ color: '#71717a', fontSize: 12 }}>Failed to load</Text>
            </View>
        );
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const loadAndPlay = async () => {
        try {
            console.log('Loading voice message:', uri);

            // Configure audio mode for playback
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
            });

            if (sound) {
                // Resume if already loaded
                await sound.playAsync();
                setIsPlaying(true);
            } else {
                // Load and play
                const { sound: newSound, status } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );

                if (!status.isLoaded) {
                    console.error('Audio failed to load');
                    setError(true);
                    return;
                }

                setSound(newSound);
                setIsPlaying(true);
            }
        } catch (err) {
            console.error('Failed to play voice message:', err);
            setError(true);
        }
    };

    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;

        const positionSec = status.positionMillis / 1000;
        const durationSec = status.durationMillis ? status.durationMillis / 1000 : totalDuration;

        setPosition(positionSec);
        setTotalDuration(durationSec);

        if (durationSec > 0) {
            progressAnim.value = withTiming(positionSec / durationSec, { duration: 100 });
        }

        if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
            progressAnim.value = withTiming(0, { duration: 200 });
        }
    };

    const pause = async () => {
        if (sound) {
            await sound.pauseAsync();
            setIsPlaying(false);
        }
    };

    const togglePlayPause = () => {
        if (isPlaying) {
            pause();
        } else {
            loadAndPlay();
        }
    };

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressAnim.value * 100}%`,
    }));

    return (
        <View className="flex-row items-center gap-2 min-w-[160px]">
            <Pressable
                onPress={togglePlayPause}
                className={`w-8 h-8 rounded-full items-center justify-center ${isMe ? 'bg-white/20' : 'bg-zinc-600'}`}
            >
                <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={16}
                    color="#fff"
                />
            </Pressable>
            <View className="flex-1">
                <View className={`h-1 rounded-full ${isMe ? 'bg-white/30' : 'bg-zinc-600'}`}>
                    <Animated.View
                        style={progressStyle}
                        className={`h-full rounded-full ${isMe ? 'bg-white' : 'bg-indigo-400'}`}
                    />
                </View>
            </View>
            <Text className={`text-xs ${isMe ? 'text-white/60' : 'text-zinc-400'}`}>
                {isPlaying ? formatTime(position) : formatTime(totalDuration)}
            </Text>
        </View>
    );
}
