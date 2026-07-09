import { useEffect, useRef } from 'react'
import { Animated, Easing, Image, Modal, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Download, RefreshCw, Sparkles } from 'lucide-react-native'
import { useOtaUpdate } from '@/hooks/useOtaUpdate'
import { NeoButton, NeoSurface } from '@/components/ui'
import { colors, radius, shadows } from '@/theme/tokens'

const BANNER_HIDDEN_OFFSET = -140

function OtaProgressBar() {
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]),
    )

    loop.start()
    return () => loop.stop()
  }, [progress])

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['12%', '100%'],
  })

  return (
    <View
      style={{
        height: 8,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: radius,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          width,
          backgroundColor: colors.main,
        }}
      />
    </View>
  )
}

function OtaApplyingOverlay() {
  const scale = useRef(new Animated.Value(0.88)).current
  const opacity = useRef(new Animated.Value(0)).current
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 14,
        stiffness: 160,
        useNativeDriver: true,
      }),
    ]).start()

    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity, scale, spin])

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent presentationStyle="overFullScreen">
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(17, 17, 17, 0.82)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          opacity,
        }}
      >
        <Animated.View style={{ transform: [{ scale }], width: '100%', maxWidth: 360 }}>
          <NeoSurface shadow="lg" style={{ gap: 16, alignItems: 'center' }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: radius,
                backgroundColor: colors.main,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                ...shadows.md,
              }}
            >
              <Image
                source={require('../assets/arumanis.png')}
                style={{ width: 52, height: 52 }}
                resizeMode="contain"
              />
            </View>

            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>OTA UPDATE</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground, textAlign: 'center' }}>
                Memperbarui aplikasi
              </Text>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>
                Versi terbaru sedang diterapkan. Mohon tunggu sebentar.
              </Text>
            </View>

            <Animated.View style={{ transform: [{ rotate }] }}>
              <RefreshCw size={28} color={colors.foreground} strokeWidth={2.5} />
            </Animated.View>
          </NeoSurface>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

export function OtaUpdateBanner() {
  const insets = useSafeAreaInsets()
  const { phase, isVisible, applyNow } = useOtaUpdate()
  const slideY = useRef(new Animated.Value(BANNER_HIDDEN_OFFSET)).current
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!isVisible || phase === 'applying') {
      Animated.timing(slideY, {
        toValue: BANNER_HIDDEN_OFFSET,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start()
      return
    }

    Animated.spring(slideY, {
      toValue: 0,
      damping: 16,
      stiffness: 190,
      mass: 0.9,
      useNativeDriver: true,
    }).start()
  }, [isVisible, phase, slideY])

  useEffect(() => {
    if (phase !== 'ready') {
      pulse.setValue(1)
      return
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    )

    loop.start()
    return () => loop.stop()
  }, [phase, pulse])

  if (phase === 'applying') {
    return <OtaApplyingOverlay />
  }

  if (!isVisible) {
    return null
  }

  const title =
    phase === 'checking'
      ? 'Memeriksa pembaruan...'
      : phase === 'downloading'
        ? 'Mengunduh pembaruan...'
        : 'Pembaruan siap dipasang'

  const description =
    phase === 'ready'
      ? 'Versi terbaru sudah diunduh. Terapkan sekarang atau otomatis saat aplikasi diminimalkan.'
      : 'Mohon tetap buka aplikasi sampai proses selesai.'

  const Icon = phase === 'ready' ? Sparkles : Download

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingTop: insets.top + 8,
        paddingHorizontal: 12,
        transform: [{ translateY: slideY }],
      }}
    >
      <Animated.View style={{ transform: [{ scale: phase === 'ready' ? pulse : 1 }] }}>
        <NeoSurface shadow="lg" style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: radius,
                backgroundColor: colors.main,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={20} color={colors.foreground} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedForeground }}>UPDATE APLIKASI</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.foreground }}>{title}</Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>{description}</Text>
            </View>
          </View>

          {phase === 'downloading' || phase === 'checking' ? <OtaProgressBar /> : null}

          {phase === 'ready' ? (
            <NeoButton label="Terapkan sekarang" onPress={() => void applyNow()} fullWidth />
          ) : null}
        </NeoSurface>
      </Animated.View>
    </Animated.View>
  )
}