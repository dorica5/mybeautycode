import Purchases, { CustomerInfo, Offerings, PACKAGE_TYPE, PurchasesPackage } from "react-native-purchases";

export const ENTITLEMENT_ID = "premium"; 

export function configureRevenueCat(apiKey: string, appUserID: string) {
  Purchases.setLogLevel("WARN");
  Purchases.configure({ apiKey, appUserID });
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
  plan: "monthly" | "annual" | "lifetime"
): PurchasesPackage | null {
  if (!offerings?.current) return null;

  if (plan === "monthly") return offerings.current.monthly ?? null;
  if (plan === "annual") return offerings.current.annual ?? null;

  const lifetime =
    offerings.current.availablePackages?.find(
      (p) => p.packageType === PACKAGE_TYPE.LIFETIME
    ) ?? null;

  return lifetime;
}



export function hasActiveEntitlement(info: CustomerInfo | null) {
  return !!info?.entitlements?.active?.[ENTITLEMENT_ID];
}
