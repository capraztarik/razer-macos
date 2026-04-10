import { globalShortcut } from 'electron';
const storage = require('electron-json-storage');

const STORAGE_KEY = 'macroKeySettings';

// On macOS, Razer M1-M5 keys arrive as F13-F17 without the proprietary driver
export const MACRO_KEYS = {
  M1: 'F13',
  M2: 'F14',
  M3: 'F15',
  M4: 'F16',
  M5: 'F17',
};

export const MACRO_ACTIONS = {
  DISABLED:       { id: 'disabled',       label: 'Disabled' },
  LIGHTING_NONE:  { id: 'lighting_none',  label: 'Lighting: Off' },
  LIGHTING_SPECTRUM: { id: 'lighting_spectrum', label: 'Lighting: Spectrum' },
  LIGHTING_WAVE_RIGHT: { id: 'lighting_wave_right', label: 'Lighting: Wave Right' },
  LIGHTING_WAVE_LEFT:  { id: 'lighting_wave_left',  label: 'Lighting: Wave Left' },
  LIGHTING_STATIC_RED:   { id: 'lighting_static_red',   label: 'Lighting: Static Red' },
  LIGHTING_STATIC_GREEN: { id: 'lighting_static_green', label: 'Lighting: Static Green' },
  LIGHTING_STATIC_BLUE:  { id: 'lighting_static_blue',  label: 'Lighting: Static Blue' },
  LIGHTING_BREATHE_RED:  { id: 'lighting_breathe_red',  label: 'Lighting: Breathe Red' },
};

/**
 * MacroKeyManager
 * Registers global shortcuts for Razer macro keys (M1-M5 = F13-F17 on macOS)
 * and dispatches the configured action to all active Razer devices.
 */
export class MacroKeyManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    // Default: M1 = spectrum, M2 = wave right
    this.keyBindings = {
      M1: MACRO_ACTIONS.LIGHTING_SPECTRUM.id,
      M2: MACRO_ACTIONS.LIGHTING_WAVE_RIGHT.id,
      M3: MACRO_ACTIONS.DISABLED.id,
      M4: MACRO_ACTIONS.DISABLED.id,
      M5: MACRO_ACTIONS.DISABLED.id,
    };
    this.deviceManager = null;
  }

  async init(deviceManager) {
    this.deviceManager = deviceManager;
    await this.loadSettings();
    this.registerShortcuts();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      storage.has(STORAGE_KEY, (err, hasKey) => {
        if (!err && hasKey) {
          storage.get(STORAGE_KEY, (err2, data) => {
            if (!err2 && data) {
              this.keyBindings = Object.assign(this.keyBindings, data);
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }

  saveSettings() {
    storage.set(STORAGE_KEY, this.keyBindings, () => {});
  }

  registerShortcuts() {
    // Unregister any existing ones first
    Object.values(MACRO_KEYS).forEach(key => {
      try { globalShortcut.unregister(key); } catch (_) {}
    });

    Object.entries(MACRO_KEYS).forEach(([macroKey, shortcutKey]) => {
      const actionId = this.keyBindings[macroKey];
      if (!actionId || actionId === MACRO_ACTIONS.DISABLED.id) return;

      try {
        globalShortcut.register(shortcutKey, () => {
          this.executeAction(actionId);
        });
      } catch (e) {
        // Key might not be available on all keyboards
      }
    });
  }

  executeAction(actionId) {
    if (!this.deviceManager || !this.deviceManager.activeRazerDevices) return;
    const devices = this.deviceManager.activeRazerDevices;

    switch (actionId) {
      case MACRO_ACTIONS.LIGHTING_NONE.id:
        devices.forEach(d => d.setModeNone && d.setModeNone());
        break;
      case MACRO_ACTIONS.LIGHTING_SPECTRUM.id:
        devices.forEach(d => d.setSpectrum && d.setSpectrum());
        break;
      case MACRO_ACTIONS.LIGHTING_WAVE_RIGHT.id:
        devices.forEach(d => d.setWaveExtended && d.setWaveExtended('right_default'));
        break;
      case MACRO_ACTIONS.LIGHTING_WAVE_LEFT.id:
        devices.forEach(d => d.setWaveExtended && d.setWaveExtended('left_default'));
        break;
      case MACRO_ACTIONS.LIGHTING_STATIC_RED.id:
        devices.forEach(d => d.setModeStatic && d.setModeStatic([0xff, 0, 0]));
        break;
      case MACRO_ACTIONS.LIGHTING_STATIC_GREEN.id:
        devices.forEach(d => d.setModeStatic && d.setModeStatic([0, 0xff, 0]));
        break;
      case MACRO_ACTIONS.LIGHTING_STATIC_BLUE.id:
        devices.forEach(d => d.setModeStatic && d.setModeStatic([0, 0, 0xff]));
        break;
      case MACRO_ACTIONS.LIGHTING_BREATHE_RED.id:
        devices.forEach(d => d.setBreathe && d.setBreathe([0xff, 0, 0]));
        break;
    }
  }

  setKeyBinding(macroKey, actionId) {
    this.keyBindings[macroKey] = actionId;
    this.saveSettings();
    this.registerShortcuts();
  }

  getKeyBinding(macroKey) {
    return this.keyBindings[macroKey] || MACRO_ACTIONS.DISABLED.id;
  }

  destroy() {
    Object.values(MACRO_KEYS).forEach(key => {
      try { globalShortcut.unregister(key); } catch (_) {}
    });
  }
}
