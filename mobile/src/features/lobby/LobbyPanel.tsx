import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { GlassPanel } from '../../components/glass/GlassPanel';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassRow } from '../../components/glass/GlassRow';
import { Typography } from '../../designsystem/Typography';
import { Spacing } from '../../designsystem/Spacing';
import { Colors } from '../../designsystem/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useServerContext } from '../../context/ServerContext';
import { ServerRail } from '../../components/ServerRail';

interface LobbyPanelProps {
    onChannelSelect: (channelId: string) => void;
}

export function LobbyPanel({ onChannelSelect }: LobbyPanelProps) {
    const { serverChannels, selectedServerId } = useServerContext();
    const [searchQuery, setSearchQuery] = useState('');

    // Filter channels
    const textChannels = serverChannels.filter(c => c.type !== 'voice');
    const voiceChannels = serverChannels.filter(c => c.type === 'voice');

    return (
        <View style={styles.container}>
            {/* Left Rail (Server List) */}
            <View style={styles.rail}>
                 <ServerRail onAddServer={() => {}} /> 
            </View>

            {/* Main Content (Channel List) */}
            <View style={styles.main}>
                <View style={styles.header}>
                    <GlassInput 
                        placeholder="Find a room..." 
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        icon={<Ionicons name="search" size={16} color={Colors.OVERLAY1} />}
                        style={{ fontSize: 14 }}
                        containerStyle={{ height: 44, backgroundColor: Colors.GLASS.INPUT_BG }}
                    />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {selectedServerId ? (
                        <>
                            <Text style={[Typography.MICRO, styles.sectionTitle]}>TONIGHT</Text>
                            {textChannels.map(channel => (
                                <GlassRow 
                                    key={channel.id} 
                                    onPress={() => onChannelSelect(channel.id.toString())}
                                >
                                    <View style={styles.channelIcon}>
                                        <Text style={{color: Colors.OVERLAY1}}>#</Text>
                                    </View>
                                    <Text style={[Typography.BODY, {color: Colors.TEXT}]}>{channel.name}</Text>
                                </GlassRow>
                            ))}

                            {voiceChannels.length > 0 && (
                                <>
                                    <View style={{height: Spacing.L}} />
                                    <Text style={[Typography.MICRO, styles.sectionTitle]}>VOICE</Text>
                                    {voiceChannels.map(channel => (
                                        <GlassRow 
                                            key={channel.id} 
                                            onPress={() => {}} // Voice disabled for now per user check
                                            style={{ opacity: 0.6 }}
                                        >
                                            <View style={styles.channelIcon}>
                                                <Ionicons name="mic" size={14} color={Colors.OVERLAY1} />
                                            </View>
                                            <Text style={[Typography.BODY, {color: Colors.TEXT}]}>{channel.name} (Lounge)</Text>
                                        </GlassRow>
                                    ))}
                                </>
                            )}
                        </>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={[Typography.H2, {color: Colors.OVERLAY1, textAlign: 'center'}]}>
                                Select a server to join the lounge.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    rail: {
        width: 80, // Matches existing logic, spec says 72dp
        paddingTop: Spacing.L,
        alignItems: 'center',
    },
    main: {
        flex: 1,
        paddingTop: Spacing.XL, // Match rail padding + header spacing
        paddingRight: Spacing.M,
    },
    header: {
        marginBottom: Spacing.L,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    sectionTitle: {
        marginBottom: Spacing.S,
        marginLeft: Spacing.S,
        color: Colors.OVERLAY1,
    },
    channelIcon: {
        width: 24,
        alignItems: 'center',
        marginRight: Spacing.S,
    },
    emptyState: {
        marginTop: Spacing.XXL,
        opacity: 0.7,
    }
});
