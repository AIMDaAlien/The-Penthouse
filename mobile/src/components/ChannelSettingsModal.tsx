import React, { useState } from 'react';
import { 
    View, 
    Text, 
    Modal, 
    Pressable, 
    Alert, 
    ActivityIndicator, 
    StyleSheet, 
    ScrollView,
    Switch
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import Animated, { SlideInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Glows } from '../designsystem';
import { updateChannel, deleteChannel, getRoles, updateChannelPermissions } from '../services/api';
import { GlassPanel } from './glass/GlassPanel';
import { GlassInput } from './glass/GlassInput';
import { GlassButton } from './glass/GlassButton';
import { Channel, Role } from '../types';

interface ChannelSettingsModalProps {
    visible: boolean;
    channel: Channel | null;
    onClose: () => void;
    onUpdate: () => void;
}

type Tab = 'overview' | 'permissions' | 'delete';

export default function ChannelSettingsModal({ visible, channel, onClose, onUpdate }: ChannelSettingsModalProps) {
    if (!channel) return null;

    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [name, setName] = useState(channel.name);
    const [vibe, setVibe] = useState(channel.vibe || 'default');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            await updateChannel(channel.id, { name, vibe });
            onUpdate();
            onClose();
        } catch (err) {
            console.error('Failed to update channel:', err);
            Alert.alert('Error', 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Channel',
            `Are you sure you want to delete #${channel.name}? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeleting(true);
                            await deleteChannel(channel.id);
                            onUpdate();
                            onClose();
                        } catch (err) {
                            console.error('Failed to delete channel:', err);
                            Alert.alert('Error', 'Failed to delete channel');
                        } finally {
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                
                <GlassPanel style={styles.panel}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>CHANNEL SETTINGS</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={Colors.TEXT_MUTED} />
                        </Pressable>
                    </View>

                    <View style={styles.content}>
                        {/* Sidebar */}
                        <View style={styles.sidebar}>
                            <SidebarItem 
                                label="Overview" 
                                active={activeTab === 'overview'} 
                                onPress={() => setActiveTab('overview')} 
                            />
                            <SidebarItem 
                                label="Permissions" 
                                active={activeTab === 'permissions'} 
                                onPress={() => setActiveTab('permissions')} 
                            />
                            <View style={styles.divider} />
                            <SidebarItem 
                                label="Delete Channel" 
                                active={activeTab === 'delete'} 
                                onPress={() => setActiveTab('delete')} 
                                destructive 
                            />
                        </View>

                        {/* Main Content Area */}
                        <ScrollView style={styles.mainContent}>
                            {activeTab === 'overview' && (
                                <>
                                    <Text style={styles.sectionLabel}>CHANNEL NAME</Text>
                                    <GlassInput 
                                        value={name}
                                        onChangeText={setName}
                                        style={styles.input}
                                    />

                                    <Text style={styles.sectionLabel}>CHANNEL VIBE</Text>
                                    <View style={styles.vibeGrid}>
                                        {['default', 'chill', 'hype', 'serious'].map(v => (
                                            <VibeSelector 
                                                key={v}
                                                vibe={v}
                                                selected={vibe === v}
                                                onSelect={() => setVibe(v as any)}
                                            />
                                        ))}
                                    </View>

                                    <GlassButton 
                                        title="Save Changes"
                                        onPress={handleSave}
                                        loading={saving}
                                        style={styles.saveBtn}
                                    />
                                </>
                            )}

                            {activeTab === 'permissions' && (
                                <PermissionsTab 
                                    channel={channel} 
                                    onUpdate={onUpdate} 
                                />
                            )}

                            {activeTab === 'delete' && (
                                <View style={styles.deleteSection}>
                                    <Text style={styles.deleteTitle}>Delete Channel</Text>
                                    <Text style={styles.deleteText}>
                                        Are you sure you want to delete <Text style={{fontWeight: 'bold'}}>#{channel.name}</Text>? 
                                        This action cannot be undone.
                                    </Text>
                                    <GlassButton 
                                        title="Delete Channel"
                                        onPress={handleDelete}
                                        loading={deleting}
                                        variant="tertiary"
                                        style={styles.deleteBtn}
                                        textStyle={{ color: Colors.ERROR }}
                                    />
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </GlassPanel>
            </View>
        </Modal>
    );
}

function SidebarItem({ label, active, onPress, destructive }: any) {
    return (
        <Pressable 
            onPress={onPress}
            style={[
                styles.sidebarItem,
                active && styles.sidebarItemActive
            ]}
        >
            <Text style={[
                styles.sidebarLabel,
                active && styles.sidebarLabelActive,
                destructive && { color: Colors.ERROR }
            ]}>
                {label}
            </Text>
        </Pressable>
    );
}

function VibeSelector({ vibe, selected, onSelect }: any) {
    const getColor = (v: string) => {
        switch(v) {
            case 'chill': return '#6bf';
            case 'hype': return '#f0f';
            case 'serious': return '#888';
            default: return Colors.ACCENT;
        }
    };

    return (
        <Pressable 
            onPress={onSelect}
            style={[
                styles.vibeItem,
                selected && { borderColor: getColor(vibe), backgroundColor: getColor(vibe) + '20' }
            ]}
        >
            <View style={[styles.vibeDot, { backgroundColor: getColor(vibe) }]} />
            <Text style={[styles.vibeText, selected && { color: getColor(vibe) }]}>
                {vibe.toUpperCase()}
            </Text>
        </Pressable>
    );
}

function PermissionsTab({ channel, onUpdate }: { channel: Channel; onUpdate: () => void }) {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    // Mock allowed roles for this channel (in real app, this comes from channel.allowedRoles)
    const [allowedRoles, setAllowedRoles] = useState<string[]>(channel.allowedRoles || ['role_owner', 'role_vip', 'role_guest']);

    React.useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        try {
            const response = await getRoles(channel.serverId || 0);
            setRoles(response.data);
        } catch (err) {
            console.error('Failed to load roles:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleRole = async (roleId: string, allowed: boolean) => {
        // Optimistic update
        const newAllowed = allowed 
            ? [...allowedRoles, roleId]
            : allowedRoles.filter(id => id !== roleId);
        
        setAllowedRoles(newAllowed);

        try {
            await updateChannelPermissions(channel.id, roleId, allowed);
            onUpdate(); // Refresh parent if needed
        } catch (err) {
            Alert.alert('Error', 'Failed to update permissions');
            // Revert
            setAllowedRoles(allowedRoles);
        }
    };

    if (loading) {
        return (
            <View style={{ padding: Spacing.L }}>
                <ActivityIndicator color={Colors.ACCENT} />
            </View>
        );
    }

    return (
        <View>
            <Text style={styles.sectionLabel}>WHO CAN ACCESS?</Text>
            <Text style={styles.helperText}>
                Control which roles can see and join this channel.
            </Text>

            <View style={styles.rolesList}>
                {roles.map(role => {
                    const isAllowed = allowedRoles.includes(role.id);
                    return (
                        <View key={role.id} style={styles.roleRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={[styles.roleDot, { backgroundColor: role.color }]} />
                                <Text style={styles.roleName}>{role.name}</Text>
                            </View>
                            
                            <Switch
                                value={isAllowed}
                                onValueChange={(val) => toggleRole(role.id, val)}
                                trackColor={{ false: Colors.SURFACE, true: Colors.SUCCESS }}
                                thumbColor={Colors.TEXT_NORMAL}
                            />
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: Spacing.M,
    },
    panel: {
        flex: 1,
        maxHeight: 600,
        padding: 0,
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
    closeButton: {
        padding: Spacing.XS,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: 120,
        borderRightWidth: 1,
        borderRightColor: Colors.GLASS.PANEL_BORDER,
        padding: Spacing.S,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    sidebarItem: {
        paddingVertical: Spacing.SM,
        paddingHorizontal: Spacing.M,
        borderRadius: Radius.S,
        marginBottom: 2,
    },
    sidebarItemActive: {
        backgroundColor: Colors.SURFACE,
    },
    sidebarLabel: {
        ...Typography.MICRO,
        color: Colors.TEXT_MUTED,
    },
    sidebarLabelActive: {
        color: Colors.TEXT_NORMAL,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.GLASS.PANEL_BORDER,
        marginVertical: Spacing.M,
    },
    mainContent: {
        flex: 1,
        padding: Spacing.L,
    },
    sectionLabel: {
        ...Typography.OVERLINE,
        color: Colors.TEXT_MUTED,
        marginBottom: Spacing.XS,
        marginTop: Spacing.M,
    },
    input: {
        marginBottom: Spacing.L,
    },
    vibeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.S,
        marginBottom: Spacing.XL,
    },
    vibeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.M,
        paddingVertical: Spacing.SM,
        backgroundColor: Colors.SURFACE,
        borderRadius: Radius.PILL,
        borderWidth: 1,
        borderColor: Colors.EFFECTS.PANEL_BORDER,
        gap: 6,
    },
    vibeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    vibeText: {
        ...Typography.MICRO,
        color: Colors.TEXT_MUTED,
    },
    saveBtn: {
        alignSelf: 'flex-end',
        width: 140,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Spacing.XL,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: Spacing.M,
        color: Colors.TEXT_MUTED,
    },
    deleteSection: {
        padding: Spacing.M,
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderRadius: Radius.M,
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 0, 0.3)',
    },
    deleteTitle: {
        ...Typography.H3,
        color: Colors.TEXT_NORMAL,
        marginBottom: Spacing.S,
    },
    deleteText: {
        ...Typography.BODY,
        color: Colors.TEXT_NORMAL,
        marginBottom: Spacing.L,
    },
    deleteBtn: {
        backgroundColor: Colors.ERROR,
        borderWidth: 0,
    },
    helperText: {
        ...Typography.BODY,
        color: Colors.TEXT_MUTED,
        fontSize: 14,
        marginBottom: Spacing.M,
    },
    rolesList: {
        marginTop: Spacing.S,
    },
    roleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.M,
        borderBottomWidth: 1,
        borderBottomColor: Colors.GLASS.PANEL_BORDER,
    },
    roleDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: Spacing.M,
    },
    roleName: {
        ...Typography.BODY,
        color: Colors.TEXT_NORMAL,
        fontWeight: '600',
    }
});
