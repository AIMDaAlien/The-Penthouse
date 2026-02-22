import { View, Text, Pressable, Image, Alert, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar, updateProfile } from '../src/services/api';
import { GlassPanel } from '../src/components/glass/GlassPanel';
import { GlassRow } from '../src/components/glass/GlassRow';
import { GlassButton } from '../src/components/glass/GlassButton';
import { GlassInput } from '../src/components/glass/GlassInput';
import { Typography } from '../src/designsystem/Typography';
import { Colors } from '../src/designsystem/Colors';
import { Spacing } from '../src/designsystem/Spacing';
import { BlurView } from 'expo-blur';

export default function SettingsScreen() {
    const { user, updateProfile: updateAuthProfile, logout } = useAuth();
    const router = useRouter();

    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const handlePickAvatar = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setUploadingAvatar(true);

                try {
                    const { data } = await uploadAvatar({
                        uri: asset.uri,
                        name: asset.fileName || 'avatar.jpg',
                        type: asset.mimeType || 'image/jpeg',
                    });
                    setAvatarUrl(data.avatarUrl);
                    // Update auth context
                    await updateAuthProfile(displayName || undefined, data.avatarUrl);
                    Alert.alert('Success', 'Avatar updated!');
                } catch (err) {
                    console.error('Avatar upload failed:', err);
                    Alert.alert('Error', 'Failed to upload avatar');
                } finally {
                    setUploadingAvatar(false);
                }
            }
        } catch (err) {
            console.error('Image picker error:', err);
        }
    };

    const handleSaveProfile = async () => {
        if (!displayName.trim()) {
            Alert.alert('Error', 'Display name cannot be empty');
            return;
        }

        try {
            setSaving(true);
            await updateProfile(displayName.trim(), avatarUrl || undefined);
            await updateAuthProfile(displayName.trim(), avatarUrl || undefined);
            Alert.alert('Success', 'Profile updated!');
            router.back();
        } catch (err) {
            console.error('Profile update failed:', err);
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/login');
                    },
                },
            ]
        );
    };

    if (!user) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.LAVENDER} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Modal Backdrop Blur */}
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            
            <GlassPanel style={styles.panel}>
                <View style={styles.header}>
                    <Text style={[Typography.H2, styles.title]}>SETTINGS.sys</Text>
                    <Pressable onPress={() => router.back()} style={styles.closeBtn}>
                         <Ionicons name="close" size={24} color={Colors.TEXT} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {/* User Profile Block */}
                    <View style={styles.profileSection}>
                        <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
                             <View style={styles.avatarContainer}>
                                {uploadingAvatar ? (
                                    <ActivityIndicator color={Colors.LAVENDER} />
                                ) : avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                                ) : (
                                    <Text style={[Typography.H1, { color: Colors.TEXT }]}>
                                        {user.username.substring(0, 2).toUpperCase()}
                                    </Text>
                                )}
                             </View>
                             <View style={styles.camBadge}>
                                <Ionicons name="camera" size={12} color="white" />
                             </View>
                        </Pressable>
                        <View style={styles.profileInfo}>
                            <Text style={[Typography.MONO, { color: Colors.LAVENDER }]}>
                                @{user.username}
                            </Text>
                            <Text style={[Typography.MICRO, { marginTop: 4 }]}>
                                UID: {user.id.toString().padStart(8, '0')}
                            </Text>
                        </View>
                    </View>

                    <Text style={[Typography.MICRO, styles.sectionTitle]}>USER_CONFIG</Text>
                    
                    <View style={{ marginBottom: Spacing.L }}>
                        <Text style={[Typography.MONO, styles.label]}>DISPLAY_NAME</Text>
                        <GlassInput 
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Enter display name"
                            style={Typography.MONO}
                        />
                    </View>

                    <GlassButton 
                        title="SAVE_CHANGES"
                        onPress={handleSaveProfile}
                        loading={saving}
                        variant="primary"
                        style={{ marginBottom: Spacing.L }}
                        textStyle={Typography.MONO}
                    />

                    <Text style={[Typography.MICRO, styles.sectionTitle]}>SYSTEM</Text>

                    <GlassRow onPress={() => {}} style={styles.row}>
                        <Ionicons name="notifications-outline" size={18} color={Colors.TEXT} />
                        <Text style={[Typography.MONO, styles.rowText]}>NOTIFICATIONS</Text>
                        <Ionicons name="chevron-forward" size={16} color={Colors.OVERLAY0} />
                    </GlassRow>

                    <GlassRow onPress={() => {}} style={styles.row}>
                         <Ionicons name="shield-checkmark-outline" size={18} color={Colors.TEXT} />
                         <Text style={[Typography.MONO, styles.rowText]}>PRIVACY</Text>
                         <Ionicons name="chevron-forward" size={16} color={Colors.OVERLAY0} />
                    </GlassRow>

                    <GlassButton 
                        title="TERMINATE_SESSION"
                        onPress={handleLogout}
                        variant="tertiary"
                        textStyle={[Typography.MONO, { color: Colors.ERROR }]}
                        style={{ marginTop: Spacing.L }}
                    />

                    <Text style={[Typography.MICRO, styles.version]}>
                        v1.0.0 // PENTHOUSE_CLIENT
                    </Text>

                </ScrollView>
            </GlassPanel>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end', // Bottom sheet style
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    panel: {
        flex: 1,
        marginTop: 60, // Top offset
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
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
        fontFamily: Typography.MONO.fontFamily,
    },
    closeBtn: {
        padding: Spacing.XS,
    },
    content: {
        padding: Spacing.L,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.L,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.SURFACE0,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.GLASS.PANEL_BORDER,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    camBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.LAVENDER,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInfo: {
        marginLeft: Spacing.M,
    },
    sectionTitle: {
        color: Colors.OVERLAY0,
        marginBottom: Spacing.M,
        marginTop: Spacing.S,
    },
    label: {
        color: Colors.SUBTEXT1,
        marginBottom: Spacing.XS,
        fontSize: 12,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: Spacing.S,
    },
    rowText: {
        flex: 1,
        marginLeft: Spacing.M,
        color: Colors.TEXT,
    },
    version: {
        textAlign: 'center',
        marginTop: Spacing.XL,
        opacity: 0.5,
    }
});

