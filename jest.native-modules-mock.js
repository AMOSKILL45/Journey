/**
 * Custom NativeModules mock that includes a `.default` property.
 * jest-expo@54 setup.js expects `.default` on this module, but the standard
 * react-native jest mock doesn't provide it (bug: react-native 0.76 + jest-expo 54).
 */
'use strict';

const modules = {
  AlertManager: { alertWithArgs: jest.fn() },
  AsyncLocalStorage: {
    multiGet: jest.fn((keys, cb) => process.nextTick(() => cb(null, []))),
    multiSet: jest.fn((entries, cb) => process.nextTick(() => cb(null))),
    multiRemove: jest.fn((keys, cb) => process.nextTick(() => cb(null))),
    multiMerge: jest.fn((entries, cb) => process.nextTick(() => cb(null))),
    clear: jest.fn((cb) => process.nextTick(() => cb(null))),
    getAllKeys: jest.fn((cb) => process.nextTick(() => cb(null, []))),
  },
  ImageLoader: {
    prefetchImage: jest.fn(),
    getSize: jest.fn((uri, success) => process.nextTick(() => success(320, 240))),
  },
  ImageViewManager: {
    prefetchImage: jest.fn(),
    getSize: jest.fn((uri, success) => process.nextTick(() => success(320, 240))),
  },
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn(),
    getInitialURL: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  LinkingManager: {
    openURL: jest.fn(),
    canOpenURL: jest.fn(),
    getInitialURL: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
  UIManager: {
    customBubblingEventTypes: {},
    customDirectEventTypes: {},
    Dimensions: { window: { width: 375, height: 667, scale: 2, fontScale: 1 } },
    setJSResponder: jest.fn(),
    clearJSResponder: jest.fn(),
    configureNextLayoutAnimation: jest.fn(),
    createView: jest.fn(),
    updateView: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    manageChildren: jest.fn(),
    measure: jest.fn(),
    measureInWindow: jest.fn(),
    measureLayout: jest.fn(),
    findSubviewIn: jest.fn(),
    setChildren: jest.fn(),
    replaceExistingNonRootView: jest.fn(),
    dispatchViewManagerCommand: jest.fn(),
    sendAccessibilityEvent: jest.fn(),
    getConstantsForViewManager: jest.fn(() => ({})),
  },
  NativeUnimoduleProxy: {
    modulesConstants: {
      mockDefinition: {
        ExponentConstants: {
          experienceUrl: { mock: 'exp://192.168.1.200:8081' },
          nativeAppVersion: { mock: null },
          nativeBuildVersion: { mock: null },
          platform: { mock: {} },
          statusBarHeight: { mock: 20 },
        },
      },
    },
    viewManagersMetadata: {},
    callMethod: jest.fn(),
  },
  DeviceInfo: {
    getConstants() {
      return {
        Dimensions: {
          window: { width: 375, height: 667, scale: 2, fontScale: 1 },
          screen: { width: 375, height: 667, scale: 2, fontScale: 1 },
        },
      };
    },
  },
  PlatformConstants: {
    getConstants() {
      return {
        forceTouchAvailable: false,
        interfaceIdiom: 'phone',
        isTesting: true,
        osVersion: '18.0',
        systemName: 'iOS',
      };
    },
  },
  Vibration: { vibrate: jest.fn(), cancel: jest.fn() },
  SourceCode: {
    getConstants() {
      return { scriptURL: null };
    },
  },
  RedBox: null,
  Timing: { createTimer: jest.fn(), deleteTimer: jest.fn() },
  BlobModule: {
    getConstants: jest.fn(() => ({ BLOB_URI_SCHEME: 'content', BLOB_URI_HOST: null })),
    createFromParts: jest.fn(),
    release: jest.fn(),
  },
  NetworkingModule: { sendRequest: jest.fn(), abortRequest: jest.fn(), clearCookies: jest.fn() },
  WebSocketModule: {
    connect: jest.fn(),
    close: jest.fn(),
    send: jest.fn(),
    sendBinary: jest.fn(),
    ping: jest.fn(),
  },
  SettingsManager: { settings: {}, getConstants: jest.fn(() => ({ settings: {} })) },
  StatusBarManager: {
    getHeight: jest.fn(),
    setColor: jest.fn(),
    setHidden: jest.fn(),
    setStyle: jest.fn(),
    setNetworkActivityIndicatorVisible: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    HEIGHT: 20,
  },
  KeyboardObserver: { addListener: jest.fn(), removeListeners: jest.fn() },
  AppState: {
    getConstants: jest.fn(() => ({ initialAppState: 'active' })),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
};

module.exports = { ...modules, default: modules };
