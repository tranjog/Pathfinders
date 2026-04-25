// macOS CoreLocation wrapper exposed as a Tauri command.
//
// Reason: tauri-plugin-geolocation does not support macOS desktop
// (iOS/Android only). Without a native CoreLocation call the app
// never registers in System Settings -> Privacy & Security ->
// Location Services, and `navigator.geolocation` does not work in
// WKWebView.

use std::sync::Mutex;
use std::time::Duration;

use objc2::rc::Retained;
use objc2::runtime::ProtocolObject;
use objc2::{define_class, msg_send, AllocAnyThread, DefinedClass};
use objc2_core_location::{CLAuthorizationStatus, CLLocation, CLLocationManager, CLLocationManagerDelegate};
use objc2_foundation::{MainThreadMarker, NSArray, NSError, NSObject, NSObjectProtocol};
use serde::Serialize;
use tokio::sync::oneshot;

#[derive(Debug, Serialize)]
pub struct LocationResult {
    pub latitude: f64,
    pub longitude: f64,
}

pub struct DelegateIvars {
    sender: Mutex<Option<oneshot::Sender<Result<LocationResult, String>>>>,
}

define_class!(
    #[unsafe(super(NSObject))]
    #[name = "PathfindersLocationDelegate"]
    #[ivars = DelegateIvars]
    struct Delegate;

    unsafe impl NSObjectProtocol for Delegate {}

    unsafe impl CLLocationManagerDelegate for Delegate {
        #[unsafe(method(locationManager:didUpdateLocations:))]
        fn did_update(&self, _manager: &CLLocationManager, locations: &NSArray<CLLocation>) {
            if locations.len() == 0 { return; }
            let loc = locations.objectAtIndex(locations.len() - 1);
            let coord = unsafe { loc.coordinate() };
            self.send(Ok(LocationResult { latitude: coord.latitude, longitude: coord.longitude }));
        }

        #[unsafe(method(locationManager:didFailWithError:))]
        fn did_fail(&self, _manager: &CLLocationManager, error: &NSError) {
            let msg = error.localizedDescription().to_string();
            self.send(Err(msg));
        }

        #[unsafe(method(locationManagerDidChangeAuthorization:))]
        fn did_change_auth(&self, manager: &CLLocationManager) {
            let status: CLAuthorizationStatus = unsafe { msg_send![manager, authorizationStatus] };
            // 0 notDetermined: keep waiting.
            // 1 restricted, 2 denied: fail.
            // 3 authorized (macOS), 4 authorizedAlways: kick off the one-shot fix.
            match status.0 {
                0 => {}
                1 | 2 => self.send(Err("Location permission denied".to_string())),
                _ => unsafe { manager.requestLocation(); },
            }
        }
    }
);

impl Delegate {
    fn new(_mtm: MainThreadMarker, sender: oneshot::Sender<Result<LocationResult, String>>) -> Retained<Self> {
        let this = Self::alloc().set_ivars(DelegateIvars { sender: Mutex::new(Some(sender)) });
        unsafe { msg_send![super(this), init] }
    }

    fn send(&self, result: Result<LocationResult, String>) {
        if let Some(tx) = self.ivars().sender.lock().unwrap().take() {
            let _: Result<(), _> = tx.send(result);
        }
    }
}

#[tauri::command]
pub async fn get_macos_location(app: tauri::AppHandle) -> Result<LocationResult, String> {
    let (tx, rx) = oneshot::channel::<Result<LocationResult, String>>();

    app.run_on_main_thread(move || {
        let mtm = MainThreadMarker::new()
            .expect("run_on_main_thread closure must execute on the main thread");

        let manager: Retained<CLLocationManager> = unsafe {
            msg_send![CLLocationManager::alloc(), init]
        };
        let delegate = Delegate::new(mtm, tx);
        let proto: &ProtocolObject<dyn CLLocationManagerDelegate> = ProtocolObject::from_ref(&*delegate);
        unsafe {
            manager.setDelegate(Some(proto));
            manager.requestWhenInUseAuthorization();
        }

        // Intentional leak: the delegate callbacks must fire on the run loop
        // after this closure returns. The session is small (few hundred bytes)
        // and only happens per user-initiated location request.
        std::mem::forget(manager);
        std::mem::forget(delegate);
    })
    .map_err(|e| format!("dispatch to main thread failed: {e}"))?;

    match tokio::time::timeout(Duration::from_secs(20), rx).await {
        Ok(Ok(r)) => r,
        Ok(Err(_)) => Err("delegate channel closed without value".to_string()),
        Err(_) => Err("location request timed out".to_string()),
    }
}
