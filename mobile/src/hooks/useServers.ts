import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
    getServers,
    getServerDetails,
    createServer,
    createChannel,
    joinServer as joinServerApi,
} from '../services/api';
import type { Server, Channel, User } from '../types';

interface UseServersReturn {
    // State
    servers: Server[];
    selectedServerId: number | null;
    serverChannels: Channel[];
    serverMembers: User[];
    showNewServer: boolean;
    showNewChannel: boolean;
    showJoinServer: boolean;
    joinCode: string;

    // Actions
    loadServers: () => Promise<void>;
    loadServerDetails: (serverId: number) => Promise<void>;
    handleServerSelect: (serverId: number | null) => void;
    setShowNewServer: (show: boolean) => void;
    setShowNewChannel: (show: boolean) => void;
    setShowJoinServer: (show: boolean) => void;
    setJoinCode: (code: string) => void;
    handleCreateServer: (name: string) => Promise<void>;
    handleCreateChannel: (name: string) => Promise<void>;
    handleJoinServer: (code: string) => Promise<{ success: boolean; serverId?: number }>;
}

export function useServers(): UseServersReturn {
    const [servers, setServers] = useState<Server[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<number | null>(null);
    const [serverChannels, setServerChannels] = useState<Channel[]>([]);
    const [serverMembers, setServerMembers] = useState<User[]>([]);

    // UI State
    const [showNewServer, setShowNewServer] = useState(false);
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [showJoinServer, setShowJoinServer] = useState(false);
    const [joinCode, setJoinCode] = useState('');

    const loadServers = useCallback(async () => {
        try {
            const { data } = await getServers();
            setServers(data);
        } catch (err) {
            console.error('Failed to load servers:', err);
        }
    }, []);

    const loadServerDetails = useCallback(async (serverId: number) => {
        try {
            const { data } = await getServerDetails(serverId);
            setServerChannels(data.channels);
            setServerMembers(data.members || []);
        } catch (err) {
            console.error('Failed to load server details:', err);
        }
    }, []);

    const handleServerSelect = useCallback((serverId: number | null) => {
        setSelectedServerId(serverId);
        if (!serverId) {
            setServerChannels([]);
            setServerMembers([]);
        }
    }, []);

    const handleCreateServer = useCallback(async (name: string) => {
        try {
            await createServer(name.trim());
            setShowNewServer(false);
            await loadServers();
        } catch (err) {
            console.error('Server creation failed:', err);
        }
    }, [loadServers]);

    const handleCreateChannel = useCallback(async (name: string) => {
        if (!selectedServerId) return;
        try {
            await createChannel(selectedServerId, name.trim());
            setShowNewChannel(false);
            await loadServerDetails(selectedServerId);
        } catch (err) {
            console.error('Channel creation failed:', err);
        }
    }, [selectedServerId, loadServerDetails]);

    const handleJoinServer = useCallback(async (code: string): Promise<{ success: boolean; serverId?: number }> => {
        try {
            const { data } = await joinServerApi(code.trim());
            if (data.success) {
                setJoinCode('');
                setShowJoinServer(false);
                if (data.alreadyMember) {
                    Alert.alert('Info', 'You are already a member of this server!');
                }
                await loadServers();
                return { success: true, serverId: data.serverId };
            }
            return { success: false };
        } catch (err) {
            console.error('Join failed:', err);
            Alert.alert('Error', 'Failed to join server. Check the code and try again.');
            return { success: false };
        }
    }, [loadServers]);

    return {
        servers,
        selectedServerId,
        serverChannels,
        serverMembers,
        showNewServer,
        showNewChannel,
        showJoinServer,
        joinCode,
        loadServers,
        loadServerDetails,
        handleServerSelect,
        setShowNewServer,
        setShowNewChannel,
        setShowJoinServer,
        setJoinCode,
        handleCreateServer,
        handleCreateChannel,
        handleJoinServer,
    };
}
