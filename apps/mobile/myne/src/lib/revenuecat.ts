import Purchases, {
  CustomerInfo,
  Offerings,
  PurchasesPackage,
} from "react-native-purchases";
import RevenueCatUI, {
  type CustomerCenterCallbacks,
} from "react-native-purchases-ui";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";
import { BYPASS_PRO_PAYWALL_FOR_DEV } from "@/src/lib/subscriptionFlags";

export const ENTITLEMENT_ID = "premium";

export function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

/** Native StoreKit / Play Billing — not Expo Go preview or web. */
export function shouldInitializeRevenueCat(): boolean {
  if (BYPASS_PRO_PAYWALL_FOR_DEV) return false;
  if (Platform.OS === "web") return false;
  if (isExpoGo()) return false;
  return !!getRevenueCatApiKey();
}

export function getRevenueCatApiKey(): string | null {
  const ios = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
  const android = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
  if (Platform.OS === "ios") return ios || null;
  if (Platform.OS === "android") return android || null;
  return ios || android || null;
}

export async function configureRevenueCat(
  apiKey: string,
  appUserID: string
): Promise<void> {
  Purchases.setLogLevel(__DEV__ ? "WARN" : "ERROR");
  await Purchases.configure({ apiKey, appUserID });
}

export async function getCustomerInfoSafe(force = false): Promise<CustomerInfo | null> {
  try {
    if (force) {
      await Purchases.syncPurchases();
    }
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.error("getCustomerInfoSafe error", e);
    return null;
  }
}

export async function getOfferingsSafe(): Promise<Offerings | null> {
  try {
    return await Purchases.getOfferings();
  } catch (e) {
    console.error("getOfferingsSafe error", e);
    return null;
  }
}

export function findPackage(
  offerings: Offerings | null,
  plan: "monthly" | "annual"
): PurchasesPackage | null {
  if (!offerings?.current) return null;

  if (plan === "monthly") return offerings.current.monthly ?? null;
  return offerings.current.annual ?? null;
}

export function hasActiveEntitlement(info: CustomerInfo | null) {
  return !!info?.entitlements?.active?.[ENTITLEMENT_ID];
}

export function entitlementExpiresAtIso(info: CustomerInfo | null): string | null {
  const ent = info?.entitlements?.active?.[ENTITLEMENT_ID];
  if (!ent?.expirationDate) return null;
  return ent.expirationDate;
}

export async function purchasePackageSafe(
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (e: unknown) {
    const userCancelled =
      typeof e === "object" &&
      e !== null &&
      "userCancelled" in e &&
      (e as { userCancelled?: boolean }).userCancelled === true;
    if (userCancelled) return null;
    console.error("purchasePackageSafe error", e);
    throw e;
  }
}

export async function restorePurchasesSafe(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.restorePurchases();
  } catch (e) {
    console.error("restorePurchasesSafe error", e);
    throw e;
  }
}

export async function presentCustomerCenterSafe(
  callbacks?: CustomerCenterCallbacks
): Promise<void> {
  try {
    await RevenueCatUI.presentCustomerCenter({ callbacks });
  } catch (e) {
    console.error("presentCustomerCenterSafe error", e);
    throw e;
  }
}

/** Opens the platform subscription management page (fallback if Customer Center fails). */
export async function openStoreSubscriptionManagement(): Promise<boolean> {
  const url =
    Platform.OS === "android"
      ? "https://play.google.com/store/account/subscriptions"
      : "https://apps.apple.com/account/subscriptions";
  try {
    const ok = await Linking.canOpenURL(url);
    if (!ok) return false;
    await Linking.openURL(url);
    return true;
  } catch (e) {
    console.error("openStoreSubscriptionManagement error", e);
    return false;
  }
}

export function activePremiumProductId(info: CustomerInfo | null): string | null {
  const ent = info?.entitlements?.active?.[ENTITLEMENT_ID];
  if (!ent) return null;
  return ent.productIdentifier ?? null;
}

export function packagePriceLabel(pkg: PurchasesPackage | null): string | null {
  const price = pkg?.product?.priceString?.trim();
  return price || null;
}
