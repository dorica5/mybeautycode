/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable react/react-in-jsx-scope */
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { useFirstLaunch } from "@/src/hooks/useFirstLaunch";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Colors } from "@/src/constants/Colors";
import { 
  responsiveScale, 
  scalePercent, 
  responsivePadding,
  responsiveMargin
} from "@/src/utils/responsive";

const PAGES = [
  {
    title: "Client history",
    subtitle: "View past client history and upload new haircodes.",
    image: require("@/assets/onboarding1.jpg"),
  },
  {
    title: "Inspiration",
    subtitle: "Share ideas with each other ahead of appointments.",
    image: require("@/assets/onboarding2.jpg"),
  },
  {
    title: "Hairdresser search",
    subtitle: "Find the perfect hairdresser for you.",
    image: require("@/assets/onboarding3.jpg"),
  },
];

export default function Onboarding() {
  const { markSeen } = useFirstLaunch();
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");

  const pageHeight = height - insets.top; 

  const go = (dir: -1 | 1) => {
    const next = index + dir;
    if (next >= 0 && next < PAGES.length) {
      setIndex(next); 
      ref.current?.scrollToIndex({ index: next, animated: true });
    }
  };

  const done = async () => {
    await markSeen();
    router.replace("/Splash"); 
  };

  return (
    <SafeAreaView
      edges={["left", "right",]}
      style={{ flex: 1, backgroundColor: Colors.dark.warmGreen }}
    >
      <StatusBar backgroundColor="transparent" /> 
      <FlatList
        ref={ref}
        data={PAGES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        snapToInterval={width}
        decelerationRate="fast"
        bounces={false}
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <View style={[styles.card, { width, height: pageHeight }]}>
            <Image
              source={item.image}
              style={[styles.img, { height: pageHeight * 0.68 }]}
              resizeMode="cover"
            />

            <View style={styles.footer}>
              <View style={styles.textContainer}>
                <ResponsiveText
                  weight="Bold"
                  size={28}
                  tabletSize={24}
                  style={styles.title}
                >
                  {item.title}
                </ResponsiveText>
                <ResponsiveText 
                  size={15} 
                  tabletSize={13} 
                  style={styles.subtitle}
                >
                  {item.subtitle}
                </ResponsiveText>
              </View>

              <View style={styles.controls}>
                <View style={styles.side}>
                  {index > 0 && (
                    <Pressable style={styles.navBtn} onPress={() => go(-1)}>
                      <Image 
                        source={require("@/assets/icons/on-arrow-left.png")} 
                        style={styles.arrowIcon}
                        resizeMode="contain"
                      />
                    </Pressable>
                  )}
                </View>

               <View pointerEvents="none" style={styles.dots}>
                  {PAGES.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === index && styles.dotActive]}
                    />
                  ))}
                </View>

                <View style={[styles.side, { alignItems: "flex-end" }]}>
                  {index < PAGES.length - 1 ? (
                    <Pressable style={styles.navBtn} onPress={() => go(1)}>
                      <Image 
                        source={require("@/assets/icons/on-arrow-right.png")} 
                        style={styles.arrowIcon}
                        resizeMode="contain"
                      />
                    </Pressable>
                  ) : (
                    <Pressable style={styles.navBtn} onPress={done}>
                       <Image 
                        source={require("@/assets/icons/on-checkmark.png")} 
                        style={styles.arrowIcon}
                        resizeMode="contain"
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.warmGreen,
  },
  img: {
    width: "100%",
  },
  footer: {
    flex: 1,
    backgroundColor: Colors.dark.warmGreen,
    paddingHorizontal: responsivePadding(16),
    paddingTop: responsivePadding(14),
    justifyContent: "space-between",
  },
textContainer: {
  alignItems: "flex-start",
  width: "100%",          // sørger for at begge tar samme bredde
},
title: {
  color: Colors.dark.dark, 
  marginTop: responsiveMargin(10),
  textAlign: "left",
},
 subtitle: {
  marginTop: responsiveMargin(12),
  lineHeight: responsiveScale(22),
  textAlign: "left",
  includeFontPadding: false,   // fjerner default font-padding
  textAlignVertical: "top",    // sørger for at linjene begynner helt øverst
  width: scalePercent(70),          // sørger for at begge tar samme bredde
},
  controls: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: responsiveMargin(14),
    paddingHorizontal: responsivePadding(8),
  },
  side: { width: responsiveScale(56) }, 
  navBtn: {
    width: responsiveScale(46),
    height: responsiveScale(46),
    borderRadius: responsiveScale(24),
    backgroundColor: Colors.dark.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowIcon: {
    width: responsiveScale(20),
    height: responsiveScale(20),
    tintColor: "white", 
  },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: responsiveScale(8),
  },
  dot: {
    width: responsiveScale(8),
    height: responsiveScale(8),
    borderRadius: responsiveScale(4),
    backgroundColor: "black",
    opacity: 0.35,
  },
  dotActive: {
    opacity: 1,
  },
});