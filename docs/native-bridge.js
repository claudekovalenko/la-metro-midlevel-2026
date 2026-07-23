// Loaded on every page. No-ops on plain web; adds native behavior when running
// inside the Capacitor iOS shell, so the App Store build offers real
// functionality beyond "a website in a webview" (App Store Guideline 4.2).
(function () {
  const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  if (!isNative) return;

  const Plugins = window.Capacitor.Plugins || {};

  document.addEventListener('DOMContentLoaded', () => {
    // Native share: any element with [data-native-share] gets a working share sheet.
    document.querySelectorAll('[data-native-share]').forEach((el) => {
      if (!Plugins.Share) return;
      el.style.display = '';
      el.addEventListener('click', async () => {
        try {
          await Plugins.Share.share({
            title: el.dataset.shareTitle || document.title,
            text: el.dataset.shareText || '',
            url: el.dataset.shareUrl || window.location.href,
          });
        } catch (err) {
          console.error('Native share failed', err);
        }
      });
    });
  });

  // Push notifications: ask permission once, register, and log the token so
  // it can be wired to a real notification backend later (e.g. for gathering
  // reminders or new-response alerts).
  (async () => {
    const Push = Plugins.PushNotifications;
    if (!Push) return;
    try {
      const perm = await Push.requestPermissions();
      if (perm.receive !== 'granted') return;
      await Push.register();
      Push.addListener('registration', (token) => {
        console.log('Push registration token:', token.value);
      });
      Push.addListener('registrationError', (err) => {
        console.error('Push registration error:', err);
      });
    } catch (err) {
      console.error('Push notifications unavailable', err);
    }
  })();
})();
