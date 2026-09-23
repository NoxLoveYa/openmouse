import {
  eggWeMergeLogicalDevices,
} from "@openmouse/protocol/drivers/endgame/egg-we-control";
import { collapseBoltPeers } from "@openmouse/protocol/drivers/logitech/bolt";
import {
  COBRA_PRODUCT_ID,
  RazerCobraHidClient,
} from "@openmouse/protocol/drivers/razer/cobra-hid";
import { RazerHidClient } from "@openmouse/protocol/drivers/razer/hid";
import {
  RazerViperHidClient,
  VIPER_PRODUCT_ID,
} from "@openmouse/protocol/drivers/razer/viper-hid";
import {
  RazerViperMiniHidClient,
  VIPER_MINI_PRODUCT_ID,
} from "@openmouse/protocol/drivers/razer/viper-mini-hid";
import {
  RazerViperV4ProHidClient,
  VIPER_V4_PRO_PRODUCTS,
} from "@openmouse/protocol/drivers/razer/viper-v4-pro-hid";
import {
  clientSupportScore as registryClientSupportScore,
  createSupportedClient as registryCreateSupportedClient,
  deviceBrand,
  type PulsarClient,
  type SupportedClient,
} from "@openmouse/protocol/drivers/registry";
import { RAZER_PRODUCTS } from "@openmouse/protocol/razer-devices";
export { describeHidDevice } from "./hid-diagnostics.ts";
export { deviceBrand, type PulsarClient, type SupportedClient };

type NativeBridgeDevice = HIDDevice & { openMouseTransport?: "bridge" };


function bridgeRazerClient(device: HIDDevice): SupportedClient | null {
  if ((device as NativeBridgeDevice).openMouseTransport !== "bridge"
    || device.vendorId !== 0x1532) return null;
  if (VIPER_V4_PRO_PRODUCTS.has(device.productId)) return new RazerViperV4ProHidClient(device);
  if (device.productId === COBRA_PRODUCT_ID) return new RazerCobraHidClient(device);
  if (device.productId === VIPER_PRODUCT_ID) return new RazerViperHidClient(device);
  if (device.productId === VIPER_MINI_PRODUCT_ID) return new RazerViperMiniHidClient(device);
  if (RAZER_PRODUCTS.has(device.productId)) return new RazerHidClient(device);
  return null;
}


export function createSupportedClient(device: HIDDevice): SupportedClient | null {
  return registryCreateSupportedClient(device) ?? bridgeRazerClient(device);
}

export function clientSupportScore(device: HIDDevice): number {
  return bridgeRazerClient(device) !== null ? 10_000 : registryClientSupportScore(device);
}

/** Supported devices for the sidebar; multi-path drivers collapse via their module. */
export function logicalDeviceGroups(devices: HIDDevice[] = []): HIDDevice[][] {
  const merged = collapseBoltPeers(
    eggWeMergeLogicalDevices(devices, (device) => createSupportedClient(device) !== null),
  );
  const byPhysicalDevice = new Map<string, HIDDevice[]>();
  for (const device of merged) {
    const key = physicalDeviceKey(device);
    const group = byPhysicalDevice.get(key);
    if (group) group.push(device);
    else byPhysicalDevice.set(key, [device]);
  }
  return [...byPhysicalDevice.values()];
}

/**
 * One connect-page/sidebar card per physical mouse. WebHID returns a device
 * object per top-level HID collection, so a single mouse without a multi-path
 * driver would otherwise surface once per interface; the browser exposes no
 * serial number, so vendor/product/name is the most specific identity it
 * offers — the same trade-off Bridge already makes for its serial-less
 * receivers. Bridge devices already group their report paths natively, and
 * the Bridge's own session key keeps physically distinct identical mice
 * apart, so that key is used verbatim.
 */
function physicalDeviceKey(device: HIDDevice): string {
  if ((device as { openMouseTransport?: string }).openMouseTransport === "bridge") {
    return `bridge:${(device as { key?: string }).key ?? ""}`;
  }
  return `${device.vendorId}:${device.productId}:${device.productName ?? ""}`;
}

export function pickLogicalDevice(group: HIDDevice[]): HIDDevice {
  return group.reduce((best, device) => (clientSupportScore(device) > clientSupportScore(best) ? device : best));
}

/** Supported devices for the sidebar; multi-path drivers collapse via their module. */
export function listLogicalDevices(devices: HIDDevice[] = []): HIDDevice[] {
  return logicalDeviceGroups(devices).map(pickLogicalDevice);
}
