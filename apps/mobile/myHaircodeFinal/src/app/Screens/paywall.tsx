import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { 
  responsiveScale, 
  scalePercent, 
  responsivePadding, 
  responsiveMargin, 
  responsiveBorderRadius 
} from "@/src/utils/responsive";
import { Colors } from "@/src/constants/Colors";
import MyButton from "@/src/components/MyButton";
import { MaterialIcons } from "@expo/vector-icons";
import Purchases from "react-native-purchases";
import {
  getOfferingsSafe,
  findPackage,
  hasActiveEntitlement,
} from "@/src/lib/revenuecat";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";

type Plan = "monthly" | "annual" | "lifetime";

const Paywall = () => {
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    let alive = true;
    (async () => {
      const o = await getOfferingsSafe();
      if (!alive) return;
      setOfferings(o);
      setInitializing(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const monthlyPkg = useMemo(() => findPackage(offerings, "monthly"), [offerings]);
  const annualPkg  = useMemo(() => findPackage(offerings, "annual"),  [offerings]);
  const lifePkg    = useMemo(() => findPackage(offerings, "lifetime"),[offerings]);

  const priceOf = (pkg: any | null | undefined) =>
    pkg?.product?.priceString ?? "";

  const hasIntroOrTrial = (pkg: any | null | undefined) =>
    Boolean(
      pkg?.product?.introductoryPrice ||
      pkg?.product?.introductoryPriceString ||
      pkg?.product?.discounts?.length
    );

  const selectedPkg = useMemo(
    () => findPackage(offerings, selectedPlan),
    [offerings, selectedPlan]
  );

  const handlePurchase = async () => {
    try {
      if (!selectedPkg) {
        Alert.alert("Unavailable", "This plan is not available right now.");
        return;
      }
      setLoading(true);

      const { customerInfo } = await Purchases.purchasePackage(selectedPkg);

      // 🔹 Force refresh with RevenueCat
      await Purchases.syncPurchases();
      const latestInfo = await Purchases.getCustomerInfo();

      if (hasActiveEntitlement(latestInfo)) {
        console.log("Purchase succeeded: entitlement active");
        router.replace("/(client)/(tabs)/home");
      } else {
        Alert.alert(
          "Not Activated",
          "Your purchase didn't activate. Please contact support."
        );
      }
    } catch (e: any) {
      if (e?.userCancelled) return;
      if (e?.code === "PURCHASE_PENDING") {
        Alert.alert(
          "Pending",
          "Your purchase is pending. You'll get access once it's approved."
        );
        return;
      }
      Alert.alert("Purchase failed", e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      const { customerInfo } = await Purchases.restorePurchases();

      await Purchases.syncPurchases();
      const latestInfo = await Purchases.getCustomerInfo();

      if (hasActiveEntitlement(latestInfo)) {
        console.log("Restore succeeded: entitlement active");
        router.replace("/(client)/(tabs)/home");
      } else {
        Alert.alert("No purchases found", "We couldn't find an active purchase.");
      }
    } catch (e: any) {
      Alert.alert("Restore failed", e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const renderPlanOption = (
    label: string,
    price: string,
    plan: Plan,
    options?: { badge?: string; showTrialChip?: boolean }
  ) => {
    const isSelected = selectedPlan === plan;
    return (
      <TouchableOpacity
        onPress={() => setSelectedPlan(plan)}
        activeOpacity={0.9}
        style={[styles.card, isSelected && styles.cardSelected]}
      >
        {options?.badge && (
          <View style={styles.floatingBadge}>
            <ResponsiveText 
              size={11} 
              tabletSize={10} 
              weight="Bold" 
              style={styles.badgeText}
            >
              {options.badge}
            </ResponsiveText>
          </View>
        )}

        <View style={styles.left}>
          <View
            style={[styles.checkboxBox, isSelected && styles.checkboxSelected]}
          >
            {isSelected && (
              <MaterialIcons 
                name="check" 
                size={responsiveScale(14)} 
                color="black" 
              />
            )}
          </View>

          <ResponsiveText 
            weight="SemiBold" 
            size={18} 
            tabletSize={14} 
            style={styles.optionText}
          >
            {label}
          </ResponsiveText>
        </View>

        <View style={styles.rightSide}>
          <ResponsiveText 
            weight="SemiBold" 
            size={15} 
            tabletSize={13}
          >
            {price || "—"}
          </ResponsiveText>

          {options?.showTrialChip && (
            <ResponsiveText 
              size={12} 
              tabletSize={10} 
              style={styles.trialChip}
            >
              Free trial available
            </ResponsiveText>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const offeringsReady =
    !initializing && (monthlyPkg || annualPkg || lifePkg);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.fullWidth}>
        <ResponsiveText 
          weight="SemiBold" 
          size={20} 
          tabletSize={16} 
          style={styles.title}
        >
          Choose your plan
        </ResponsiveText>

        {!offeringsReady ? (
          <>
            {renderPlanOption("Yearly", "", "annual")}
            {renderPlanOption("Monthly", "", "monthly")}
            {renderPlanOption("Lifetime", "", "lifetime")}
          </>
        ) : (
          <>
            {renderPlanOption(
              "Yearly",
              priceOf(annualPkg),
              "annual",
              {
                badge: "Save 57%",
                showTrialChip: hasIntroOrTrial(annualPkg),
              }
            )}
            {renderPlanOption(
              "Monthly",
              priceOf(monthlyPkg),
              "monthly",
              { showTrialChip: hasIntroOrTrial(monthlyPkg) }
            )}
            {renderPlanOption(
              "Lifetime",
              priceOf(lifePkg),
              "lifetime"
            )}
          </>
        )}

        <MyButton
          onPress={handlePurchase}
          text={loading ? "Processing..." : "Continue"}
          textSize={18}
          textTabletSize={14}
          style={styles.btn}
          disabled={loading || !selectedPkg}
        />

        <TouchableOpacity
          onPress={handleRestore}
          disabled={loading}
          style={styles.restoreButton}
        >
          <ResponsiveText 
            size={14} 
            tabletSize={12} 
            style={styles.restoreText}
          >
            Restore purchases
          </ResponsiveText>
        </TouchableOpacity>

        <MyButton 
          text="Sign Out" 
          textSize={18}
          textTabletSize={14}
          style={styles.button} 
          onPress={signOut}
        />
      </View>
    </SafeAreaView>
  );
};

export default Paywall;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: "center",
    paddingHorizontal: responsivePadding(16),
  },
  fullWidth: { 
    width: scalePercent(93), 
    alignItems: "center",
    alignSelf: "center",
  },
  title: { 
    textAlign: "center", 
    marginTop: responsiveMargin(20), 
    marginBottom: responsiveMargin(60),
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: responsivePadding(18),
    paddingHorizontal: responsivePadding(20),
    backgroundColor: Colors.dark.yellowish,
    borderRadius: responsiveBorderRadius(20),
    marginBottom: responsiveMargin(20),
    alignItems: "center",
    borderColor: "transparent",
    borderWidth: responsiveScale(1),
    position: "relative",
  },
  cardSelected: { 
    borderColor: Colors.dark.warmGreen,
    borderWidth: responsiveScale(2),
  },
  left: { 
    flexDirection: "row", 
    alignItems: "center",
    flex: 1,
  },
  rightSide: { 
    alignItems: "flex-end",
    minWidth: responsiveScale(80),
  },
  optionText: { 
    marginLeft: responsiveMargin(10),
    flex: 1,
  },
  checkboxBox: {
    width: responsiveScale(20),
    height: responsiveScale(20),
    borderRadius: responsiveBorderRadius(15),
    borderWidth: responsiveScale(2),
    borderColor: Colors.dark.dark,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxSelected: {
    backgroundColor: Colors.dark.warmGreen,
    borderColor: Colors.dark.dark,
  },
  floatingBadge: {
    position: "absolute",
    top: -responsiveScale(10),
    right: responsiveScale(20),
    backgroundColor: Colors.dark.warmGreen,
    borderRadius: responsiveBorderRadius(10),
    paddingHorizontal: responsivePadding(8),
    paddingVertical: responsivePadding(4),
    zIndex: 1,
  },
  badgeText: { 
    color: "white",
  },
  trialChip: { 
    marginTop: responsiveMargin(2), 
    opacity: 0.9,
  },
  btn: {
    marginTop: responsiveMargin(60),
    width: "100%",
    height: responsiveScale(50),
    justifyContent: "center",
  },
  restoreButton: {
    marginTop: responsiveMargin(16),
  },
  restoreText: {
    textDecorationLine: "underline",
  },
  button: {
    width: scalePercent(40),
    height: responsiveScale(50),
    backgroundColor: "transparent",
    borderColor: Colors.dark.warmGreen,
    borderWidth: responsiveScale(1),
    marginTop: responsiveMargin(35),
  },
});