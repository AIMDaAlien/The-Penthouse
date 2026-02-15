import React, { useState } from 'react';
import { 
    View, 
    Text, 
    Modal, 
    Pressable, 
    Switch, 
    StyleSheet, 
    Alert,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { 
    useAnimatedStyle, 
    useSharedValue, 
    withSpring, 
    withSequence, 
    withTiming,
    runOnJS 
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Glows } from '../designsystem';
import { GlassButton } from './glass/GlassButton'; // Assuming we can reuse or just use Pressable
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
    const { signOut, user } = useAuth();
    const [incinerating, setIncinerating] = useState(false);
    
    // Animation values
    const shake = useSharedValue(0);
    const flashOpacity = useSharedValue(0);

    const animatedShake = useAnimatedStyle(() => ({
        transform: [{ translateX: shake.value }]
    }));

    const animatedFlash = useAnimatedStyle(() => ({
        opacity: flashOpacity.value,
    }));

    const handleNukeData = () => {
        Alert.alert(
            'DATA INCINERATOR',
            'WARNING: This will nuke all local cache and reset app state. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'NUKE IT ☢️', 
                    style: 'destructive',
                    onPress: startIncineration 
                }
            ]
        );
    };

    const startIncineration = () => {
        setIncinerating(true);
        
        // Shake sequence
        shake.value = withSequence(
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(0, { duration: 50 })
        );

        // Flash sequence
        flashOpacity.value = withSequence(
            withTiming(1, { duration: 100 }),
            withTiming(0, { duration: 500 }, (finished) => {
                if (finished) {
                    runOnJS(finalizeIncineration)();
                }
            })
        );
    };

    const finalizeIncineration = () => {
        setIncinerating(false);
        Alert.alert('💥 BOOM', 'Data incinerated successfully.');
        // In a real app, clear AsyncStorage here
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                
                <Animated.View style={[styles.modal, animatedShake]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>SETTINGS</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={Colors.TEXT_MUTED} />
                        </Pressable>
                    </View>

                    <View style={styles.content}>
                        {/* User Info */}
                        <View style={styles.userSection}>
                            <View style={styles.avatar}>
                                {user?.avatarUrl ? (
                                    <Animated.Image 
                                        source={{ uri: user.avatarUrl }} 
                                        style={styles.avatarImg}
                                    />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.initials}>
                                            {user?.username?.[0]?.toUpperCase() || '?'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View>
                                <Text style={styles.username}>{user?.username || 'Ghost'}</Text>
                                <Text style={styles.email}>{user?.email || 'ghost@penthouse.app'}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Data Incinerator */}
                        <Text style={styles.sectionTitle}>DANGER ZONE</Text>
                        <Pressable 
                            style={styles.nukeButton}
                            onPress={handleNukeData}
                            disabled={incinerating}
                        >
                            <Ionicons name="nuclear" size={24} color={Colors.ERROR} />
                            <View style={styles.nukeTextContainer}>
                                <Text style={styles.nukeTitle}>Data Incinerator</Text>
                                <Text style={styles.nukeSubtitle}>Clear all local cache & reset</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.ERROR} />
                        </Pressable>

                        <View style={styles.divider} />

                        {/* Sign Out */}
                        <Pressable style={styles.signOutBtn} onPress={signOut}>
                            <Text style={styles.signOutText}>Log Out</Text>
                        </Pressable>
                    </View>
                </Animated.View>

                {/* Nuclear Flash Overlay */}
                <Animated.View 
                    style={[
                        StyleSheet.absoluteFill, 
                        { backgroundColor: 'white' }, 
                        animatedFlash
                    ]} 
                    pointerEvents="none"
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.L,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modal: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: Colors.EFFECTS.PANEL_BG,
        borderRadius: Radius.L,
        borderWidth: 1,
        borderColor: Colors.EFFECTS.PANEL_BORDER,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.L,
        borderBottomWidth: 1,
        borderBottomColor: Colors.GLASS.PANEL_BORDER,
    },
    title: {
        ...Typography.H3,
        color: Colors.TEXT_NORMAL,
    },
    closeBtn: {
        padding: Spacing.XS,
    },
    content: {
        padding: Spacing.L,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.L,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginRight: Spacing.M,
        borderWidth: 2,
        borderColor: Colors.ACCENT,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.SURFACE,
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    initials: {
        ...Typography.H3,
        color: Colors.TEXT_NORMAL,
    },
    username: {
        ...Typography.H3,
        color: Colors.TEXT_NORMAL,
        marginBottom: 4,
    },
    email: {
        ...Typography.BODY,
        color: Colors.TEXT_MUTED,
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.GLASS.PANEL_BORDER,
        marginVertical: Spacing.L,
    },
    sectionTitle: {
        ...Typography.OVERLINE,
        color: Colors.ERROR,
        marginBottom: Spacing.S,
    },
    nukeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        padding: Spacing.M,
        borderRadius: Radius.M,
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 0, 0.3)',
    },
    nukeTextContainer: {
        flex: 1,
        marginLeft: Spacing.M,
    },
    nukeTitle: {
        ...Typography.BODY,
        fontWeight: '700',
        color: Colors.ERROR,
    },
    nukeSubtitle: {
        ...Typography.MICRO,
        color: Colors.ERROR,
        opacity: 0.8,
    },
    signOutBtn: {
        backgroundColor: Colors.SURFACE,
        padding: Spacing.M,
        borderRadius: Radius.M,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.EFFECTS.PANEL_BORDER,
    },
    signOutText: {
        ...Typography.BODY,
        fontWeight: '600',
        color: Colors.TEXT_NORMAL,
    },
});
