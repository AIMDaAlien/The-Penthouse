import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { WelcomePanel } from '../../src/features/welcome/WelcomePanel';
import { LobbyPanel } from '../../src/features/lobby/LobbyPanel';
import { PanelTransition } from '../../src/components/PanelTransition';

export default function PanelOrchestrator() {
    const router = useRouter();
    const [currentPanel, setCurrentPanel] = useState<'WELCOME' | 'LOBBY'>('WELCOME');

    const handleEnter = () => {
        setCurrentPanel('LOBBY');
    };

    const handleChannelSelect = (channelId: string) => {
        // Navigate to Chat Screen (New Route, but looks like a panel slide)
        // We pass name/params if needed, or let the chat screen fetch details
        router.push(`/chat/${channelId}`);
    };

    return (
        <View style={styles.container}>
            {/* Lobby functions as the "Base" once entered */}
            <PanelTransition 
                isVisible={currentPanel === 'LOBBY'} 
                direction="up" // Fade in / slide up slightly
                style={{ zIndex: 1 }}
            >
                <LobbyPanel onChannelSelect={handleChannelSelect} />
            </PanelTransition>

            {/* Welcome sits on top until dismissed */}
            <PanelTransition 
                isVisible={currentPanel === 'WELCOME'} 
                direction="up"
                style={{ zIndex: 10 }}
            >
                <WelcomePanel onEnter={handleEnter} />
            </PanelTransition>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // Background is provided by RootLayout
    }
});

