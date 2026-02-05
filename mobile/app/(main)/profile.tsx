import { View, Text, TextInput, Pressable, Image, Alert, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar, updateProfile, getMediaUrl } from '../../src/services/api';

export default function ProfileScreen() {
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
                <ActivityIndicator size="large" color="#cba6f7" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
                <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
                    <View style={styles.avatarContainer}>
                        {uploadingAvatar ? (
                            <ActivityIndicator size="large" color="#cba6f7" />
                        ) : avatarUrl ? (
                            <Image source={{ uri: getMediaUrl(avatarUrl) }} style={styles.avatar} />
                        ) : (
                            <Text style={styles.avatarText}>
                                {user.username.substring(0, 2).toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <View style={styles.cameraButton}>
                        <Ionicons name="camera" size={16} color="#fff" />
                    </View>
                </Pressable>
                <Text style={styles.avatarHint}>Tap to change avatar</Text>
            </View>

            {/* Username (read-only) */}
            <View style={styles.field}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.readOnlyInput}>
                    <Text style={styles.readOnlyText}>{user.username}</Text>
                </View>
                <Text style={styles.hint}>Username cannot be changed</Text>
            </View>

            {/* Display Name */}
            <View style={styles.field}>
                <Text style={styles.label}>Display Name</Text>
                <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter display name"
                    placeholderTextColor="#71717a"
                    style={styles.input}
                />
            </View>

            {/* Save Button */}
            <Pressable
                onPress={handleSaveProfile}
                disabled={saving}
                style={styles.saveButton}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
            </Pressable>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Account Section */}
            <Text style={styles.sectionTitle}>Account</Text>

            {/* Logout Button */}
            <Pressable onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.logoutText}>Logout</Text>
            </Pressable>

            {/* App Version */}
            <View style={styles.versionContainer}>
                <Text style={styles.versionText}>App Version 1.0.0</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090b',
    },
    content: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#09090b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#27272a',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#3f3f46',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#71717a',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4f46e5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarHint: {
        color: '#71717a',
        marginTop: 8,
    },
    field: {
        marginBottom: 16,
    },
    label: {
        color: '#a1a1aa',
        fontSize: 14,
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#27272a',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#3f3f46',
    },
    readOnlyInput: {
        backgroundColor: '#1f1f23',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    readOnlyText: {
        color: '#71717a',
        fontSize: 16,
    },
    hint: {
        color: '#52525b',
        fontSize: 12,
        marginTop: 4,
    },
    saveButton: {
        backgroundColor: '#4f46e5',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#27272a',
        marginVertical: 16,
    },
    sectionTitle: {
        color: '#a1a1aa',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: 12,
        paddingVertical: 16,
    },
    logoutText: {
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 32,
    },
    versionText: {
        color: '#52525b',
        fontSize: 12,
    },
});
