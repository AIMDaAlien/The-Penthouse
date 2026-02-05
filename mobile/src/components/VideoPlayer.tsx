import { View, Pressable, Text, StyleSheet, Dimensions } from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_WIDTH = Math.min(SCREEN_WIDTH * 0.7, 280);
const VIDEO_HEIGHT = VIDEO_WIDTH * 0.75;

interface VideoPlayerProps {
    uri: string;
    isMe?: boolean;
    thumbnail?: string;
}

export default function VideoPlayer({ uri, isMe = false }: VideoPlayerProps) {
    const videoRef = useRef<Video>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [error, setError] = useState(false);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
            if (status.error) {
                console.error('Video error:', status.error);
                setError(true);
            }
            return;
        }

        setIsLoaded(true);
        setIsPlaying(status.isPlaying);
        setPosition(status.positionMillis / 1000);

        if (status.durationMillis) {
            setDuration(status.durationMillis / 1000);
        }

        if (status.didJustFinish) {
            setIsPlaying(false);
            videoRef.current?.setPositionAsync(0);
        }
    }, []);

    const togglePlayPause = async () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            await videoRef.current.playAsync();
        }
    };

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    if (error) {
        return (
            <View style={[styles.container, styles.errorContainer]}>
                <Ionicons name="videocam-off" size={32} color="#71717a" />
                <Text style={styles.errorText}>Failed to load video</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Pressable onPress={togglePlayPause} style={styles.videoWrapper}>
                <Video
                    ref={videoRef}
                    source={{ uri }}
                    style={styles.video}
                    resizeMode={ResizeMode.CONTAIN}
                    onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                    shouldPlay={false}
                    isLooping={false}
                    useNativeControls={false}
                />

                {/* Play/Pause overlay */}
                {!isPlaying && (
                    <View style={styles.playOverlay}>
                        <View style={[styles.playButton, isMe ? styles.playButtonMe : styles.playButtonOther]}>
                            <Ionicons name="play" size={24} color="#fff" />
                        </View>
                    </View>
                )}

                {/* Loading indicator */}
                {!isLoaded && !error && (
                    <View style={styles.loadingOverlay}>
                        <Ionicons name="hourglass" size={24} color="#fff" />
                    </View>
                )}
            </Pressable>

            {/* Progress bar and time */}
            <View style={styles.controls}>
                <View style={[styles.progressBar, isMe ? styles.progressBarMe : styles.progressBarOther]}>
                    <View style={[styles.progressFill, isMe ? styles.progressFillMe : styles.progressFillOther, { width: `${progress}%` }]} />
                </View>
                <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
                    {formatTime(position)} / {formatTime(duration)}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: VIDEO_WIDTH,
        borderRadius: 8,
        overflow: 'hidden',
    },
    errorContainer: {
        height: VIDEO_HEIGHT,
        backgroundColor: '#27272a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: '#71717a',
        fontSize: 12,
        marginTop: 8,
    },
    videoWrapper: {
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        backgroundColor: '#000',
        position: 'relative',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playButtonMe: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    playButtonOther: {
        backgroundColor: 'rgba(99,102,241,0.8)',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    controls: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    progressBar: {
        height: 3,
        borderRadius: 1.5,
        marginBottom: 4,
    },
    progressBarMe: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    progressBarOther: {
        backgroundColor: 'rgba(99,102,241,0.3)',
    },
    progressFill: {
        height: '100%',
        borderRadius: 1.5,
    },
    progressFillMe: {
        backgroundColor: '#fff',
    },
    progressFillOther: {
        backgroundColor: '#6366f1',
    },
    timeText: {
        fontSize: 10,
        textAlign: 'right',
    },
    timeTextMe: {
        color: 'rgba(255,255,255,0.7)',
    },
    timeTextOther: {
        color: '#a1a1aa',
    },
});
