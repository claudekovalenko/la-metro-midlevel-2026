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

    // Add to Calendar: any element with [data-native-add-to-calendar] opens the
    // system "create event" prompt pre-filled from its data-* attributes.
    document.querySelectorAll('[data-native-add-to-calendar]').forEach((el) => {
      const Calendar = Plugins.CapacitorCalendar;
      if (!Calendar) return;
      el.style.display = '';
      el.addEventListener('click', async () => {
        try {
          await Calendar.requestWriteOnlyCalendarAccess();
          await Calendar.createEventWithPrompt({
            title: el.dataset.eventTitle || document.title,
            location: el.dataset.eventLocation || '',
            startDate: Date.parse(el.dataset.eventStart),
            endDate: Date.parse(el.dataset.eventEnd),
          });
        } catch (err) {
          console.error('Add to calendar failed', err);
        }
      });
    });

    // Save Organizer to Contacts: any element with [data-native-save-contact]
    // creates a contact card from its data-* attributes.
    document.querySelectorAll('[data-native-save-contact]').forEach((el) => {
      const Contacts = Plugins.Contacts;
      if (!Contacts) return;
      el.style.display = '';
      el.addEventListener('click', async () => {
        try {
          const perm = await Contacts.requestPermissions();
          if (perm.contacts !== 'granted') return;
          const [given, ...rest] = (el.dataset.contactName || '').split(' ');
          await Contacts.createContact({
            contact: {
              name: { given, family: rest.join(' ') },
              organization: el.dataset.contactOrg ? [{ company: el.dataset.contactOrg }] : undefined,
              emails: el.dataset.contactEmail ? [{ label: 'work', address: el.dataset.contactEmail }] : undefined,
              phones: el.dataset.contactPhone ? [{ label: 'work', number: el.dataset.contactPhone }] : undefined,
            },
          });
          el.textContent = el.dataset.savedLabel || 'Saved ✓';
        } catch (err) {
          console.error('Save contact failed', err);
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
