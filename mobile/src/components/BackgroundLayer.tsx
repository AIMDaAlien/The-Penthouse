import React from 'react';
import { StyleSheet, View, Image, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '../designsystem/Colors';

const { width, height } = Dimensions.get('window');

// Use require for local asset
const bgSource = require('../../assets/lounge-bg.png');

export function BackgroundLayer() {
    return (
        <View style={styles.container}>
            {/* 1. Base Image */}
            <Image 
                source={bgSource} 
                style={styles.image} 
                resizeMode="cover"
                blurRadius={Platform.OS === 'android' ? 3 : 0} // Android efficient blur
            />
            
            {/* 2. Blur Layer (iOS mostly, nice quality) */}
            {Platform.OS === 'ios' && (
                <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="dark" />
            )}

            {/* 3. Horizontal Gradient Vignette (Edges dark, center clear-ish) */}
            <LinearGradient
                colors={[Colors.CRUST, 'transparent', 'transparent', Colors.CRUST]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                locations={[0, 0.2, 0.8, 1]}
                style={StyleSheet.absoluteFill}
            />
            
            {/* 4. Vertical Gradient Vignette (Top/Bottom dark) */}
            <LinearGradient
                colors={[Colors.CRUST, 'transparent', 'transparent', Colors.CRUST]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                locations={[0, 0.15, 0.85, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* 5. Lavender Tint Overlay (Unifying Theme) */}
            <View style={styles.tint} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1, // Ensure it sits behind everything
        backgroundColor: Colors.CRUST,
    },
    image: {
        width: width,
        height: height + 50, // Slight overscan for eventual parallax
        position: 'absolute',
    },
    tint: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.LAVENDER,
        opacity: 0.08, // Subtle tint
        mixBlendMode: 'overlay', // IOS only, ignored on Android but safe
    }
});
